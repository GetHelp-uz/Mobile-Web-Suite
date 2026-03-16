import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate } from "../lib/auth.js";

const router = Router();

// ─── GPS QURILMALAR ────────────────────────────────────────────────────────────

// GET /api/gps/devices/shop/:shopId — do'kon GPS qurilmalari
router.get("/devices/shop/:shopId", authenticate, async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT g.*, t.name as tool_name, t.image_url as tool_image
      FROM gps_devices g
      LEFT JOIN tools t ON t.id = g.tool_id
      WHERE g.shop_id = ${Number(req.params.shopId)}
      ORDER BY g.is_active DESC, g.last_seen DESC NULLS LAST
    `);
    res.json({ devices: rows.rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/gps/devices/:id — bitta qurilma
router.get("/devices/:id", authenticate, async (req, res) => {
  try {
    const row = await db.execute(sql`SELECT g.*, t.name as tool_name FROM gps_devices g LEFT JOIN tools t ON t.id = g.tool_id WHERE g.id = ${Number(req.params.id)} LIMIT 1`);
    if (!row.rows.length) { res.status(404).json({ error: "Qurilma topilmadi" }); return; }
    res.json({ device: row.rows[0] });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/gps/devices — yangi GPS qurilma qo'shish
router.post("/devices", authenticate, async (req, res) => {
  try {
    const { shopId, toolId, deviceName, serialNumber, model, simNumber } = req.body;
    if (!shopId || !deviceName || !serialNumber) {
      res.status(400).json({ error: "shopId, deviceName, serialNumber kerak" }); return;
    }
    const r = await db.execute(sql`
      INSERT INTO gps_devices (shop_id, tool_id, device_name, serial_number, model, sim_number)
      VALUES (${shopId}, ${toolId || null}, ${deviceName}, ${serialNumber}, ${model || "Generic GPS"}, ${simNumber || null})
      RETURNING *
    `);
    const device = r.rows[0] as any;

    if (toolId) {
      await db.execute(sql`UPDATE tools SET gps_device_id = ${device.id}, gps_enabled = TRUE WHERE id = ${Number(toolId)}`);
    }

    await db.execute(sql`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
      VALUES (${(req as any).user.userId}, 'gps_device_add', 'gps_devices', ${device.id},
              ${JSON.stringify({ deviceName, serialNumber })}::jsonb)
    `);
    res.json({ success: true, device });
  } catch (err: any) {
    if (err.message?.includes("unique")) { res.status(409).json({ error: "Bu serial raqam allaqachon mavjud" }); return; }
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/gps/devices/:id/link — asbobga ulash
router.patch("/devices/:id/link", authenticate, async (req, res) => {
  try {
    const { toolId } = req.body;
    await db.execute(sql`UPDATE gps_devices SET tool_id = ${toolId || null} WHERE id = ${Number(req.params.id)}`);
    if (toolId) {
      await db.execute(sql`UPDATE tools SET gps_device_id = ${Number(req.params.id)}, gps_enabled = TRUE WHERE id = ${Number(toolId)}`);
    }
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/gps/devices/:id/unlink — asbobdan ajratish
router.patch("/devices/:id/unlink", authenticate, async (req, res) => {
  try {
    const device = await db.execute(sql`SELECT * FROM gps_devices WHERE id = ${Number(req.params.id)} LIMIT 1`);
    const d = device.rows[0] as any;
    if (d?.tool_id) {
      await db.execute(sql`UPDATE tools SET gps_device_id = NULL, gps_enabled = FALSE WHERE id = ${d.tool_id}`);
    }
    await db.execute(sql`UPDATE gps_devices SET tool_id = NULL WHERE id = ${Number(req.params.id)}`);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/gps/devices/:id — o'chirish
router.delete("/devices/:id", authenticate, async (req, res) => {
  try {
    const device = await db.execute(sql`SELECT * FROM gps_devices WHERE id = ${Number(req.params.id)} LIMIT 1`);
    const d = device.rows[0] as any;
    if (d?.tool_id) {
      await db.execute(sql`UPDATE tools SET gps_device_id = NULL, gps_enabled = FALSE WHERE id = ${d.tool_id}`);
    }
    await db.execute(sql`DELETE FROM gps_tracking_logs WHERE device_id = ${Number(req.params.id)}`);
    await db.execute(sql`DELETE FROM gps_devices WHERE id = ${Number(req.params.id)}`);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── GPS PING (Hardware → Server) ─────────────────────────────────────────────
// POST /api/gps/ping — GPS qurilmasi joylashuv yuboradi
// Bu endpoint himoyalanmagan — GPS hardware API key bilan ishlaydi
router.post("/ping", async (req, res) => {
  try {
    const { serialNumber, lat, lng, speed, heading, altitude, battery, signal } = req.body;
    if (!serialNumber || !lat || !lng) {
      res.status(400).json({ error: "serialNumber, lat, lng kerak" }); return;
    }

    const device = await db.execute(sql`
      SELECT * FROM gps_devices WHERE serial_number = ${serialNumber} AND is_active = TRUE LIMIT 1
    `);
    if (!device.rows.length) { res.status(404).json({ error: "Qurilma topilmadi" }); return; }
    const d = device.rows[0] as any;

    // Qurilmani yangilash
    await db.execute(sql`
      UPDATE gps_devices
      SET last_lat = ${Number(lat)}, last_lng = ${Number(lng)},
          last_speed = ${Number(speed) || 0}, last_battery = ${Number(battery) || 100},
          last_seen = NOW()
      WHERE id = ${d.id}
    `);

    // Tracking log
    await db.execute(sql`
      INSERT INTO gps_tracking_logs (device_id, tool_id, lat, lng, speed, heading, altitude, battery, signal_strength)
      VALUES (${d.id}, ${d.tool_id}, ${Number(lat)}, ${Number(lng)},
              ${Number(speed) || 0}, ${Number(heading) || 0}, ${Number(altitude) || 0},
              ${Number(battery) || 100}, ${Number(signal) || 100})
    `);

    // Agar asbob ijarada bo'lsa va juda uzoq ketgan bo'lsa — bildirishnoma
    if (d.tool_id) {
      const activeRental = await db.execute(sql`
        SELECT r.customer_id, s.owner_id FROM rentals r
        JOIN tools t ON t.id = r.tool_id
        JOIN shops s ON s.id = r.shop_id
        WHERE r.tool_id = ${d.tool_id} AND r.status = 'active' LIMIT 1
      `);
      if (activeRental.rows.length && Number(speed) > 60) {
        const owner = (activeRental.rows[0] as any).owner_id;
        await db.execute(sql`
          INSERT INTO notifications (user_id, title, body, type, related_id, related_type)
          VALUES (${owner}, 'Asbob harakatlanmoqda!',
                  ${'GPS: ' + d.device_name + ' - tezlik: ' + Math.round(Number(speed)) + ' km/h'},
                  'warning', ${d.id}, 'gps_device')
        `);
      }
    }

    res.json({ success: true, deviceId: d.id, timestamp: new Date() });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── MONITORING ──────────────────────────────────────────────────────────────

// GET /api/gps/monitoring/:shopId — xarita uchun barcha faol qurilmalar
router.get("/monitoring/:shopId", authenticate, async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT g.*, t.name as tool_name, t.category, t.status as tool_status,
             r.id as rental_id, u.name as renter_name, u.phone as renter_phone
      FROM gps_devices g
      LEFT JOIN tools t ON t.id = g.tool_id
      LEFT JOIN rentals r ON r.tool_id = g.tool_id AND r.status = 'active'
      LEFT JOIN users u ON u.id = r.customer_id
      WHERE g.shop_id = ${Number(req.params.shopId)} AND g.is_active = TRUE
        AND g.last_lat IS NOT NULL
      ORDER BY g.last_seen DESC NULLS LAST
    `);
    res.json({ devices: rows.rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/gps/history/:deviceId?from=&to=&limit=
router.get("/history/:deviceId", authenticate, async (req, res) => {
  try {
    const { from, to, limit = "200" } = req.query;
    let cond = sql`device_id = ${Number(req.params.deviceId)}`;
    if (from) cond = sql`${cond} AND created_at >= ${new Date(from as string)}`;
    if (to) cond = sql`${cond} AND created_at <= ${new Date(to as string)}`;

    const rows = await db.execute(sql`
      SELECT * FROM gps_tracking_logs WHERE ${cond}
      ORDER BY created_at DESC LIMIT ${Number(limit)}
    `);
    res.json({ history: rows.rows.reverse() });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── GEOFENCE ─────────────────────────────────────────────────────────────────

// GET /api/gps/geofences/shop/:shopId
router.get("/geofences/shop/:shopId", authenticate, async (req, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM gps_geofences WHERE shop_id = ${Number(req.params.shopId)} ORDER BY created_at DESC`);
    res.json({ geofences: rows.rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/gps/geofences — yangi geofence
router.post("/geofences", authenticate, async (req, res) => {
  try {
    const { shopId, deviceId, name, centerLat, centerLng, radiusMeters, alertOnExit } = req.body;
    const r = await db.execute(sql`
      INSERT INTO gps_geofences (shop_id, device_id, name, center_lat, center_lng, radius_meters, alert_on_exit)
      VALUES (${shopId}, ${deviceId || null}, ${name}, ${Number(centerLat)}, ${Number(centerLng)},
              ${Number(radiusMeters) || 1000}, ${alertOnExit !== false})
      RETURNING *
    `);
    res.json({ success: true, geofence: r.rows[0] });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/gps/geofences/:id
router.delete("/geofences/:id", authenticate, async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM gps_geofences WHERE id = ${Number(req.params.id)}`);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/gps/simulate — test uchun joylashuv simulyatsiya
router.post("/simulate", authenticate, async (req, res) => {
  try {
    const { deviceId, lat, lng, speed, battery } = req.body;
    const device = await db.execute(sql`SELECT * FROM gps_devices WHERE id = ${Number(deviceId)} LIMIT 1`);
    if (!device.rows.length) { res.status(404).json({ error: "Qurilma topilmadi" }); return; }
    const d = device.rows[0] as any;

    await db.execute(sql`
      UPDATE gps_devices SET last_lat = ${Number(lat)}, last_lng = ${Number(lng)},
        last_speed = ${Number(speed) || 0}, last_battery = ${Number(battery) || 85}, last_seen = NOW()
      WHERE id = ${Number(deviceId)}
    `);
    await db.execute(sql`
      INSERT INTO gps_tracking_logs (device_id, tool_id, lat, lng, speed, battery)
      VALUES (${Number(deviceId)}, ${d.tool_id}, ${Number(lat)}, ${Number(lng)}, ${Number(speed) || 0}, ${Number(battery) || 85})
    `);
    res.json({ success: true, message: "Simulyatsiya joylashuv yuborildi" });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
