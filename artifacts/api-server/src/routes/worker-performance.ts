import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate } from "../lib/auth.js";

const router = Router();

// GET /api/worker-performance?shopId=X&period=week|month|year|all
router.get("/", authenticate, async (req, res) => {
  try {
    const shopId = req.query.shopId ? Number(req.query.shopId) : null;
    const period = (req.query.period as string) || "month";

    // Vaqt filtri
    const intervalMap: Record<string, string> = {
      week: "7 days", month: "30 days", year: "365 days",
    };
    const interval = intervalMap[period];
    const dateCondition = interval ? `AND r.started_at >= NOW() - INTERVAL '${interval}'` : "";
    const shopCondition = shopId ? `AND r.shop_id = ${shopId}` : "";
    const shopConditionWt = shopId ? `AND wt.shop_id = ${shopId}` : "";

    const { rows: workers } = await db.$client.query(`
      SELECT
        u.id,
        u.name,
        u.phone,
        u.role,
        COUNT(DISTINCT r.id) FILTER (WHERE r.worker_id = u.id) AS rentals_processed,
        COUNT(DISTINCT r.id) FILTER (WHERE r.worker_id = u.id AND r.status = 'returned') AS returned_count,
        COUNT(DISTINCT r.id) FILTER (WHERE r.worker_id = u.id AND r.status = 'active') AS active_count,
        COALESCE(SUM(r.total_amount) FILTER (WHERE r.worker_id = u.id AND r.status = 'returned'), 0) AS total_revenue_processed,
        COUNT(DISTINCT wt.id) FILTER (WHERE wt.worker_id = u.id) AS tasks_total,
        COUNT(DISTINCT wt.id) FILTER (WHERE wt.worker_id = u.id AND wt.status = 'done') AS tasks_done,
        MAX(r.started_at) FILTER (WHERE r.worker_id = u.id) AS last_rental_at
      FROM users u
      LEFT JOIN rentals r ON r.worker_id = u.id ${dateCondition} ${shopCondition}
      LEFT JOIN worker_tasks wt ON wt.worker_id = u.id ${shopConditionWt}
      WHERE u.role IN ('worker', 'shop_owner')
        AND (
          u.id IN (SELECT DISTINCT worker_id FROM rentals WHERE worker_id IS NOT NULL ${shopCondition.replace(/AND r\./g, 'AND ')})
          OR u.id IN (SELECT DISTINCT worker_id FROM worker_tasks WHERE worker_id IS NOT NULL ${shopConditionWt.replace(/wt\./g, '')})
        )
      GROUP BY u.id, u.name, u.phone, u.role
      ORDER BY rentals_processed DESC
    `);

    // Do'kon uchun umumiy statistika
    let shopStats: any = {};
    if (shopId) {
      const dateClause = interval ? `AND started_at >= NOW() - INTERVAL '${interval}'` : "";
      const { rows } = await db.$client.query(`
        SELECT
          COUNT(*) as total_rentals,
          COUNT(*) FILTER (WHERE status = 'returned') as completed_rentals,
          COUNT(*) FILTER (WHERE status = 'active') as active_rentals,
          COALESCE(SUM(total_amount) FILTER (WHERE status = 'returned'), 0) as total_revenue,
          COUNT(DISTINCT worker_id) FILTER (WHERE worker_id IS NOT NULL) as active_workers
        FROM rentals
        WHERE shop_id = $1 ${dateClause}
      `, [shopId]);
      shopStats = rows[0] || {};
    }

    res.json({ workers, shopStats, topWorker: workers[0] || null, period });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/worker-performance/:workerId — bitta xodim detali
router.get("/:workerId", authenticate, async (req, res) => {
  try {
    const workerId = Number(req.params.workerId);
    const period = (req.query.period as string) || "month";
    const intervalMap: Record<string, string> = { week: "7 days", month: "30 days", year: "365 days" };
    const interval = intervalMap[period];
    const dateClause = interval ? `AND r.started_at >= NOW() - INTERVAL '${interval}'` : "";

    const { rows: workerRows } = await db.$client.query(
      `SELECT id, name, phone, role FROM users WHERE id = $1 LIMIT 1`, [workerId]
    );
    if (!workerRows.length) { res.status(404).json({ error: "Xodim topilmadi" }); return; }

    const { rows: rentals } = await db.$client.query(`
      SELECT r.id, r.status, r.total_amount, r.started_at, r.returned_at,
             t.name as tool_name, u.name as customer_name
      FROM rentals r
      JOIN tools t ON t.id = r.tool_id
      JOIN users u ON u.id = r.customer_id
      WHERE r.worker_id = $1 ${dateClause}
      ORDER BY r.started_at DESC LIMIT 20
    `, [workerId]);

    const { rows: tasks } = await db.$client.query(
      `SELECT * FROM worker_tasks WHERE worker_id = $1 ORDER BY created_at DESC LIMIT 10`, [workerId]
    );

    res.json({ worker: workerRows[0], recentRentals: rentals, tasks, damageReports: [] });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
