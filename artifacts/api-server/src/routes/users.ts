import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq, sql, and, ilike, or } from "drizzle-orm";
import { authenticate, requireRole } from "../lib/auth.js";
import { UpdateUserBody } from "@workspace/api-zod";

const router = Router();

// ── Admin: barcha foydalanuvchilar ro'yxati ──────────────────────────────────
router.get("/", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const role = req.query.role as string | undefined;
    const search = (req.query.search as string || "").trim();
    const offset = (page - 1) * limit;

    let whereClause: any = undefined;
    const roleFilter = role ? eq(usersTable.role, role as any) : undefined;
    const searchFilter = search
      ? or(ilike(usersTable.name, `%${search}%`), ilike(usersTable.phone, `%${search}%`))
      : undefined;

    if (roleFilter && searchFilter) whereClause = and(roleFilter, searchFilter);
    else if (roleFilter) whereClause = roleFilter;
    else if (searchFilter) whereClause = searchFilter;

    let usersQuery = db.select().from(usersTable) as any;
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(usersTable) as any;
    if (whereClause) {
      usersQuery = usersQuery.where(whereClause);
      countQuery = countQuery.where(whereClause);
    }

    const [users, countResult] = await Promise.all([
      usersQuery.limit(limit).offset(offset).orderBy(sql`created_at DESC`),
      countQuery,
    ]);
    const total = Number(countResult[0].count);

    res.json({
      users: users.map((u: any) => ({
        id: u.id,
        name: u.name,
        phone: u.phone,
        username: u.username ?? null,
        email: u.email ?? null,
        role: u.role,
        shopId: u.shopId ?? null,
        isActive: u.isActive,
        createdAt: u.createdAt,
        passportId: u.passport_id ?? null,
        region: u.region ?? null,
        district: u.district ?? null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    console.error("[Users GET]", err.message);
    res.status(500).json({ error: "Server xatosi yuz berdi. Qayta urining." });
  }
});

// ── Admin: foydalanuvchi parolini tiklash ────────────────────────────────────
router.patch("/:id/reset-password", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || String(newPassword).length < 6) {
      res.status(400).json({ error: "Yangi parol kamida 6 ta belgi bo'lishi kerak" });
      return;
    }
    const userId = Number(req.params.id);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) { res.status(404).json({ error: "Foydalanuvchi topilmadi" }); return; }
    const hashed = await bcrypt.hash(String(newPassword), 10);
    await db.execute(sql`UPDATE users SET password = ${hashed} WHERE id = ${userId}`);
    res.json({ ok: true, message: "Parol muvaffaqiyatli yangilandi" });
  } catch (err: any) {
    console.error("[ResetPassword Admin]", err.message);
    res.status(500).json({ error: "Parol yangilashda xatolik. Qayta urining." });
  }
});

// ── Admin: faol/nofaol almashtirish ──────────────────────────────────────────
router.patch("/:id/toggle-active", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) { res.status(404).json({ error: "Foydalanuvchi topilmadi" }); return; }
    const [updated] = await db.update(usersTable)
      .set({ isActive: !user.isActive } as any)
      .where(eq(usersTable.id, userId))
      .returning();
    res.json({ ok: true, isActive: updated.isActive });
  } catch (err: any) {
    console.error("[ToggleActive]", err.message);
    res.status(500).json({ error: "Server xatosi. Qayta urining." });
  }
});

