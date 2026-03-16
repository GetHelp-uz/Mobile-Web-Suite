import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate } from "../lib/auth.js";

const router = Router();

// GET /api/ratings/tool/:toolId
router.get("/tool/:toolId", async (req, res) => {
  try {
    const toolId = Number(req.params.toolId);
    const rows = await db.execute(sql`
      SELECT r.*, u.name as customer_name
      FROM tool_ratings r
      LEFT JOIN users u ON u.id = r.customer_id
      WHERE r.tool_id = ${toolId}
      ORDER BY r.created_at DESC LIMIT 50
    `);
    const avg = rows.rows.length
      ? rows.rows.reduce((s: number, r: any) => s + r.rating, 0) / rows.rows.length
      : 0;
    res.json({ ratings: rows.rows, average: Math.round(avg * 10) / 10, count: rows.rows.length });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/ratings/shop/:shopId
router.get("/shop/:shopId", async (req, res) => {
  try {
    const shopId = Number(req.params.shopId);
    const rows = await db.execute(sql`
      SELECT r.*, u.name as customer_name, t.name as tool_name
      FROM tool_ratings r
      LEFT JOIN users u ON u.id = r.customer_id
      LEFT JOIN tools t ON t.id = r.tool_id
      WHERE r.shop_id = ${shopId}
      ORDER BY r.created_at DESC LIMIT 100
    `);
    const avg = rows.rows.length
      ? rows.rows.reduce((s: number, r: any) => s + r.rating, 0) / rows.rows.length
      : 0;
    res.json({ ratings: rows.rows, average: Math.round(avg * 10) / 10, count: rows.rows.length });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/ratings
router.post("/", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { toolId, shopId, rentalId, rating, comment } = req.body;
    if (!toolId || !shopId || !rating) { res.status(400).json({ error: "toolId, shopId, rating kerak" }); return; }
    if (rating < 1 || rating > 5) { res.status(400).json({ error: "Baho 1-5 orasida bo'lishi kerak" }); return; }

    // Faqat bir marta baho berish mumkin (same rental)
    if (rentalId) {
      const existing = await db.execute(sql`SELECT id FROM tool_ratings WHERE rental_id = ${rentalId} AND customer_id = ${user.userId} LIMIT 1`);
      if (existing.rows.length) { res.status(400).json({ error: "Bu ijarani allaqachon baholagansiz" }); return; }
    }

    const r = await db.execute(sql`
      INSERT INTO tool_ratings (tool_id, shop_id, customer_id, rental_id, rating, comment)
      VALUES (${toolId}, ${shopId}, ${user.userId}, ${rentalId || null}, ${rating}, ${comment || null})
      RETURNING *
    `);
    res.json({ success: true, rating: r.rows[0] });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
