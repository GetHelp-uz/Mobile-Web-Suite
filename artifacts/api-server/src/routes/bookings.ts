import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate } from "../lib/auth.js";

const router = Router();

// GET /api/bookings - o'z bronlarim
router.get("/", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const shopId = req.query.shopId ? Number(req.query.shopId) : undefined;
    const customerId = req.query.customerId ? Number(req.query.customerId) : undefined;
    const status = req.query.status as string | undefined;

    let where = sql`1=1`;
    if (shopId) where = sql`${where} AND b.shop_id = ${shopId}`;
    if (customerId) where = sql`${where} AND b.customer_id = ${customerId}`;
    if (user.role === "customer") where = sql`${where} AND b.customer_id = ${user.userId}`;
    if (status) where = sql`${where} AND b.status = ${status}`;

    const rows = await db.execute(sql`
      SELECT b.*, t.name as tool_name, t.price_per_day,
             u.name as customer_name, u.phone as customer_phone,
             s.name as shop_name
      FROM bookings b
      LEFT JOIN tools t ON t.id = b.tool_id
      LEFT JOIN users u ON u.id = b.customer_id
      LEFT JOIN shops s ON s.id = b.shop_id
      WHERE ${where}
      ORDER BY b.created_at DESC
    `);
    res.json({ bookings: rows.rows });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// GET /api/bookings/tool/:toolId/availability
router.get("/tool/:toolId/availability", async (req, res) => {
  try {
    const toolId = Number(req.params.toolId);
    const rows = await db.execute(sql`
      SELECT start_date, end_date, status
      FROM bookings
      WHERE tool_id = ${toolId} AND status IN ('confirmed', 'pending')
        AND end_date >= NOW()
      ORDER BY start_date ASC
    `);
    // Aktiv ijaralar ham
    const rentals = await db.execute(sql`
      SELECT started_at as start_date, due_date as end_date, 'rented' as status
      FROM rentals
      WHERE tool_id = ${toolId} AND status = 'active'
    `);
    res.json({ bookedDates: [...rows.rows, ...rentals.rows] });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// POST /api/bookings
router.post("/", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { toolId, shopId, startDate, endDate, paymentMethod, notes } = req.body;
    if (!toolId || !shopId || !startDate || !endDate) {
      res.status(400).json({ error: "toolId, shopId, startDate, endDate kerak" }); return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysCount = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    // Konflikt tekshirish
    const conflict = await db.execute(sql`
      SELECT id FROM bookings
      WHERE tool_id = ${toolId}
        AND status IN ('confirmed', 'pending')
        AND start_date < ${end}
        AND end_date > ${start}
    `);
    if (conflict.rows.length) {
      res.status(409).json({ error: "Bu sana oralig'ida asbob allaqachon band qilingan" }); return;
    }

    // Narxni hisoblash
    const tool = await db.execute(sql`SELECT price_per_day, deposit_amount FROM tools WHERE id = ${toolId} LIMIT 1`);
    if (!tool.rows.length) { res.status(404).json({ error: "Asbob topilmadi" }); return; }
    const t = tool.rows[0] as any;
    const totalAmount = t.price_per_day * daysCount;

    const r = await db.execute(sql`
      INSERT INTO bookings (tool_id, customer_id, shop_id, start_date, end_date, days_count, total_amount, deposit_amount, payment_method, status, notes)
      VALUES (${toolId}, ${user.userId}, ${shopId}, ${start}, ${end}, ${daysCount}, ${totalAmount}, ${t.deposit_amount}, ${paymentMethod || 'cash'}, 'pending', ${notes || null})
      RETURNING *
    `);
    res.json({ success: true, booking: r.rows[0] });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// PATCH /api/bookings/:id/status
router.patch("/:id/status", authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["confirmed", "cancelled", "completed"].includes(status)) {
      res.status(400).json({ error: "Status noto'g'ri" }); return;
    }
    const r = await db.execute(sql`UPDATE bookings SET status = ${status} WHERE id = ${Number(req.params.id)} RETURNING *`);
    res.json({ success: true, booking: r.rows[0] });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// DELETE /api/bookings/:id
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    await db.execute(sql`
      DELETE FROM bookings WHERE id = ${Number(req.params.id)}
        AND (customer_id = ${user.userId} OR ${user.role} IN ('shop_owner','super_admin'))
    `);
    res.json({ success: true });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

export default router;
