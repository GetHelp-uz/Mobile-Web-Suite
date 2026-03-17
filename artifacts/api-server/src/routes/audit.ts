import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate, requireRole } from "../lib/auth.js";

const router = Router();

// GET /api/audit?limit=&offset=&action=&userId=
router.get("/", authenticate, requireRole("super_admin", "shop_owner"), async (req, res) => {
  try {
    const { limit = "50", offset = "0", action, userId } = req.query;
    let cond = sql`1=1`;
    if (action) cond = sql`${cond} AND al.action = ${action}`;
    if (userId) cond = sql`${cond} AND al.user_id = ${Number(userId)}`;

    const rows = await db.execute(sql`
      SELECT al.*, u.name as user_name, u.role as user_role
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      WHERE ${cond}
      ORDER BY al.created_at DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `);
    res.json({ logs: rows.rows });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

export async function logAudit(userId: number, action: string, entityType?: string, entityId?: number, details?: any) {
  try {
    await db.execute(sql`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
      VALUES (${userId}, ${action}, ${entityType || null}, ${entityId || null}, ${details ? JSON.stringify(details) : null}::jsonb)
    `);
  } catch {}
}

export default router;
