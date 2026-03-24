import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate, requireRole } from "../lib/auth.js";

const router = Router();

async function ensureHardwareTables() {
  try {
    await db.$client.query(`
      CREATE TABLE IF NOT EXISTS hardware_products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        type VARCHAR(40) NOT NULL,
        description TEXT,
        price INTEGER NOT NULL DEFAULT 0,
        unit VARCHAR(30) DEFAULT 'dona',
        image_url TEXT,
        specs JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT TRUE,
        stock INTEGER DEFAULT 999,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS hardware_orders (
        id SERIAL PRIMARY KEY,
        shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id),
        status VARCHAR(30) DEFAULT 'pending',
        total_amount INTEGER NOT NULL DEFAULT 0,
        delivery_address TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS hardware_order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES hardware_orders(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES hardware_products(id),
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price INTEGER NOT NULL DEFAULT 0,
        subtotal INTEGER NOT NULL DEFAULT 0
      );

      INSERT INTO hardware_products (name, type, description, price, unit, specs) VALUES
        ('QR/Barcode Smart Karta', 'qr_card',
         'Do''koningiz asboblari uchun maxsus chop etilgan QR kod va barcode bilan laminatsiyalangan plastik karta. Suv o''tkazmaydigan, bardoshli.',
         15000, 'dona',
         '{"material":"PVC plastik","size":"85x54mm","lamination":"Glossy","waterproof":true,"qr":true,"barcode":true}'),
        ('GPS Mini Tracker', 'gps_mini',
         'Kichik asboblar uchun mini GPS tracker. SIM karta orqali ishlaydi. 7 kunlik batareya. Real-vaqt joylashuv.',
         450000, 'dona',
         '{"battery":"7 kun","accuracy":"5m","size":"4x2.5cm","sim":"Nano SIM","protocol":"MQTT","waterproof":"IP65"}'),
        ('GPS IoT Pro', 'gps_iot',
         'Og''ir texnika va yirik asboblar uchun kuchli GPS/IoT qurilma. Geofence, tezlik nazorati, uzoqdan o''chirish.',
         950000, 'dona',
         '{"battery":"30 kun","accuracy":"2m","size":"8x5cm","sim":"4G","protocol":"MQTT+HTTP","geofence":true,"remote_off":true,"shock_sensor":true,"waterproof":"IP67"}')
      ON CONFLICT DO NOTHING;
    `);
    console.log("[Hardware] tables ready");
  } catch (err: any) {
    console.error("[Hardware] ensureHardwareTables:", err.message);
  }
}
ensureHardwareTables();

