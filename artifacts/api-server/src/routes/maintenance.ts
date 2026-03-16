import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate, requireRole } from "../lib/auth.js";

const router = Router();

// GET /api/maintenance/tool/:toolId
router.get("/tool/:toolId", authenticate, async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT m.*, u.name as performed_by_name
      FROM maintenance_logs m
      LEFT JOIN users u ON u.id = m.performed_by
      WHERE m.tool_id = ${Number(req.params.toolId)}
      ORDER BY m.created_at DESC
    `);
    res.json({ logs: rows.rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/maintenance/shop/:shopId
router.get("/shop/:shopId", authenticate, async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT m.*, t.name as tool_name, u.name as performed_by_name
      FROM maintenance_logs m
      LEFT JOIN tools t ON t.id = m.tool_id
      LEFT JOIN users u ON u.id = m.performed_by
      WHERE m.shop_id = ${Number(req.params.shopId)}
      ORDER BY m.created_at DESC LIMIT 100
    `);

    // Yaqin xizmat sanalari
    const upcoming = await db.execute(sql`
      SELECT m.*, t.name as tool_name
      FROM maintenance_logs m
      LEFT JOIN tools t ON t.id = m.tool_id
      WHERE m.shop_id = ${Number(req.params.shopId)}
        AND m.next_service_date IS NOT NULL
        AND m.next_service_date >= NOW()
        AND m.next_service_date <= NOW() + INTERVAL '7 days'
      ORDER BY m.next_service_date ASC
    `);

    res.json({ logs: rows.rows, upcomingService: upcoming.rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/maintenance
router.post("/", authenticate, requireRole(["shop_owner", "worker", "super_admin"]), async (req, res) => {
  try {
    const user = (req as any).user;
    const { toolId, shopId, type, description, cost, nextServiceDate, status } = req.body;
    if (!toolId || !shopId || !description) { res.status(400).json({ error: "toolId, shopId, description kerak" }); return; }

    // Asbobni ta'mirda holatiga o'tkazish
    if (status !== "completed") {
      await db.execute(sql`UPDATE tools SET status = 'maintenance' WHERE id = ${toolId}`);
    } else {
      await db.execute(sql`UPDATE tools SET status = 'available' WHERE id = ${toolId}`);
    }

    const r = await db.execute(sql`
      INSERT INTO maintenance_logs (tool_id, shop_id, performed_by, type, description, cost, next_service_date, status)
      VALUES (${toolId}, ${shopId}, ${user.userId}, ${type || 'routine'}, ${description}, ${cost || 0},
              ${nextServiceDate ? new Date(nextServiceDate) : null}, ${status || 'completed'})
      RETURNING *
    `);
    res.json({ success: true, log: r.rows[0] });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// PUT /api/maintenance/:id
router.put("/:id", authenticate, async (req, res) => {
  try {
    const { description, cost, nextServiceDate, status } = req.body;
    const r = await db.execute(sql`
      UPDATE maintenance_logs
      SET description = ${description}, cost = ${cost || 0},
          next_service_date = ${nextServiceDate ? new Date(nextServiceDate) : null},
          status = ${status || 'completed'}
      WHERE id = ${Number(req.params.id)}
      RETURNING *
    `);
    res.json({ success: true, log: r.rows[0] });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
