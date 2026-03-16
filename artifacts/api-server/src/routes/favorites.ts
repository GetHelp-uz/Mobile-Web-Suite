import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate } from "../lib/auth.js";

const router = Router();

// GET /api/favorites
router.get("/", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const rows = await db.execute(sql`
      SELECT f.*, t.name as tool_name, t.price_per_day, t.status as tool_status,
             t.image_url, t.category, s.name as shop_name
      FROM favorites f
      LEFT JOIN tools t ON t.id = f.tool_id
      LEFT JOIN shops s ON s.id = t.shop_id
      WHERE f.user_id = ${user.userId}
      ORDER BY f.created_at DESC
    `);
    res.json({ favorites: rows.rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/favorites/:toolId
router.post("/:toolId", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    await db.execute(sql`
      INSERT INTO favorites (user_id, tool_id) VALUES (${user.userId}, ${Number(req.params.toolId)})
      ON CONFLICT (user_id, tool_id) DO NOTHING
    `);
    res.json({ success: true, isFavorite: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/favorites/:toolId
router.delete("/:toolId", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    await db.execute(sql`DELETE FROM favorites WHERE user_id = ${user.userId} AND tool_id = ${Number(req.params.toolId)}`);
    res.json({ success: true, isFavorite: false });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/favorites/check/:toolId
router.get("/check/:toolId", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const row = await db.execute(sql`SELECT id FROM favorites WHERE user_id = ${user.userId} AND tool_id = ${Number(req.params.toolId)} LIMIT 1`);
    res.json({ isFavorite: row.rows.length > 0 });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