// GET /api/hardware/products — barcha mahsulotlar (shop_owner ko'rishi uchun)
router.get("/products", authenticate, async (_req, res) => {
  try {
    const result = await db.$client.query(
      `SELECT * FROM hardware_products WHERE is_active = TRUE ORDER BY type, price`
    );
    res.json({ products: result.rows });
  } catch (err: any) {
    console.error("[Hardware] GET /products:", err.message);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// GET /api/hardware/products/all — admin uchun (faol + nofaol)
router.get("/products/all", authenticate, requireRole("super_admin"), async (_req, res) => {
  try {
    const result = await db.$client.query(
      `SELECT * FROM hardware_products ORDER BY type, price`
    );
    res.json({ products: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: "Server xatosi" });
  }
});

// POST /api/hardware/products — yangi mahsulot (admin)
router.post("/products", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const { name, type, description, price, unit, specs, imageUrl, stock } = req.body;
    if (!name || !type || price === undefined) {
      res.status(400).json({ error: "name, type, price majburiy" }); return;
    }
    const result = await db.$client.query(
      `INSERT INTO hardware_products (name, type, description, price, unit, specs, image_url, stock)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [name, type, description || null, Number(price), unit || "dona",
       JSON.stringify(specs || {}), imageUrl || null, stock ?? 999]
    );
    res.json({ success: true, product: result.rows[0] });
  } catch (err: any) {
    console.error("[Hardware] POST /products:", err.message);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// PATCH /api/hardware/products/:id — narx/ma'lumot yangilash (admin)
router.patch("/products/:id", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const { name, description, price, unit, specs, imageUrl, stock, isActive } = req.body;
    const id = Number(req.params.id);
    await db.$client.query(
      `UPDATE hardware_products SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        price = COALESCE($3, price),
        unit = COALESCE($4, unit),
        specs = COALESCE($5::jsonb, specs),
        image_url = COALESCE($6, image_url),
        stock = COALESCE($7, stock),
        is_active = COALESCE($8, is_active),
        updated_at = NOW()
      WHERE id = $9`,
      [name || null, description || null, price !== undefined ? Number(price) : null,
       unit || null, specs ? JSON.stringify(specs) : null, imageUrl || null,
       stock !== undefined ? Number(stock) : null,
       isActive !== undefined ? isActive : null, id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server xatosi" });
  }
});

// DELETE /api/hardware/products/:id — mahsulotni o'chirish (admin)
router.delete("/products/:id", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    await db.$client.query(
      `UPDATE hardware_products SET is_active = FALSE WHERE id = $1`,
      [Number(req.params.id)]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server xatosi" });
  }
});

// POST /api/hardware/orders — buyurtma berish (shop_owner)
router.post("/orders", authenticate, requireRole("shop_owner", "super_admin"), async (req, res) => {
  try {
    const user = (req as any).user;
    const { items, deliveryAddress, notes } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "items majburiy" }); return;
    }

    const shopResult = await db.$client.query(
      "SELECT id FROM shops WHERE owner_id = $1 LIMIT 1", [user.id]
    );
    if (!shopResult.rows.length) {
      res.status(400).json({ error: "Do'kon topilmadi" }); return;
    }
    const shopId = shopResult.rows[0].id;

    let totalAmount = 0;
    const enrichedItems: Array<{ productId: number; quantity: number; unitPrice: number; subtotal: number }> = [];

    for (const item of items) {
      const prod = await db.$client.query(
        "SELECT id, price, stock FROM hardware_products WHERE id = $1 AND is_active = TRUE",
        [Number(item.productId)]
      );
      if (!prod.rows.length) { res.status(400).json({ error: `Mahsulot topilmadi: ${item.productId}` }); return; }
      const quantity = Number(item.quantity) || 1;
      const unitPrice = Number(prod.rows[0].price);
      const subtotal = unitPrice * quantity;
      totalAmount += subtotal;
      enrichedItems.push({ productId: Number(item.productId), quantity, unitPrice, subtotal });
    }

    const orderResult = await db.$client.query(
      `INSERT INTO hardware_orders (shop_id, user_id, total_amount, delivery_address, notes)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [shopId, user.id, totalAmount, deliveryAddress || null, notes || null]
    );
    const order = orderResult.rows[0];

    for (const item of enrichedItems) {
      await db.$client.query(
        `INSERT INTO hardware_order_items (order_id, product_id, quantity, unit_price, subtotal)
         VALUES ($1,$2,$3,$4,$5)`,
        [order.id, item.productId, item.quantity, item.unitPrice, item.subtotal]
      );
    }

    res.json({ success: true, orderId: order.id, totalAmount });
  } catch (err: any) {
    console.error("[Hardware] POST /orders:", err.message);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// GET /api/hardware/orders — buyurtmalar ro'yxati
router.get("/orders", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    let query: string;
    let params: any[];

    if (user.role === "super_admin") {
      query = `
        SELECT ho.*, s.name as shop_name, u.name as user_name
        FROM hardware_orders ho
        JOIN shops s ON s.id = ho.shop_id
        JOIN users u ON u.id = ho.user_id
        ORDER BY ho.created_at DESC LIMIT 100`;
      params = [];
    } else {
      const shopResult = await db.$client.query(
        "SELECT id FROM shops WHERE owner_id = $1 LIMIT 1", [user.id]
      );
      if (!shopResult.rows.length) { res.json({ orders: [] }); return; }
      query = `
        SELECT ho.*, s.name as shop_name, u.name as user_name
        FROM hardware_orders ho
        JOIN shops s ON s.id = ho.shop_id
        JOIN users u ON u.id = ho.user_id
        WHERE ho.shop_id = $1
        ORDER BY ho.created_at DESC`;
      params = [shopResult.rows[0].id];
    }

    const result = await db.$client.query(query, params);
    res.json({ orders: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: "Server xatosi" });
  }
});

// GET /api/hardware/orders/:id/items — buyurtma tarkibi
router.get("/orders/:id/items", authenticate, async (req, res) => {
  try {
    const result = await db.$client.query(
      `SELECT hoi.*, hp.name as product_name, hp.type, hp.unit
       FROM hardware_order_items hoi
       JOIN hardware_products hp ON hp.id = hoi.product_id
       WHERE hoi.order_id = $1`,
      [Number(req.params.id)]
    );
    res.json({ items: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: "Server xatosi" });
  }
});

// PATCH /api/hardware/orders/:id/status — holat yangilash (admin)
router.patch("/orders/:id/status", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const { status } = req.body;
    const VALID = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
    if (!VALID.includes(status)) { res.status(400).json({ error: "Noto'g'ri status" }); return; }
    await db.$client.query(
      `UPDATE hardware_orders SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, Number(req.params.id)]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Server xatosi" });
  }
});

export default router;
