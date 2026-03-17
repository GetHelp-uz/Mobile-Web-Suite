import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { authenticate, requireRole } from "../lib/auth.js";
import { UpdateUserBody } from "@workspace/api-zod";

const router = Router();

router.get("/", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const role = req.query.role as string | undefined;
    const offset = (page - 1) * limit;

    let query = db.select().from(usersTable);
    if (role) {
      query = query.where(eq(usersTable.role, role as any)) as any;
    }
    const users = await (query as any).limit(limit).offset(offset);
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(usersTable);
    const total = Number(countResult[0].count);

    res.json({
      users: users.map((u: any) => ({
        id: u.id,
        name: u.name,
        phone: u.phone,
        email: u.email,
        role: u.role,
        shopId: u.shopId,
        isActive: u.isActive,
        createdAt: u.createdAt,
      })),
      total,
      page,
      limit,
    });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

router.get("/lookup", authenticate, async (req, res) => {
  try {
    const phone = req.query.phone as string;
    if (!phone) {
      res.status(400).json({ error: "phone query param required" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.phone, phone));
    if (!user) {
      res.status(404).json({ error: "Mijoz topilmadi" });
      return;
    }
    res.json({ id: user.id, name: user.name, phone: user.phone, role: user.role });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

router.get("/workers", authenticate, requireRole("shop_owner"), async (req, res) => {
  try {
    const shopOwner = (req as any).user;
    const [owner] = await db.select().from(usersTable).where(eq(usersTable.id, shopOwner.userId));
    if (!owner || !owner.shopId) {
      res.status(400).json({ error: "Do'kon topilmadi" });
      return;
    }
    const workers = await db.select().from(usersTable)
      .where(and(eq(usersTable.role, "worker" as any), eq(usersTable.shopId, owner.shopId)));
    res.json({
      workers: workers.map((w: any) => ({
        id: w.id,
        name: w.name,
        phone: w.phone,
        role: w.role,
        shopId: w.shopId,
        isActive: w.isActive,
        createdAt: w.createdAt,
      })),
      total: workers.length,
    });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

router.post("/workers", authenticate, requireRole("shop_owner"), async (req, res) => {
  try {
    const shopOwner = (req as any).user;
    const [owner] = await db.select().from(usersTable).where(eq(usersTable.id, shopOwner.userId));
    if (!owner || !owner.shopId) {
      res.status(400).json({ error: "Do'kon topilmadi" });
      return;
    }

    const { name, phone: phoneRaw, password } = req.body;
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      res.status(400).json({ error: "Ism kamida 2 ta harf bo'lishi kerak" });
      return;
    }
    const phoneDigits = String(phoneRaw || "").replace(/\D/g, "");
    const is9 = phoneDigits.length === 9;
    const is12 = phoneDigits.length === 12 && phoneDigits.startsWith("998");
    if (!is9 && !is12) {
      res.status(400).json({ error: "Telefon raqamni to'g'ri kiriting" });
      return;
    }
    const phone = phoneDigits.startsWith("998") ? phoneDigits : `998${phoneDigits}`;

    if (!password || typeof password !== "string" || password.length < 6) {
      res.status(400).json({ error: "Parol kamida 6 ta belgi bo'lishi kerak" });
      return;
    }

    const existing = await db.select().from(usersTable).where(eq(usersTable.phone, phone));
    if (existing.length > 0) {
      res.status(400).json({ error: "Bu telefon raqam allaqachon ro'yhatdan o'tgan" });
      return;
    }

    const hashed = await bcrypt.hash(password, 10);
    const [worker] = await db.insert(usersTable).values({
      name: name.trim(),
      phone,
      password: hashed,
      role: "worker" as any,
      shopId: owner.shopId,
    }).returning();

    res.status(201).json({
      worker: {
        id: worker.id,
        name: worker.name,
        phone: worker.phone,
        role: worker.role,
        shopId: worker.shopId,
        isActive: worker.isActive,
        createdAt: worker.createdAt,
      },
    });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(400).json({ error: "Noto'g'ri so'rov. Qayta urining." });
  }
});

router.delete("/workers/:id", authenticate, requireRole("shop_owner"), async (req, res) => {
  try {
    const shopOwner = (req as any).user;
    const [owner] = await db.select().from(usersTable).where(eq(usersTable.id, shopOwner.userId));
    if (!owner || !owner.shopId) {
      res.status(400).json({ error: "Do'kon topilmadi" });
      return;
    }
    const workerId = Number(req.params.id);
    const [worker] = await db.select().from(usersTable).where(
      and(eq(usersTable.id, workerId), eq(usersTable.shopId, owner.shopId), eq(usersTable.role, "worker" as any))
    );
    if (!worker) {
      res.status(404).json({ error: "Hodim topilmadi" });
      return;
    }
    await db.update(usersTable).set({ isActive: false } as any).where(eq(usersTable.id, workerId));
    res.json({ success: true });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

router.get("/:id", authenticate, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, Number(req.params.id)));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      shopId: user.shopId,
      isActive: user.isActive,
      createdAt: user.createdAt,
    });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

router.patch("/:id", authenticate, async (req, res) => {
  try {
    const body = UpdateUserBody.parse(req.body);
    const [user] = await db.update(usersTable).set(body as any).where(eq(usersTable.id, Number(req.params.id))).returning();
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      shopId: user.shopId,
      isActive: user.isActive,
      createdAt: user.createdAt,
    });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(400).json({ error: "Noto'g'ri so'rov. Qayta urining." });
  }
});

// POST /api/users/push-token — push notification tokenini saqlash
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
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

export default router;
