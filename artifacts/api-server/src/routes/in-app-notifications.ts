import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate } from "../lib/auth.js";

const router = Router();

// GET /api/in-app-notifications
router.get("/", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const rows = await db.execute(sql`
      SELECT * FROM notifications WHERE user_id = ${user.userId} ORDER BY created_at DESC LIMIT 50
    `);
    const unread = rows.rows.filter((r: any) => !r.is_read).length;
    res.json({ notifications: rows.rows, unread });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// PATCH /api/in-app-notifications/:id/read
router.patch("/:id/read", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    await db.execute(sql`UPDATE notifications SET is_read = TRUE WHERE id = ${Number(req.params.id)} AND user_id = ${user.userId}`);
    res.json({ success: true });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// PATCH /api/in-app-notifications/read-all
router.patch("/read-all", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    await db.execute(sql`UPDATE notifications SET is_read = TRUE WHERE user_id = ${user.userId}`);
    res.json({ success: true });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

export default router;
