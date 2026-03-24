import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { ensurePassportTables } from "../lib/passport.js";
import { authenticate, requireRole } from "../lib/auth.js";
ensurePassportTables();

const router = Router();

// GET /api/passport/admin/list — barcha asboblar ro'yxati (admin uchun)
router.get("/admin/list", authenticate, requireRole("super_admin"), async (_req: Request, res: Response) => {
  try {
    const result = await db.$client.query(
      `SELECT
         t.id, t.name, t.category, t.status, t.qr_code, t.custom_barcode,
         s.name as shop_name, s.id as shop_id,
         COUNT(te.id) as event_count,
         MAX(te.created_at) as last_event_at,
         COUNT(te.id) FILTER (WHERE te.event_type = 'rental_started') as rental_count,
         COUNT(te.id) FILTER (WHERE te.event_type IN ('repair', 'damage')) as damage_count
       FROM tools t
       JOIN shops s ON s.id = t.shop_id
       LEFT JOIN tool_events te ON te.tool_id = t.id
       GROUP BY t.id, t.name, t.category, t.status, t.qr_code, t.custom_barcode, s.name, s.id
       ORDER BY event_count DESC, t.name ASC
       LIMIT 500`
    );
    return res.json({ tools: result.rows });
  } catch (err: any) {
    console.error("[Passport] admin/list error:", err.message);
    return res.status(500).json({ error: "Server xatosi" });
  }
});

router.get("/:qrCode", async (req: Request, res: Response) => {
  try {
    const { qrCode } = req.params;
    const toolResult = await db.$client.query(
      `SELECT t.*, s.name as shop_name, s.phone as shop_phone, s.address as shop_address
       FROM tools t
       JOIN shops s ON s.id = t.shop_id
       WHERE t.qr_code = $1`,
      [qrCode]
    );
    if (!toolResult.rows.length) {
      return res.status(404).json({ error: "Asbob topilmadi" });
    }
    const tool = toolResult.rows[0];

    const eventsResult = await db.$client.query(
      `SELECT te.*, u.full_name as actor_name
       FROM tool_events te
       LEFT JOIN users u ON u.id = te.actor_id
       WHERE te.tool_id = $1
       ORDER BY te.created_at DESC
       LIMIT 50`,
      [tool.id]
    );

    const statsResult = await db.$client.query(
      `SELECT
         COUNT(*) FILTER (WHERE event_type = 'rental_started') as total_rentals,
         COUNT(*) FILTER (WHERE event_type = 'maintenance_started') as total_maintenance,
         COUNT(*) FILTER (WHERE event_type = 'repair') as total_repairs,
         COALESCE(SUM(cost) FILTER (WHERE event_type IN ('repair','maintenance_completed')), 0) as total_maintenance_cost
       FROM tool_events
       WHERE tool_id = $1`,
      [tool.id]
    );

    return res.json({
      tool,
      events: eventsResult.rows,
      stats: statsResult.rows[0],
    });
  } catch (err: any) {
    console.error("[Passport] GET /:qrCode error:", err);
    return res.status(500).json({ error: "Server xatosi" });
  }
});

export default router;