// ── Admin: yangi foydalanuvchi yaratish ─────────────────────────────────────
router.post("/admin-create", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const { name, phone: rawPhone, password, role, username, email } = req.body;
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      res.status(400).json({ error: "Ism kamida 2 ta harf bo'lishi kerak" }); return;
    }
    if (!rawPhone) { res.status(400).json({ error: "Telefon raqam kerak" }); return; }
    const phoneDigits = String(rawPhone).replace(/\D/g, "");
    const phone = phoneDigits.startsWith("998") && phoneDigits.length === 12
      ? phoneDigits : phoneDigits.length === 9 ? `998${phoneDigits}` : phoneDigits;
    if (phone.length !== 12) { res.status(400).json({ error: "Telefon raqamni to'g'ri kiriting (9 yoki 12 raqam)" }); return; }
    const pass = password && String(password).length >= 6 ? String(password) : "gethelp123";
    const allowedRoles = ["super_admin", "shop_owner", "worker", "customer"];
    const userRole = allowedRoles.includes(role) ? role : "customer";
    const existing = await db.select().from(usersTable).where(eq(usersTable.phone, phone));
    if (existing.length > 0) { res.status(400).json({ error: "Bu telefon raqam allaqachon ro'yhatdan o'tgan" }); return; }
    if (username) {
      const byUsername = await db.select().from(usersTable).where(eq(usersTable.username, String(username)));
      if (byUsername.length > 0) { res.status(400).json({ error: "Bu username allaqachon band" }); return; }
    }
    const hashed = await bcrypt.hash(pass, 10);
    const [user] = await db.insert(usersTable).values({
      name: name.trim(), phone, password: hashed, role: userRole as any,
      username: username ? String(username).trim() : undefined,
      email: email ? String(email).trim() : undefined,
    }).returning();
    res.status(201).json({
      id: user.id, name: user.name, phone: user.phone, username: (user as any).username ?? null,
      email: user.email, role: user.role, isActive: user.isActive, createdAt: user.createdAt,
      generatedPassword: !password ? pass : undefined,
    });
  } catch (err: any) {
    console.error("[AdminCreate]", err.message);
    if (err.message?.includes("duplicate") || err.message?.includes("unique")) {
      res.status(400).json({ error: "Bu telefon yoki username allaqachon ro'yhatdan o'tgan" });
    } else {
      res.status(500).json({ error: "Server xatosi. Qayta urining." });
    }
  }
});

// ── Admin: foydalanuvchi rolini o'zgartirish ─────────────────────────────────
router.patch("/:id/role", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { role } = req.body;
    const allowedRoles = ["super_admin", "shop_owner", "worker", "customer"];
    if (!allowedRoles.includes(role)) { res.status(400).json({ error: "Noto'g'ri rol" }); return; }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) { res.status(404).json({ error: "Foydalanuvchi topilmadi" }); return; }
    const [updated] = await db.update(usersTable).set({ role: role as any }).where(eq(usersTable.id, userId)).returning();
    res.json({ ok: true, id: updated.id, role: updated.role });
  } catch (err: any) {
    console.error("[RoleChange]", err.message);
    res.status(500).json({ error: "Server xatosi. Qayta urining." });
  }
});

// ── Do'kon telefon orqali qidirish ───────────────────────────────────────────
router.get("/lookup", authenticate, async (req, res) => {
  try {
    const phone = req.query.phone as string;
    if (!phone) { res.status(400).json({ error: "phone query param required" }); return; }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.phone, phone));
    if (!user) { res.status(404).json({ error: "Mijoz topilmadi" }); return; }
    res.json({ id: user.id, name: user.name, phone: user.phone, role: user.role });
  } catch (err: any) {
    console.error("[Lookup]", err.message);
    res.status(500).json({ error: "Server xatosi yuz berdi. Qayta urining." });
  }
});

// ── Do'kon xodimlarini ko'rish ───────────────────────────────────────────────
router.get("/workers", authenticate, requireRole("shop_owner"), async (req, res) => {
  try {
    const shopOwner = (req as any).user;
    const [owner] = await db.select().from(usersTable).where(eq(usersTable.id, shopOwner.userId));
    if (!owner || !owner.shopId) { res.status(400).json({ error: "Do'kon topilmadi" }); return; }
    const workers = await db.select().from(usersTable)
      .where(and(eq(usersTable.role, "worker" as any), eq(usersTable.shopId, owner.shopId)));
    res.json({
      workers: workers.map((w: any) => ({
        id: w.id, name: w.name, phone: w.phone, role: w.role,
        shopId: w.shopId, isActive: w.isActive, createdAt: w.createdAt,
      })),
      total: workers.length,
    });
  } catch (err: any) {
    console.error("[Workers GET]", err.message);
    res.status(500).json({ error: "Server xatosi yuz berdi. Qayta urining." });
  }
});

