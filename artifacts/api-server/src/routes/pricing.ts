import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate, requireRole } from "../lib/auth.js";

const router = Router();

// GET /api/pricing/shop/:shopId
router.get("/shop/:shopId", async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT * FROM pricing_rules WHERE shop_id = ${Number(req.params.shopId)}
      ORDER BY created_at DESC
    `);
    res.json({ rules: rows.rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/pricing
router.post("/", authenticate, requireRole("shop_owner","super_admin"), async (req, res) => {
  try {
    const { shopId, ruleName, type, multiplier, startDate, endDate, daysOfWeek } = req.body;
    if (!shopId || !ruleName || !multiplier) { res.status(400).json({ error: "shopId, ruleName, multiplier kerak" }); return; }

    const r = await db.execute(sql`
      INSERT INTO pricing_rules (shop_id, rule_name, type, multiplier, start_date, end_date, days_of_week)
      VALUES (${shopId}, ${ruleName}, ${type || 'weekend'}, ${Number(multiplier)},
              ${startDate ? new Date(startDate) : null}, ${endDate ? new Date(endDate) : null}, ${daysOfWeek || '6,7'})
      RETURNING *
    `);
    res.json({ success: true, rule: r.rows[0] });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/pricing/:id
router.patch("/:id", authenticate, async (req, res) => {
  try {
    const { ruleName, multiplier, isActive, startDate, endDate, daysOfWeek } = req.body;
    const r = await db.execute(sql`
      UPDATE pricing_rules
      SET rule_name = COALESCE(${ruleName || null}, rule_name),
          multiplier = COALESCE(${multiplier ? Number(multiplier) : null}, multiplier),
          is_active = COALESCE(${isActive !== undefined ? isActive : null}, is_active),
          start_date = COALESCE(${startDate ? new Date(startDate) : null}, start_date),
          end_date = COALESCE(${endDate ? new Date(endDate) : null}, end_date),
          days_of_week = COALESCE(${daysOfWeek || null}, days_of_week)
      WHERE id = ${Number(req.params.id)}
      RETURNING *
    `);
    res.json({ success: true, rule: r.rows[0] });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/pricing/:id
router.delete("/:id", authenticate, async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM pricing_rules WHERE id = ${Number(req.params.id)}`);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/pricing/calculate — muayyan sana uchun narx hisoblash
router.get("/calculate", async (req, res) => {
  try {
    const { shopId, date, basePrice } = req.query;
    if (!shopId || !date || !basePrice) { res.status(400).json({ error: "shopId, date, basePrice kerak" }); return; }

    const d = new Date(date as string);
    const dayOfWeek = d.getDay() || 7; // 1=Monday, 7=Sunday

    const rules = await db.execute(sql`
      SELECT * FROM pricing_rules
      WHERE shop_id = ${Number(shopId)} AND is_active = TRUE
        AND (
          (type = 'weekend' AND days_of_week LIKE ${'%' + dayOfWeek + '%'})
          OR (type = 'seasonal' AND start_date <= ${d} AND end_date >= ${d})
          OR (type = 'holiday' AND start_date <= ${d} AND end_date >= ${d})
        )
      ORDER BY multiplier DESC
      LIMIT 1
    `);

    const base = Number(basePrice);
    if (!rules.rows.length) { res.json({ price: base, multiplier: 1, ruleName: null }); return; }
    const rule = rules.rows[0] as any;
    res.json({ price: Math.round(base * rule.multiplier), multiplier: rule.multiplier, ruleName: rule.rule_name });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
