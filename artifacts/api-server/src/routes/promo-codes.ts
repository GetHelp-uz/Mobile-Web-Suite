import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate, requireRole } from "../lib/auth.js";
import crypto from "crypto";

const router = Router();

// GET /api/promo-codes/shop/:shopId
router.get("/shop/:shopId", authenticate, async (req, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM promo_codes WHERE shop_id = ${Number(req.params.shopId)} ORDER BY created_at DESC`);
    res.json({ codes: rows.rows });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// POST /api/promo-codes/validate — kodni tekshirish
router.post("/validate", async (req, res) => {
  try {
    const { code, shopId, amount } = req.body;
    const row = await db.execute(sql`
      SELECT * FROM promo_codes
      WHERE code = ${code.toUpperCase()} AND is_active = TRUE
        AND (shop_id IS NULL OR shop_id = ${shopId || 0})
        AND (expires_at IS NULL OR expires_at > NOW())
        AND used_count < max_uses
      LIMIT 1
    `);
    if (!row.rows.length) { res.status(404).json({ error: "Promo kod topilmadi yoki muddati o'tgan" }); return; }
    const c = row.rows[0] as any;
    if (c.min_amount && amount < c.min_amount) {
      res.status(400).json({ error: `Minimal summa: ${c.min_amount.toLocaleString()} so'm` }); return;
    }

    const discount = c.discount_type === "percent"
      ? Math.round(amount * c.discount_value / 100)
      : c.discount_value;

    res.json({ valid: true, code: c, discount, finalAmount: amount - discount });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// POST /api/promo-codes/use — kodni ishlatish
router.post("/use", authenticate, async (req, res) => {
  try {
    const { code, shopId, rentalId } = req.body;
    const row = await db.execute(sql`SELECT * FROM promo_codes WHERE code = ${code.toUpperCase()} AND is_active = TRUE AND used_count < max_uses LIMIT 1`);
    if (!row.rows.length) { res.status(404).json({ error: "Promo kod topilmadi" }); return; }
    await db.execute(sql`UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ${(row.rows[0] as any).id}`);
    res.json({ success: true });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// POST /api/promo-codes — yangi yaratish
router.post("/", authenticate, requireRole("shop_owner", "super_admin"), async (req, res) => {
  try {
    const { shopId, code, discountType, discountValue, minAmount, maxUses, expiresAt } = req.body;
    const finalCode = (code || crypto.randomBytes(3).toString("hex")).toUpperCase();
    const r = await db.execute(sql`
      INSERT INTO promo_codes (shop_id, code, discount_type, discount_value, min_amount, max_uses, expires_at)
      VALUES (${shopId || null}, ${finalCode}, ${discountType || "percent"}, ${Number(discountValue) || 10},
              ${Number(minAmount) || 0}, ${Number(maxUses) || 100}, ${expiresAt ? new Date(expiresAt) : null})
      RETURNING *
    `);
    res.json({ success: true, code: r.rows[0] });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// PATCH /api/promo-codes/:id
router.patch("/:id", authenticate, async (req, res) => {
  try {
    const { isActive } = req.body;
    await db.execute(sql`UPDATE promo_codes SET is_active = ${isActive} WHERE id = ${Number(req.params.id)}`);
    res.json({ success: true });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// DELETE /api/promo-codes/:id
router.delete("/:id", authenticate, async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM promo_codes WHERE id = ${Number(req.params.id)}`);
    res.json({ success: true });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

export default router;
