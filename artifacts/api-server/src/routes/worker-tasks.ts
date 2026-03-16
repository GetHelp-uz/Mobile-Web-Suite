import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate } from "../lib/auth.js";

const router = Router();

// GET /api/worker-tasks/shop/:shopId
router.get("/shop/:shopId", authenticate, async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    let cond = sql`wt.shop_id = ${Number(req.params.shopId)}`;
    if (status) cond = sql`${cond} AND wt.status = ${status}`;
    const rows = await db.execute(sql`
      SELECT wt.*, u.name as worker_name, a.name as assigned_by_name
      FROM worker_tasks wt
      LEFT JOIN users u ON u.id = wt.worker_id
      LEFT JOIN users a ON a.id = wt.assigned_by
      WHERE ${cond}
      ORDER BY CASE wt.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END, wt.created_at DESC
    `);
    res.json({ tasks: rows.rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/worker-tasks/my — xodim o'z vazifalari
router.get("/my", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const rows = await db.execute(sql`
      SELECT wt.*, a.name as assigned_by_name, s.name as shop_name
      FROM worker_tasks wt
      LEFT JOIN users a ON a.id = wt.assigned_by
      LEFT JOIN shops s ON s.id = wt.shop_id
      WHERE wt.worker_id = ${user.userId} AND wt.status != 'completed'
      ORDER BY wt.due_date ASC NULLS LAST, wt.created_at DESC
    `);
    res.json({ tasks: rows.rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/worker-tasks
router.post("/", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { shopId, workerId, title, description, priority, dueDate } = req.body;
    if (!shopId || !title) { res.status(400).json({ error: "shopId va title kerak" }); return; }
    const r = await db.execute(sql`
      INSERT INTO worker_tasks (shop_id, worker_id, assigned_by, title, description, priority, due_date)
      VALUES (${shopId}, ${workerId || null}, ${user.userId}, ${title}, ${description || null},
              ${priority || "normal"}, ${dueDate ? new Date(dueDate) : null})
      RETURNING *
    `);

    if (workerId) {
      await db.execute(sql`
        INSERT INTO notifications (user_id, title, body, type, related_id, related_type)
        VALUES (${workerId}, 'Yangi vazifa!', ${title}, 'info', ${(r.rows[0] as any).id}, 'worker_task')
      `);
    }
    res.json({ success: true, task: r.rows[0] });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/worker-tasks/:id/status
router.patch("/:id/status", authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const completedAt = status === "completed" ? sql`NOW()` : sql`NULL`;
    await db.execute(sql`
      UPDATE worker_tasks SET status = ${status},
        completed_at = CASE WHEN ${status} = 'completed' THEN NOW() ELSE NULL END
      WHERE id = ${Number(req.params.id)}
    `);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/worker-tasks/:id
router.delete("/:id", authenticate, async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM worker_tasks WHERE id = ${Number(req.params.id)}`);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
