import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate, requireRole } from "../lib/auth.js";

const router = Router();

// GET /api/worker-packages — mavjud paketlar (mijozlar uchun)
router.get("/", async (req, res) => {
  try {
    const { region, category, shopId } = req.query;
    let cond = sql`wp.is_available = TRUE`;
    if (shopId) cond = sql`${cond} AND wp.shop_id = ${Number(shopId)}`;

    const rows = await db.execute(sql`
      SELECT
        wp.*,
        s.name as shop_name, s.address as shop_address, s.region as shop_region,
        u.name as worker_name, u.phone as worker_phone,
        t.name as tool_name, t.image_url as tool_image, t.category as tool_category
      FROM worker_packages wp
      LEFT JOIN shops s ON s.id = wp.shop_id
      LEFT JOIN users u ON u.id = wp.worker_id
      LEFT JOIN tools t ON t.id = wp.tool_id
      WHERE ${cond}
      ORDER BY wp.rating DESC, wp.created_at DESC
      LIMIT 50
    `);
    res.json({ packages: rows.rows });
  } catch (err: any) { console.error('[WorkerPkg]', err.message); res.status(500).json({ error: 'Server xatosi' }); }
});

// GET /api/worker-packages/:id — bitta paket
router.get("/:id", async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT
        wp.*,
        s.name as shop_name, s.address as shop_address,
        u.name as worker_name, u.phone as worker_phone,
        t.name as tool_name, t.image_url as tool_image, t.description as tool_description
      FROM worker_packages wp
      LEFT JOIN shops s ON s.id = wp.shop_id
      LEFT JOIN users u ON u.id = wp.worker_id
      LEFT JOIN tools t ON t.id = wp.tool_id
      WHERE wp.id = ${Number(req.params.id)} LIMIT 1
    `);
    if (!rows.rows.length) { res.status(404).json({ error: "Paket topilmadi" }); return; }
    res.json({ package: rows.rows[0] });
  } catch (err: any) { console.error('[WorkerPkg]', err.message); res.status(500).json({ error: 'Server xatosi' }); }
});

// POST /api/worker-packages — yangi paket yaratish (shop_owner)
router.post("/", authenticate, requireRole("shop_owner", "super_admin"), async (req, res) => {
  try {
    const user = (req as any).user;
    const { workerId, toolId, name, description, dailyPrice, workerDailyRate } = req.body;
    if (!workerId || !toolId || !name || !dailyPrice || !workerDailyRate) {
      res.status(400).json({ error: "workerId, toolId, name, dailyPrice, workerDailyRate majburiy" });
      return;
    }
    const shop = await db.execute(sql`SELECT id FROM shops WHERE owner_id = ${user.userId} LIMIT 1`);
    if (!shop.rows.length) { res.status(404).json({ error: "Do'kon topilmadi" }); return; }
    const shopId = (shop.rows[0] as any).id;

    const r = await db.execute(sql`
      INSERT INTO worker_packages (shop_id, worker_id, tool_id, name, description, daily_price, worker_daily_rate)
      VALUES (${shopId}, ${Number(workerId)}, ${Number(toolId)}, ${name}, ${description || null}, ${Number(dailyPrice)}, ${Number(workerDailyRate)})
      RETURNING *
    `);
    res.status(201).json({ package: r.rows[0] });
  } catch (err: any) { console.error('[WorkerPkg]', err.message); res.status(500).json({ error: 'Server xatosi' }); }
});

// PATCH /api/worker-packages/:id
router.patch("/:id", authenticate, requireRole("shop_owner", "super_admin"), async (req, res) => {
  try {
    const { name, description, dailyPrice, workerDailyRate, isAvailable } = req.body;
    await db.execute(sql`
      UPDATE worker_packages SET
        name = COALESCE(${name || null}, name),
        description = COALESCE(${description || null}, description),
        daily_price = COALESCE(${dailyPrice ? Number(dailyPrice) : null}, daily_price),
        worker_daily_rate = COALESCE(${workerDailyRate ? Number(workerDailyRate) : null}, worker_daily_rate),
        is_available = COALESCE(${isAvailable ?? null}, is_available)
      WHERE id = ${Number(req.params.id)}
    `);
    res.json({ success: true });
  } catch (err: any) { console.error('[WorkerPkg]', err.message); res.status(500).json({ error: 'Server xatosi' }); }
});

// DELETE /api/worker-packages/:id
router.delete("/:id", authenticate, requireRole("shop_owner", "super_admin"), async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM worker_packages WHERE id = ${Number(req.params.id)}`);
    res.json({ success: true });
  } catch (err: any) { console.error('[WorkerPkg]', err.message); res.status(500).json({ error: 'Server xatosi' }); }
});

// GET /api/worker-packages/shop/my — do'kon paketlari
router.get("/shop/my", authenticate, requireRole("shop_owner", "super_admin"), async (req, res) => {
  try {
    const user = (req as any).user;
    const shop = await db.execute(sql`SELECT id FROM shops WHERE owner_id = ${user.userId} LIMIT 1`);
    if (!shop.rows.length) { res.json({ packages: [] }); return; }
    const shopId = (shop.rows[0] as any).id;
    const rows = await db.execute(sql`
      SELECT wp.*, u.name as worker_name, t.name as tool_name
      FROM worker_packages wp
      LEFT JOIN users u ON u.id = wp.worker_id
      LEFT JOIN tools t ON t.id = wp.tool_id
      WHERE wp.shop_id = ${shopId}
      ORDER BY wp.created_at DESC
    `);
    res.json({ packages: rows.rows });
  } catch (err: any) { console.error('[WorkerPkg]', err.message); res.status(500).json({ error: 'Server xatosi' }); }
});

export default router;
