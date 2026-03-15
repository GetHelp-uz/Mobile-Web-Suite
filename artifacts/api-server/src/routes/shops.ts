import { Router } from "express";
import { db, shopsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { authenticate, requireRole } from "../lib/auth.js";
import { CreateShopBody, UpdateShopBody } from "@workspace/api-zod";

const router = Router();

router.get("/", authenticate, async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const shops = await db.select().from(shopsTable).limit(limit).offset(offset);
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(shopsTable);
    const total = Number(countResult[0].count);

    res.json({ shops, total, page, limit });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", authenticate, requireRole("super_admin", "shop_owner"), async (req, res) => {
  try {
    const body = CreateShopBody.parse(req.body);
    // Do'kon egasi faqat o'zi uchun do'kon yarata oladi
    const user = (req as any).user;
    if (user.role === "shop_owner" && body.ownerId !== user.userId) {
      res.status(403).json({ error: "Faqat o'z hisobingiz uchun do'kon yarata olasiz" });
      return;
    }
    const [shop] = await db.insert(shopsTable).values({
      name: body.name,
      address: body.address,
      phone: body.phone,
      ownerId: body.ownerId,
      commission: body.commission ?? 10,
    }).returning();
    res.status(201).json({ shop });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/:id", authenticate, async (req, res) => {
  try {
    const [shop] = await db.select().from(shopsTable).where(eq(shopsTable.id, Number(req.params.id)));
    if (!shop) {
      res.status(404).json({ error: "Shop not found" });
      return;
    }
    res.json(shop);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id", authenticate, requireRole("super_admin", "shop_owner"), async (req, res) => {
  try {
    const body = UpdateShopBody.parse(req.body);
    const [shop] = await db.update(shopsTable).set(body as any).where(eq(shopsTable.id, Number(req.params.id))).returning();
    if (!shop) {
      res.status(404).json({ error: "Shop not found" });
      return;
    }
    res.json(shop);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
