import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate } from "../lib/auth.js";

const router = Router();

// GET /api/peer-listings — barcha P2P asboblar
router.get("/", async (req, res) => {
  try {
    const { region, category, minPrice, maxPrice, page = "1" } = req.query;
    const limit = 20;
    const offset = (Number(page) - 1) * limit;

    let cond = sql`pl.is_available = TRUE`;
    if (region) cond = sql`${cond} AND pl.region = ${region}`;
    if (category) cond = sql`${cond} AND pl.category ILIKE ${'%' + category + '%'}`;
    if (minPrice) cond = sql`${cond} AND pl.daily_price >= ${Number(minPrice)}`;
    if (maxPrice) cond = sql`${cond} AND pl.daily_price <= ${Number(maxPrice)}`;

    const rows = await db.execute(sql`
      SELECT pl.*, u.name as owner_name, u.phone as owner_phone
      FROM peer_listings pl
      LEFT JOIN users u ON u.id = pl.owner_id
      WHERE ${cond}
      ORDER BY pl.rating DESC, pl.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    const total = await db.execute(sql`SELECT COUNT(*) as cnt FROM peer_listings pl WHERE ${cond}`);
    res.json({ listings: rows.rows, total: Number((total.rows[0] as any).cnt) });
  } catch (err: any) { console.error('[Peer] GET / error:', err.message); res.status(500).json({ error: 'Server xatosi' }); }
});

// GET /api/peer-listings/my — o'z e'lonlarim
router.get("/my", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const userId = user.userId || user.id;
    const rows = await db.execute(sql`SELECT * FROM peer_listings WHERE owner_id = ${userId} ORDER BY created_at DESC`);
    res.json({ listings: rows.rows });
  } catch (err: any) { console.error('[Peer] GET /my error:', err.message); res.status(500).json({ error: 'Server xatosi' }); }
});

// GET /api/peer-listings/:id
router.get("/:id", async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT pl.*, u.name as owner_name
      FROM peer_listings pl
      LEFT JOIN users u ON u.id = pl.owner_id
      WHERE pl.id = ${Number(req.params.id)} LIMIT 1
    `);
    if (!rows.rows.length) { res.status(404).json({ error: "E'lon topilmadi" }); return; }
    res.json({ listing: rows.rows[0] });
  } catch (err: any) { console.error('[Peer] GET /:id error:', err.message); res.status(500).json({ error: 'Server xatosi' }); }
});

// POST /api/peer-listings — yangi e'lon
router.post("/", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const userId = user.userId || user.id;
    const { title, description, category, dailyPrice, depositAmount, condition, region, district, address, images, minDays, maxDays } = req.body;
    if (!title || !dailyPrice) { res.status(400).json({ error: "title, dailyPrice majburiy" }); return; }

    // images ni JSON sifatida saqlash
    let imagesJson: string | null = null;
    if (images) {
      if (typeof images === "string") {
        // Agar string bo'lsa, JSON formatda ekanligini tekshiramiz
        try {
          JSON.parse(images);
          imagesJson = images;
        } catch {
          imagesJson = JSON.stringify([images]);
        }
      } else if (Array.isArray(images)) {
        imagesJson = JSON.stringify(images);
      }
    }

    const r = await db.execute(sql`
      INSERT INTO peer_listings (owner_id, title, description, category, daily_price, deposit_amount, condition, region, district, address, images, min_days, max_days)
      VALUES (${userId}, ${title}, ${description || null}, ${category || null}, ${Number(dailyPrice)}, ${Number(depositAmount || 0)}, ${condition || 'good'}, ${region || null}, ${district || null}, ${address || null}, ${imagesJson ? sql`${imagesJson}::jsonb` : sql`NULL`}, ${Number(minDays || 1)}, ${Number(maxDays || 30)})
      RETURNING *
    `);
    res.status(201).json({ listing: r.rows[0] });
  } catch (err: any) { console.error('[Peer] POST / error:', err.message, err.stack); res.status(500).json({ error: 'Server xatosi: ' + err.message }); }
});

