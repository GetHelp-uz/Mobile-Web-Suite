import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { generateToken, authenticate } from "../lib/auth.js";
import { sendTemplateSms, sendSms } from "../lib/sms.js";

const router = Router();

function userResponse(user: any) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    username: user.username ?? null,
    email: user.email ?? null,
    role: user.role,
    shopId: user.shopId ?? null,
    region: user.region ?? null,
    district: user.district ?? null,
    isActive: user.isActive,
    createdAt: user.createdAt,
    passportId: user.passport_id ?? user.passportId ?? null,
  };
}

function validateRegisterBody(body: any): { valid: boolean; error?: string } {
  if (!body.name || typeof body.name !== "string" || body.name.trim().length < 2) {
    return { valid: false, error: "Ism familya kamida 2 ta harf bo'lishi kerak" };
  }
  if (!body.phone || typeof body.phone !== "string") {
    return { valid: false, error: "Telefon raqam noto'g'ri" };
  }
  const phoneDigits = body.phone.replace(/\D/g, "");
  const is9 = phoneDigits.length === 9;
  const is12 = phoneDigits.length === 12 && phoneDigits.startsWith("998");
  if (!is9 && !is12) {
    return { valid: false, error: "Telefon raqamni to'g'ri kiriting. Masalan: 901234567 yoki 998901234567" };
  }
  if (!body.password || typeof body.password !== "string" || body.password.length < 6) {
    return { valid: false, error: "Parol kamida 6 ta belgi bo'lishi kerak" };
  }
  return { valid: true };
}

function normalizePhone(raw: string): string {
  const digits = String(raw).replace(/\D/g, "");
  if (digits.startsWith("998") && digits.length === 12) return digits;
  if (digits.length === 9) return `998${digits}`;
  return digits;
}

// ─── Ro'yxatdan o'tish ────────────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const body = req.body;
    const validation = validateRegisterBody(body);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const phone = normalizePhone(body.phone);
    const existing = await db.select().from(usersTable).where(eq(usersTable.phone, phone));
    if (existing.length > 0) {
      res.status(400).json({ error: "Bu telefon raqam allaqachon ro'yhatdan o'tgan" });
      return;
    }

    const allowedRoles = ["customer", "shop_owner", "worker"];
    const role = allowedRoles.includes(body.role) ? body.role : "customer";
    const hashed = await bcrypt.hash(body.password, 10);

    const [user] = await db.insert(usersTable).values({
      name: String(body.name).trim(),
      phone,
      email: body.email ? String(body.email) : undefined,
      password: hashed,
      role: role as any,
      region: body.region ? String(body.region) : undefined,
      district: body.district ? String(body.district) : undefined,
      address: body.address ? String(body.address) : undefined,
      homeLat: body.homeLat ? String(body.homeLat) : undefined,
      homeLng: body.homeLng ? String(body.homeLng) : undefined,
    }).returning();

    const token = generateToken(user.id, user.role);
    res.status(201).json({ token, user: userResponse(user) });

    // Welcome SMS (fire and forget)
    const templateType = user.role === "shop_owner" ? "welcome_shop" : "welcome_customer";
    const smsVars: Record<string, string> = { ism: user.name };
    if (user.role === "shop_owner") smsVars.dokon = body.shopName || user.name;
    sendTemplateSms(user.phone, templateType, smsVars, { lang: body.lang || "uz" }).catch(() => {});
  } catch (err: any) {
    console.error("[Register Error]", err.message);
    if (err.message?.includes("duplicate") || err.message?.includes("unique")) {
      res.status(400).json({ error: "Bu telefon raqam allaqachon ro'yhatdan o'tgan" });
    } else {
      res.status(400).json({ error: "Ro'yhatdan o'tishda xatolik yuz berdi. Qayta urining." });
    }
  }
});

// ─── Kirish (login) — telefon raqam YOKI username/login ──────────────────────
router.post("/login", async (req, res) => {
  try {
    const { phone: loginId, password } = req.body;
    if (!loginId || !password) {
      res.status(400).json({ error: "Login va parol kiritilishi shart" });
      return;
    }

    let user: any = null;

    // 1. Username orqali (admin, maxsus foydalanuvchilar)
    const byUsername = await db.select().from(usersTable).where(eq(usersTable.username, String(loginId)));
    if (byUsername.length > 0) {
      user = byUsername[0];
    } else {
      // 2. Telefon raqam orqali
      const phone = normalizePhone(String(loginId));
      const byPhone = await db.select().from(usersTable).where(eq(usersTable.phone, phone));
      if (byPhone.length > 0) user = byPhone[0];
    }

    if (!user) {
      res.status(401).json({ error: "Login yoki parol noto'g'ri" });
      return;
    }
    const valid = await bcrypt.compare(String(password), user.password);
    if (!valid) {
      res.status(401).json({ error: "Login yoki parol noto'g'ri" });
      return;
    }
    if (!user.isActive) {
      res.status(403).json({ error: "Hisob faol emas. Administratorga murojaat qiling." });
      return;
    }
    const token = generateToken(user.id, user.role);
    res.json({ token, user: userResponse(user) });
  } catch (err: any) {
    console.error("[Login Error]", err.message);
    res.status(400).json({ error: "Kirish jarayonida xatolik yuz berdi." });
  }
});

