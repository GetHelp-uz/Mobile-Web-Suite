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
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
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
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// POST /api/maintenance
router.post("/", authenticate, requireRole("shop_owner", "worker", "super_admin"), async (req, res) => {
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
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
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
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// ─── Texnik xizmat jadvali ────────────────────────────────────────────────────

// GET /api/maintenance/schedule?shopId=X — barcha asboblar texnik holati
router.get("/schedule", authenticate, async (req, res) => {
  try {
    const shopId = Number(req.query.shopId);
    if (!shopId) { res.status(400).json({ error: "shopId talab qilinadi" }); return; }

    const tools = await db.execute(sql`
      SELECT
        t.id, t.name, t.category, t.status, t.image_url,
        COALESCE(t.rental_count, 0) as rental_count,
        COALESCE(t.maintenance_interval, 10) as maintenance_interval,
        t.last_maintained_at,
        COALESCE(t.rental_count, 0) - COALESCE(
          (SELECT COUNT(*) FROM rentals r2 WHERE r2.tool_id = t.id AND r2.returned_at > COALESCE(t.last_maintained_at, '2000-01-01'::timestamp)),
          0
        ) as rentals_since_maintenance,
        (SELECT COUNT(*) FROM maintenance_logs ml WHERE ml.tool_id = t.id) as total_maintenance_count,
        (SELECT ml.created_at FROM maintenance_logs ml WHERE ml.tool_id = t.id ORDER BY ml.created_at DESC LIMIT 1) as last_maintenance_log_at
      FROM tools t
      WHERE t.shop_id = ${shopId}
      ORDER BY
        (COALESCE(t.rental_count, 0) - COALESCE(
          (SELECT COUNT(*) FROM rentals r2 WHERE r2.tool_id = t.id AND r2.returned_at > COALESCE(t.last_maintained_at, '2000-01-01'::timestamp)),
          0
        )) * 100 / GREATEST(COALESCE(t.maintenance_interval, 10), 1) DESC
    `);

    const result = (tools.rows as any[]).map(t => {
      const sinceLastMaint = Number(t.rentals_since_maintenance) || 0;
      const interval = Number(t.maintenance_interval) || 10;
      const pct = Math.min(100, Math.round((sinceLastMaint / interval) * 100));
      const isDue = sinceLastMaint >= interval;
      const isWarning = pct >= 75 && !isDue;
      return { ...t, percentageDone: pct, isDue, isWarning, sinceLastMaint };
    });

    const due = result.filter(t => t.isDue).length;
    const warning = result.filter(t => t.isWarning).length;

    res.json({ tools: result, stats: { total: result.length, due, warning, ok: result.length - due - warning } });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// PUT /api/maintenance/schedule/:toolId — intervalini belgilash
router.put("/schedule/:toolId", authenticate, async (req, res) => {
  try {
    const { maintenanceInterval } = req.body;
    if (!maintenanceInterval || maintenanceInterval < 1) {
      res.status(400).json({ error: "Interval kamida 1 bo'lishi kerak" }); return;
    }
    await db.execute(sql`
      UPDATE tools SET maintenance_interval = ${Number(maintenanceInterval)} WHERE id = ${Number(req.params.toolId)}
    `);
    res.json({ success: true });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// POST /api/maintenance/schedule/:toolId/done — texnik xizmat bajarildi
router.post("/schedule/:toolId/done", authenticate, async (req, res) => {
  try {
    const { description, cost, performedBy } = req.body;
    const toolId = Number(req.params.toolId);
    const user = (req as any).user;

    // Texnik xizmat logini yozish
    const toolRow = await db.execute(sql`SELECT shop_id FROM tools WHERE id = ${toolId} LIMIT 1`);
    const shopId = (toolRow.rows[0] as any)?.shop_id;

    await db.execute(sql`
      INSERT INTO maintenance_logs (tool_id, shop_id, description, cost, status, performed_by, created_at)
      VALUES (${toolId}, ${shopId}, ${description || "Texnik xizmat bajarildi"}, ${Number(cost) || 0}, 'completed', ${performedBy || user.userId}, NOW())
    `);

    // Asbobning last_maintained_at ni yangilash
    await db.execute(sql`
      UPDATE tools SET last_maintained_at = NOW(), status = 'available' WHERE id = ${toolId}
    `);

    res.json({ success: true, message: "Texnik xizmat bajarildi deb belgilandi" });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

export default router;