// PATCH /api/peer-listings/:id
router.patch("/:id", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const userId = user.userId || user.id;
    const existing = await db.execute(sql`SELECT owner_id FROM peer_listings WHERE id = ${Number(req.params.id)} LIMIT 1`);
    if (!existing.rows.length) { res.status(404).json({ error: "Topilmadi" }); return; }
    if ((existing.rows[0] as any).owner_id !== userId && user.role !== 'super_admin') {
      res.status(403).json({ error: "Ruxsat yo'q" }); return;
    }
    const { title, description, dailyPrice, depositAmount, isAvailable, condition, images } = req.body;

    // images ni JSON sifatida yangilash
    let imagesUpdate = sql`images`;
    if (images !== undefined) {
      if (Array.isArray(images)) {
        imagesUpdate = sql`${JSON.stringify(images)}::jsonb`;
      } else if (typeof images === "string") {
        imagesUpdate = sql`${images}::jsonb`;
      } else {
        imagesUpdate = sql`NULL`;
      }
    }

    await db.execute(sql`
      UPDATE peer_listings SET
        title = COALESCE(${title || null}, title),
        description = COALESCE(${description || null}, description),
        daily_price = COALESCE(${dailyPrice ? Number(dailyPrice) : null}, daily_price),
        deposit_amount = COALESCE(${depositAmount !== undefined ? Number(depositAmount) : null}, deposit_amount),
        is_available = COALESCE(${isAvailable !== undefined ? isAvailable : null}, is_available),
        condition = COALESCE(${condition || null}, condition),
        images = ${images !== undefined ? imagesUpdate : sql`images`}
      WHERE id = ${Number(req.params.id)}
    `);
    res.json({ success: true });
  } catch (err: any) { console.error('[Peer] PATCH error:', err.message); res.status(500).json({ error: 'Server xatosi' }); }
});

// DELETE /api/peer-listings/:id
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const userId = user.userId || user.id;
    const existing = await db.execute(sql`SELECT owner_id FROM peer_listings WHERE id = ${Number(req.params.id)} LIMIT 1`);
    if (!existing.rows.length) { res.status(404).json({ error: "Topilmadi" }); return; }
    if ((existing.rows[0] as any).owner_id !== userId && user.role !== 'super_admin') {
      res.status(403).json({ error: "Ruxsat yo'q" }); return;
    }
    await db.execute(sql`DELETE FROM peer_listings WHERE id = ${Number(req.params.id)}`);
    res.json({ success: true });
  } catch (err: any) { console.error('[Peer] DELETE error:', err.message); res.status(500).json({ error: 'Server xatosi' }); }
});

// POST /api/peer-listings/:id/rent — ijaraga olish
router.post("/:id/rent", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const userId = user.userId || user.id;
    const { startDate, endDate, notes } = req.body;
    if (!startDate || !endDate) { res.status(400).json({ error: "startDate, endDate majburiy" }); return; }

    const listing = await db.execute(sql`SELECT * FROM peer_listings WHERE id = ${Number(req.params.id)} AND is_available = TRUE LIMIT 1`);
    if (!listing.rows.length) { res.status(404).json({ error: "E'lon topilmadi yoki mavjud emas" }); return; }
    const l = listing.rows[0] as any;

    if (l.owner_id === userId) { res.status(400).json({ error: "O'z e'loningizni ijaraga ololmaysiz" }); return; }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / 86400000);
    if (days < (l.min_days || 1) || days > (l.max_days || 30)) {
      res.status(400).json({ error: `Minimal ${l.min_days || 1}, maksimal ${l.max_days || 30} kun` }); return;
    }

    const totalPrice = days * Number(l.daily_price);

    const r = await db.execute(sql`
      INSERT INTO peer_rentals (listing_id, renter_id, start_date, end_date, total_price, deposit_paid, notes)
      VALUES (${Number(req.params.id)}, ${userId}, ${startDate}, ${endDate}, ${totalPrice}, ${Number(l.deposit_amount || 0)}, ${notes || null})
      RETURNING *
    `);
    res.status(201).json({ rental: r.rows[0], totalPrice, depositPaid: l.deposit_amount || 0 });
  } catch (err: any) { console.error('[Peer] POST /rent error:', err.message); res.status(500).json({ error: 'Server xatosi' }); }
});

export default router;