// ─── Parolni tiklash — 1-qadam: telefon raqam yuborish ──────────────────────
router.post("/forgot-password", async (req, res) => {
  try {
    const { phone: rawPhone, lang = "uz" } = req.body;
    if (!rawPhone) {
      res.status(400).json({ error: "Telefon raqamni kiriting" });
      return;
    }

    const phone = normalizePhone(String(rawPhone));
    const [user] = await db.select().from(usersTable).where(eq(usersTable.phone, phone));

    // Xavfsizlik: hatto topilmasa ham xuddi shunday javob qaytaramiz
    if (!user) {
      res.json({ ok: true, message: "Agar bu raqam ro'yxatda bo'lsa, SMS yuboriladi" });
      return;
    }

    // Avvalgi kodlarni o'chirish (bir telefonga bir vaqtda faqat bitta aktiv kod)
    await db.execute(sql`DELETE FROM password_reset_codes WHERE phone = ${phone}`);

    // 6 xonali tasodifiy kod
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 daqiqa

    await db.execute(sql`
      INSERT INTO password_reset_codes (phone, code, expires_at, used)
      VALUES (${phone}, ${code}, ${expiresAt.toISOString()}, false)
    `);

    // SMS yuborish
    const smsResult = await sendTemplateSms(phone, "password_reset", { kod: code }, { lang });
    if (!smsResult.success) {
      // SMS sozlanmagan bo'lsa — development uchun console ga chiqaramiz
      console.log(`[Reset Code] ${phone}: ${code}`);
    }

    res.json({ ok: true, message: "SMS yuborildi. Kodning amal qilish muddati 10 daqiqa." });
  } catch (err: any) {
    console.error("[ForgotPassword Error]", err.message);
    res.status(500).json({ error: "Kod yuborishda xatolik yuz berdi. Qayta urining." });
  }
});

// ─── Parolni tiklash — 2-qadam: kodni tekshirish ─────────────────────────────
router.post("/verify-reset-code", async (req, res) => {
  try {
    const { phone: rawPhone, code } = req.body;
    if (!rawPhone || !code) {
      res.status(400).json({ error: "Telefon va kod kiritilishi shart" });
      return;
    }

    const phone = normalizePhone(String(rawPhone));
    const result = await db.execute(sql`
      SELECT * FROM password_reset_codes
      WHERE phone = ${phone} AND code = ${String(code)} AND used = false
        AND expires_at > NOW()
      ORDER BY created_at DESC LIMIT 1
    `);

    if (!result.rows.length) {
      res.status(400).json({ error: "Kod noto'g'ri yoki muddati o'tgan" });
      return;
    }

    // Bir martalik token (sessiya uchun)
    const resetToken = `rst_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    await db.execute(sql`
      UPDATE password_reset_codes SET code = ${resetToken}
      WHERE phone = ${phone} AND code = ${String(code)} AND used = false
    `);

    res.json({ ok: true, resetToken });
  } catch (err: any) {
    console.error("[VerifyCode Error]", err.message);
    res.status(500).json({ error: "Server xatosi. Qayta urining." });
  }
});

// ─── Parolni tiklash — 3-qadam: yangi parol o'rnatish ───────────────────────
router.post("/reset-password", async (req, res) => {
  try {
    const { phone: rawPhone, resetToken, newPassword } = req.body;
    if (!rawPhone || !resetToken || !newPassword) {
      res.status(400).json({ error: "Barcha maydonlar to'ldirilishi shart" });
      return;
    }
    if (String(newPassword).length < 6) {
      res.status(400).json({ error: "Yangi parol kamida 6 ta belgi bo'lishi kerak" });
      return;
    }

    const phone = normalizePhone(String(rawPhone));
    const result = await db.execute(sql`
      SELECT * FROM password_reset_codes
      WHERE phone = ${phone} AND code = ${String(resetToken)} AND used = false
        AND expires_at > NOW()
      LIMIT 1
    `);

    if (!result.rows.length) {
      res.status(400).json({ error: "Noto'g'ri yoki muddati o'tgan so'rov" });
      return;
    }

    const hashed = await bcrypt.hash(String(newPassword), 10);
    await db.execute(sql`UPDATE users SET password = ${hashed} WHERE phone = ${phone}`);
    await db.execute(sql`
      UPDATE password_reset_codes SET used = true
      WHERE phone = ${phone} AND code = ${String(resetToken)}
    `);

    res.json({ ok: true, message: "Parol muvaffaqiyatli yangilandi" });
  } catch (err: any) {
    console.error("[ResetPassword Error]", err.message);
    res.status(500).json({ error: "Parol yangilashda xatolik. Qayta urining." });
  }
});

// ─── Joriy foydalanuvchi ma'lumotlari ────────────────────────────────────────
router.get("/me", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json(userResponse(user));
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

// ─── Profil tahrirlash ────────────────────────────────────────────────────────
router.patch("/profile", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { passportId, name } = req.body;
    if (passportId !== undefined) {
      await db.execute(sql`UPDATE users SET passport_id = ${String(passportId).trim()} WHERE id = ${userId}`);
    }
    if (name !== undefined && String(name).trim().length >= 2) {
      await db.execute(sql`UPDATE users SET name = ${String(name).trim()} WHERE id = ${userId}`);
    }
    const [updated] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    res.json(userResponse(updated));
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

export default router;
