import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate } from "../lib/auth.js";

const router = Router();

// GET /api/branches/shop/:shopId — filiallar ro'yxati
router.get("/shop/:shopId", async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT b.*, COUNT(t.id) as tool_count
      FROM shop_branches b
      LEFT JOIN tools t ON t.branch_id = b.id
      WHERE b.shop_id = ${Number(req.params.shopId)} AND b.is_active = TRUE
      GROUP BY b.id ORDER BY b.is_main DESC, b.created_at ASC
    `);
    res.json({ branches: rows.rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/branches/:id
router.get("/:id", async (req, res) => {
  try {
    const r = await db.execute(sql`SELECT * FROM shop_branches WHERE id = ${Number(req.params.id)} LIMIT 1`);
    if (!r.rows.length) { res.status(404).json({ error: "Filial topilmadi" }); return; }
    res.json({ branch: r.rows[0] });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/branches — yangi filial
router.post("/", authenticate, async (req, res) => {
  try {
    const { shopId, name, address, lat, lng, phone, managerName, isMain } = req.body;
    if (!shopId || !name || !address) {
      res.status(400).json({ error: "shopId, name, address kerak" }); return;
    }
    if (isMain) {
      await db.execute(sql`UPDATE shop_branches SET is_main = FALSE WHERE shop_id = ${shopId}`);
    }
    const r = await db.execute(sql`
      INSERT INTO shop_branches (shop_id, name, address, lat, lng, phone, manager_name, is_main)
      VALUES (${shopId}, ${name}, ${address}, ${lat || null}, ${lng || null},
              ${phone || null}, ${managerName || null}, ${isMain || false})
      RETURNING *
    `);
    res.json({ success: true, branch: r.rows[0] });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/branches/:id — tahrirlash
router.patch("/:id", authenticate, async (req, res) => {
  try {
    const { name, address, lat, lng, phone, managerName, isMain, isActive } = req.body;
    if (isMain) {
      const branch = await db.execute(sql`SELECT shop_id FROM shop_branches WHERE id = ${Number(req.params.id)} LIMIT 1`);
      if (branch.rows.length) {
        await db.execute(sql`UPDATE shop_branches SET is_main = FALSE WHERE shop_id = ${(branch.rows[0] as any).shop_id}`);
      }
    }
    await db.execute(sql`
      UPDATE shop_branches SET
        name = COALESCE(${name || null}, name),
        address = COALESCE(${address || null}, address),
        lat = COALESCE(${lat || null}, lat),
        lng = COALESCE(${lng || null}, lng),
        phone = COALESCE(${phone || null}, phone),
        manager_name = COALESCE(${managerName || null}, manager_name),
        is_main = COALESCE(${isMain !== undefined ? isMain : null}, is_main),
        is_active = COALESCE(${isActive !== undefined ? isActive : null}, is_active)
      WHERE id = ${Number(req.params.id)}
    `);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/branches/:id
router.delete("/:id", authenticate, async (req, res) => {
  try {
    await db.execute(sql`UPDATE shop_branches SET is_active = FALSE WHERE id = ${Number(req.params.id)}`);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
