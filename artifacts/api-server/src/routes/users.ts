import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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
    res.status(400).json({ error: err.message });
  }
});

export default router;
