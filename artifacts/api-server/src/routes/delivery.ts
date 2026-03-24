import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate, requireRole } from "../lib/auth.js";

const router = Router();

// ─── Do'kon yetkazib berish sozlamalari ──────────────────────────────────────

// GET /api/delivery/settings/:shopId
router.get("/settings/:shopId", async (req, res) => {
  try {
    const shopId = Number(req.params.shopId);
    const row = await db.execute(sql`
      SELECT * FROM delivery_settings WHERE shop_id = ${shopId} LIMIT 1
    `);
    if (!row.rows.length) {
      res.json({
        shop_id: shopId, is_active: false, base_price: 0,
        price_per_km: 5000, min_km: 1, max_km: 50, free_km: 0,
        time_slots: ["09:00-12:00", "12:00-15:00", "15:00-18:00", "18:00-21:00"],
        notes: "",
      });
      return;
    }
    const s = row.rows[0] as any;
    res.json({ ...s, time_slots: typeof s.time_slots === "string" ? JSON.parse(s.time_slots) : s.time_slots });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// PUT /api/delivery/settings/:shopId — do'kon yetkazib berish narxini sozlash
router.put("/settings/:shopId", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const shopId = Number(req.params.shopId);

    if (user.role !== "super_admin") {
      const shop = await db.execute(sql`SELECT owner_id FROM shops WHERE id = ${shopId} LIMIT 1`);
      if (!shop.rows.length || (shop.rows[0] as any).owner_id !== user.userId) {
        res.status(403).json({ error: "Ruxsat yo'q" }); return;
      }
    }

    const { is_active, base_price, price_per_km, min_km, max_km, free_km, time_slots, notes } = req.body;
    const slotsJson = JSON.stringify(Array.isArray(time_slots) ? time_slots : ["09:00-12:00", "12:00-15:00", "15:00-18:00"]);

    await db.execute(sql`
      INSERT INTO delivery_settings (shop_id, is_active, base_price, price_per_km, min_km, max_km, free_km, time_slots, notes, updated_at)
      VALUES (${shopId}, ${is_active ?? false}, ${Number(base_price) || 0}, ${Number(price_per_km) || 5000},
              ${Number(min_km) || 1}, ${Number(max_km) || 50}, ${Number(free_km) || 0}, ${slotsJson}::jsonb, ${notes || ""}, NOW())
      ON CONFLICT (shop_id) DO UPDATE SET
        is_active = EXCLUDED.is_active,
        base_price = EXCLUDED.base_price,
        price_per_km = EXCLUDED.price_per_km,
        min_km = EXCLUDED.min_km,
        max_km = EXCLUDED.max_km,
        free_km = EXCLUDED.free_km,
        time_slots = EXCLUDED.time_slots,
        notes = EXCLUDED.notes,
        updated_at = NOW()
    `);

    res.json({ success: true, message: "Yetkazib berish sozlamalari saqlandi" });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// POST /api/delivery/calculate — masofaga qarab narx hisoblash
router.post("/calculate", async (req, res) => {
  try {
    const { shopId, distanceKm } = req.body;
    const km = Number(distanceKm) || 0;

    const row = await db.execute(sql`SELECT * FROM delivery_settings WHERE shop_id = ${Number(shopId)} AND is_active = true LIMIT 1`);
    if (!row.rows.length) {
      res.json({ available: false, message: "Bu do'kon yetkazib berish xizmatini taklif qilmaydi" }); return;
    }
    const s = row.rows[0] as any;

    if (km < s.min_km) {
      res.json({ available: false, message: `Minimal masofa: ${s.min_km} km` }); return;
    }
    if (km > s.max_km) {
      res.json({ available: false, message: `Maksimal masofa: ${s.max_km} km` }); return;
    }

    const chargeableKm = Math.max(0, km - (s.free_km || 0));
    const price = s.base_price + chargeableKm * s.price_per_km;

    const slots = typeof s.time_slots === "string" ? JSON.parse(s.time_slots) : s.time_slots;
    res.json({
      available: true,
      distanceKm: km,
      price: Math.round(price),
      basePrice: s.base_price,
      pricePerKm: s.price_per_km,
      freeKm: s.free_km || 0,
      timeSlots: slots,
    });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// POST /api/delivery/orders — buyurtma yaratish
router.post("/orders", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { rentalId, shopId, address, distanceKm, deliveryPrice, timeSlot, scheduledDate, notes } = req.body;

    if (!address || !shopId) { res.status(400).json({ error: "Manzil va do'kon talab qilinadi" }); return; }

    const [order] = await db.execute(sql`
      INSERT INTO delivery_orders (rental_id, shop_id, customer_id, address, distance_km, delivery_price, time_slot, scheduled_date, notes, status)
      VALUES (${rentalId || null}, ${Number(shopId)}, ${user.userId}, ${address},
              ${Number(distanceKm) || 0}, ${Number(deliveryPrice) || 0}, ${timeSlot || null},
              ${scheduledDate || null}, ${notes || null}, 'pending')
      RETURNING *
    `).then((r: any) => r.rows);

    res.status(201).json({ success: true, order });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// GET /api/delivery/orders — buyurtmalar ro'yxati (do'kon uchun)
router.get("/orders", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const shopId = req.query.shopId ? Number(req.query.shopId) : null;
    const status = req.query.status as string | undefined;

    let where = shopId ? sql`WHERE d.shop_id = ${shopId}` : sql`WHERE d.customer_id = ${user.userId}`;
    if (status) where = sql`${where} AND d.status = ${status}`;

    const rows = await db.execute(sql`
      SELECT d.*, u.name as customer_name, u.phone as customer_phone,
             r.tool_id, t.name as tool_name
      FROM delivery_orders d
      JOIN users u ON u.id = d.customer_id
      LEFT JOIN rentals r ON r.id = d.rental_id
      LEFT JOIN tools t ON t.id = r.tool_id
      ${where}
      ORDER BY d.created_at DESC LIMIT 50
    `);
    res.json({ orders: rows.rows });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// PATCH /api/delivery/orders/:id/status — holat yangilash (do'kon egasi)
router.patch("/orders/:id/status", authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["pending", "confirmed", "picked_up", "delivered", "cancelled"];
    if (!validStatuses.includes(status)) { res.status(400).json({ error: "Noto'g'ri holat" }); return; }

    const delivered = status === "delivered" ? sql`, delivered_at = NOW()` : sql``;
    await db.execute(sql`
      UPDATE delivery_orders SET status = ${status} ${delivered} WHERE id = ${Number(req.params.id)}
    `);
    res.json({ success: true });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

export default router;
