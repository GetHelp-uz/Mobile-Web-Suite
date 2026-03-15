import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { generateToken, authenticate } from "../lib/auth.js";

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

router.post("/register", async (req, res) => {
  try {
    const body = req.body;
    const validation = validateRegisterBody(body);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const phoneRaw = String(body.phone).replace(/\D/g, "");
    const phone = phoneRaw.startsWith("998") ? phoneRaw : `998${phoneRaw}`;
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
    }).returning();

    const token = generateToken(user.id, user.role);
    res.status(201).json({ token, user: userResponse(user) });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { phone: loginId, password } = req.body;
    if (!loginId || !password) {
      res.status(400).json({ error: "Login va parol kiritilishi shart" });
      return;
    }

    let user: any = null;

    // Try username login first (for admins with special usernames)
    const byUsername = await db.select().from(usersTable).where(eq(usersTable.username, String(loginId)));
    if (byUsername.length > 0) {
      user = byUsername[0];
    } else {
      // Try phone login
      const phoneRaw = String(loginId).replace(/\D/g, "");
      const phone = phoneRaw.startsWith("998") ? phoneRaw : phoneRaw.length === 9 ? `998${phoneRaw}` : phoneRaw;
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
      res.status(403).json({ error: "Hisob faol emas" });
      return;
    }
    const token = generateToken(user.id, user.role);
    res.json({ token, user: userResponse(user) });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/me", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(userResponse(user));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
