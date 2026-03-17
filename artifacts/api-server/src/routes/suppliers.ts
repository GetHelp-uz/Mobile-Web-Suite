import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate } from "../lib/auth.js";

const router = Router();

// GET /api/suppliers/shop/:shopId
router.get("/shop/:shopId", authenticate, async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT s.*, COUNT(t.id)::int as tool_count
      FROM suppliers s
      LEFT JOIN tools t ON t.supplier_id = s.id
      WHERE s.shop_id = ${Number(req.params.shopId)}
      GROUP BY s.id ORDER BY s.name
    `);
    res.json({ suppliers: rows.rows });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// POST /api/suppliers
router.post("/", authenticate, async (req, res) => {
  try {
    const { shopId, name, contactPhone, contactEmail, address, website, notes } = req.body;
    if (!shopId || !name) { res.status(400).json({ error: "shopId va name kerak" }); return; }
    const r = await db.execute(sql`
      INSERT INTO suppliers (shop_id, name, contact_phone, contact_email, address, website, notes)
      VALUES (${shopId}, ${name}, ${contactPhone || null}, ${contactEmail || null},
              ${address || null}, ${website || null}, ${notes || null})
      RETURNING *
    `);
    res.json({ success: true, supplier: r.rows[0] });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// PUT /api/suppliers/:id
router.put("/:id", authenticate, async (req, res) => {
  try {
    const { name, contactPhone, contactEmail, address, website, notes } = req.body;
    const r = await db.execute(sql`
      UPDATE suppliers SET name = ${name}, contact_phone = ${contactPhone || null},
        contact_email = ${contactEmail || null}, address = ${address || null},
        website = ${website || null}, notes = ${notes || null}
      WHERE id = ${Number(req.params.id)} RETURNING *
    `);
    res.json({ success: true, supplier: r.rows[0] });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// DELETE /api/suppliers/:id
router.delete("/:id", authenticate, async (req, res) => {
  try {
    await db.execute(sql`UPDATE tools SET supplier_id = NULL WHERE supplier_id = ${Number(req.params.id)}`);
    await db.execute(sql`DELETE FROM suppliers WHERE id = ${Number(req.params.id)}`);
    res.json({ success: true });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

export default router;