// ── Do'kon xodim qo'shish ────────────────────────────────────────────────────
router.post("/workers", authenticate, requireRole("shop_owner"), async (req, res) => {
  try {
    const shopOwner = (req as any).user;
    const [owner] = await db.select().from(usersTable).where(eq(usersTable.id, shopOwner.userId));
    if (!owner || !owner.shopId) { res.status(400).json({ error: "Do'kon topilmadi" }); return; }
    const { name, phone: phoneRaw, password } = req.body;
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      res.status(400).json({ error: "Ism kamida 2 ta harf bo'lishi kerak" }); return;
    }
    const phoneDigits = String(phoneRaw || "").replace(/\D/g, "");
    const is9 = phoneDigits.length === 9;
    const is12 = phoneDigits.length === 12 && phoneDigits.startsWith("998");
    if (!is9 && !is12) { res.status(400).json({ error: "Telefon raqamni to'g'ri kiriting" }); return; }
    const phone = phoneDigits.startsWith("998") ? phoneDigits : `998${phoneDigits}`;
    const existing = await db.select().from(usersTable).where(eq(usersTable.phone, phone));
    if (existing.length > 0) { res.status(400).json({ error: "Bu telefon raqam allaqachon ro'yhatdan o'tgan" }); return; }
    const pass = password || "password123";
    const hashed = await bcrypt.hash(String(pass), 10);
    const [newWorker] = await db.insert(usersTable).values({
      name: name.trim(), phone, password: hashed, role: "worker" as any, shopId: owner.shopId,
    }).returning();
    res.status(201).json({
      id: newWorker.id, name: newWorker.name, phone: newWorker.phone,
      role: newWorker.role, shopId: newWorker.shopId,
      isActive: newWorker.isActive, createdAt: newWorker.createdAt,
    });
  } catch (err: any) {
    console.error("[Worker POST]", err.message);
    if (err.message?.includes("duplicate") || err.message?.includes("unique")) {
      res.status(400).json({ error: "Bu telefon raqam allaqachon ro'yhatdan o'tgan" });
    } else {
      res.status(500).json({ error: "Server xatosi. Qayta urining." });
    }
  }
});

// ── Foydalanuvchi ma'lumotini yangilash ──────────────────────────────────────
router.patch("/:id", authenticate, async (req, res) => {
  try {
    const caller = (req as any).user;
    const targetId = Number(req.params.id);
    if (caller.role !== "super_admin" && caller.userId !== targetId) {
      res.status(403).json({ error: "Ruxsat yo'q" }); return;
    }
    const body = UpdateUserBody.parse(req.body);
    const [user] = await db.update(usersTable).set(body as any).where(eq(usersTable.id, targetId)).returning();
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json({
      id: user.id, name: user.name, phone: user.phone,
      username: (user as any).username ?? null, email: user.email,
      role: user.role, shopId: user.shopId, isActive: user.isActive, createdAt: user.createdAt,
    });
  } catch (err: any) {
    console.error("[User PATCH]", err.message);
    res.status(400).json({ error: "Noto'g'ri so'rov. Qayta urining." });
  }
});

// ── Push token saqlash ────────────────────────────────────────────────────────
router.post("/push-token", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { token, platform } = req.body;
    if (!token) { res.status(400).json({ error: "token kerak" }); return; }
    await db.execute(sql`
      INSERT INTO push_tokens (user_id, token, platform, is_active)
      VALUES (${userId}, ${token}, ${platform || "unknown"}, TRUE)
      ON CONFLICT (token) DO UPDATE SET user_id = ${userId}, is_active = TRUE, platform = EXCLUDED.platform
    `);
    res.json({ success: true });
  } catch (err: any) {
    console.error("[PushToken]", err.message);
    res.status(500).json({ error: "Server xatosi yuz berdi. Qayta urining." });
  }
});

export default router;
