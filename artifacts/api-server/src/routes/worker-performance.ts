import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate, requireRole } from "../lib/auth.js";

const router = Router();

// GET /api/worker-performance?shopId=X — xodimlar ish samaradorligi
router.get("/", authenticate, async (req, res) => {
  try {
    const shopId = req.query.shopId ? Number(req.query.shopId) : null;
    const period = (req.query.period as string) || "month"; // week | month | year | all
    const user = (req as any).user;

    // Vaqt filtri
    let dateFilter = sql``;
    if (period === "week")  dateFilter = sql`AND r.created_at >= NOW() - INTERVAL '7 days'`;
    if (period === "month") dateFilter = sql`AND r.created_at >= NOW() - INTERVAL '30 days'`;
    if (period === "year")  dateFilter = sql`AND r.created_at >= NOW() - INTERVAL '365 days'`;

    let shopFilter = sql``;
    if (shopId) shopFilter = sql`AND r.shop_id = ${shopId}`;

    // Xodim statistikasi
    const workerStats = await db.execute(sql`
      SELECT
        u.id,
        u.name,
        u.phone,
        u.role,
        COUNT(DISTINCT r.id) FILTER (WHERE r.worker_id = u.id) AS rentals_processed,
        COUNT(DISTINCT r.id) FILTER (WHERE r.worker_id = u.id AND r.status = 'returned') AS returned_count,
        COUNT(DISTINCT r.id) FILTER (WHERE r.worker_id = u.id AND r.status = 'active') AS active_count,
        COUNT(DISTINCT dr.id) FILTER (WHERE dr.reported_by = u.id) AS damage_reports_filed,
        COALESCE(SUM(r.total_amount) FILTER (WHERE r.worker_id = u.id AND r.status = 'returned'), 0) AS total_revenue_processed,
        COUNT(DISTINCT wt.id) FILTER (WHERE wt.assigned_to = u.id) AS tasks_total,
        COUNT(DISTINCT wt.id) FILTER (WHERE wt.assigned_to = u.id AND wt.status = 'done') AS tasks_done,
        MAX(r.started_at) FILTER (WHERE r.worker_id = u.id) AS last_rental_at
      FROM users u
      LEFT JOIN rentals r ON (r.worker_id = u.id OR r.shop_id = ${shopId || 0}) ${dateFilter} ${shopFilter}
      LEFT JOIN damage_reports dr ON dr.reported_by = u.id
      LEFT JOIN worker_tasks wt ON wt.assigned_to = u.id
      WHERE u.role IN ('worker', 'shop_owner')
        AND u.id IN (
          SELECT DISTINCT worker_id FROM rentals WHERE worker_id IS NOT NULL ${shopFilter}
          UNION
          SELECT DISTINCT assigned_to FROM worker_tasks WHERE shop_id = ${shopId || 0}
        )
      GROUP BY u.id, u.name, u.phone, u.role
      ORDER BY rentals_processed DESC
    `);

    // Do'kon uchun umumiy statistika
    let shopStats: any = {};
    if (shopId) {
      const totals = await db.execute(sql`
        SELECT
          COUNT(*) as total_rentals,
          COUNT(*) FILTER (WHERE status = 'returned') as completed_rentals,
          COUNT(*) FILTER (WHERE status = 'active') as active_rentals,
          COALESCE(SUM(total_amount) FILTER (WHERE status = 'returned'), 0) as total_revenue,
          COUNT(DISTINCT worker_id) FILTER (WHERE worker_id IS NOT NULL) as active_workers
        FROM rentals
        WHERE shop_id = ${shopId} ${dateFilter}
      `);
      shopStats = totals.rows[0] || {};
    }

    // Eng yaxshi xodim
    const topWorker = workerStats.rows[0] as any | null;

    res.json({
      workers: workerStats.rows,
      shopStats,
      topWorker,
      period,
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/worker-performance/:workerId — bitta xodim detali
router.get("/:workerId", authenticate, async (req, res) => {
  try {
    const workerId = Number(req.params.workerId);
    const period = (req.query.period as string) || "month";

    let dateFilter = sql``;
    if (period === "week")  dateFilter = sql`AND r.created_at >= NOW() - INTERVAL '7 days'`;
    if (period === "month") dateFilter = sql`AND r.created_at >= NOW() - INTERVAL '30 days'`;
    if (period === "year")  dateFilter = sql`AND r.created_at >= NOW() - INTERVAL '365 days'`;

    const worker = await db.execute(sql`
      SELECT id, name, phone, role FROM users WHERE id = ${workerId} LIMIT 1
    `);
    if (!worker.rows.length) { res.status(404).json({ error: "Xodim topilmadi" }); return; }

    const rentals = await db.execute(sql`
      SELECT r.id, r.status, r.total_amount, r.started_at, r.returned_at,
             t.name as tool_name, u.name as customer_name
      FROM rentals r
      JOIN tools t ON t.id = r.tool_id
      JOIN users u ON u.id = r.customer_id
      WHERE r.worker_id = ${workerId} ${dateFilter}
      ORDER BY r.created_at DESC LIMIT 20
    `);

    const tasks = await db.execute(sql`
      SELECT * FROM worker_tasks WHERE assigned_to = ${workerId}
      ORDER BY created_at DESC LIMIT 10
    `);

    const damages = await db.execute(sql`
      SELECT dr.*, t.name as tool_name FROM damage_reports dr
      LEFT JOIN tools t ON t.id = dr.tool_id
      WHERE dr.reported_by = ${workerId}
      ORDER BY dr.created_at DESC LIMIT 10
    `);

    res.json({
      worker: worker.rows[0],
      recentRentals: rentals.rows,
      tasks: tasks.rows,
      damageReports: damages.rows,
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
