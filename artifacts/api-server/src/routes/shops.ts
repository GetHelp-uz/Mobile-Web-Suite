import { Router } from "express";
import { db, shopsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { authenticate, requireRole } from "../lib/auth.js";
import { CreateShopBody, UpdateShopBody } from "@workspace/api-zod";

const router = Router();

router.get("/", authenticate, async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const shops = await db.select().from(shopsTable).limit(limit).offset(offset);
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(shopsTable);
    const total = Number(countResult[0].count);

    res.json({ shops, total, page, limit });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

router.post("/", authenticate, requireRole("super_admin", "shop_owner"), async (req, res) => {
  try {
    const body = CreateShopBody.parse(req.body);
    // Do'kon egasi faqat o'zi uchun do'kon yarata oladi
    const user = (req as any).user;
    if (user.role === "shop_owner" && body.ownerId !== user.userId) {
      res.status(403).json({ error: "Faqat o'z hisobingiz uchun do'kon yarata olasiz" });
      return;
    }
    const [shop] = await db.insert(shopsTable).values({
      name: body.name,
      address: body.address,
      phone: body.phone,
      ownerId: body.ownerId,
      commission: body.commission ?? 10,
    }).returning();
    res.status(201).json({ shop });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(400).json({ error: "Noto'g'ri so'rov. Qayta urining." });
  }
});

router.get("/:id", authenticate, async (req, res) => {
  try {
    const [shop] = await db.select().from(shopsTable).where(eq(shopsTable.id, Number(req.params.id)));
    if (!shop) {
      res.status(404).json({ error: "Shop not found" });
      return;
    }
    res.json(shop);
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

router.patch("/:id", authenticate, requireRole("super_admin", "shop_owner"), async (req, res) => {
  try {
    const body = UpdateShopBody.parse(req.body);
    const [shop] = await db.update(shopsTable).set(body as any).where(eq(shopsTable.id, Number(req.params.id))).returning();
    if (!shop) {
      res.status(404).json({ error: "Shop not found" });
      return;
    }
    res.json(shop);
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(400).json({ error: "Noto'g'ri so'rov. Qayta urining." });
  }
});

// PUT /api/shops/:id/owner-signature — do'kon egasi imzosini saqlash
router.put("/:id/owner-signature", authenticate, requireRole("super_admin", "shop_owner"), async (req, res) => {
  try {
    const { signatureData } = req.body;
    if (!signatureData) { res.status(400).json({ error: "Imzo ma'lumoti kerak" }); return; }
    await db.execute(sql`UPDATE shops SET owner_signature_data = ${signatureData} WHERE id = ${Number(req.params.id)}`);
    res.json({ success: true, message: "Do'kon imzosi saqlandi" });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// GET /api/shops/:id/owner-signature — imzo mavjudligini tekshirish
router.get("/:id/owner-signature", authenticate, async (req, res) => {
  try {
    const row = await db.execute(sql`
      SELECT CASE WHEN owner_signature_data IS NOT NULL THEN true ELSE false END as has_signature,
             updated_at
      FROM shops WHERE id = ${Number(req.params.id)} LIMIT 1
    `);
    if (!row.rows.length) { res.status(404).json({ error: "Do'kon topilmadi" }); return; }
    const r = row.rows[0] as any;
    res.json({ hasSignature: r.has_signature });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// GET /api/shops/:id/public — ommaviy do'kon profili (auth shart emas)
router.get("/:id/public", async (req, res) => {
  try {
    const shopId = Number(req.params.id);
    const [shop] = await db.select().from(shopsTable).where(eq(shopsTable.id, shopId));
    if (!shop) { res.status(404).json({ error: "Do'kon topilmadi" }); return; }
    const toolsResult = await db.execute(sql`
      SELECT id, name, category, price_per_day, deposit_amount, status, image_url, description
      FROM tools WHERE shop_id = ${shopId} AND status = 'available' ORDER BY created_at DESC LIMIT 20
    `);
    const ratingsResult = await db.execute(sql`
      SELECT r.*, u.name as customer_name FROM tool_ratings r
      LEFT JOIN users u ON u.id = r.customer_id WHERE r.shop_id = ${shopId} ORDER BY r.started_at DESC LIMIT 20
    `);
    const avgResult = await db.execute(sql`SELECT AVG(rating)::numeric(3,1) as avg, COUNT(*) as cnt FROM tool_ratings WHERE shop_id = ${shopId}`);
    const branchesResult = await db.execute(sql`SELECT * FROM shop_branches WHERE shop_id = ${shopId} AND is_active = TRUE ORDER BY is_main DESC`);
    res.json({
      shop,
      tools: toolsResult.rows,
      ratings: ratingsResult.rows,
      averageRating: Number((avgResult.rows[0] as any)?.avg || 0),
      ratingCount: Number((avgResult.rows[0] as any)?.cnt || 0),
      branches: branchesResult.rows,
    });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// PATCH /api/shops/:id/toggle-active — admin do'konni bloklash/faollashtirish
router.patch("/:id/toggle-active", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const shopId = Number(req.params.id);
    const [shop] = await db.select().from(shopsTable).where(eq(shopsTable.id, shopId));
    if (!shop) { res.status(404).json({ error: "Do'kon topilmadi" }); return; }
    const [updated] = await db.update(shopsTable)
      .set({ isActive: !shop.isActive })
      .where(eq(shopsTable.id, shopId))
      .returning();
    res.json({ ok: true, id: updated.id, isActive: updated.isActive });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// PATCH /api/shops/:id/commission — admin komissiyani o'zgartirish
router.patch("/:id/commission", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const shopId = Number(req.params.id);
    const commission = Number(req.body.commission);
    if (isNaN(commission) || commission < 0 || commission > 100) {
      res.status(400).json({ error: "Komissiya 0–100 orasida bo'lishi kerak" }); return;
    }
    const [updated] = await db.update(shopsTable)
      .set({ commission })
      .where(eq(shopsTable.id, shopId))
      .returning();
    if (!updated) { res.status(404).json({ error: "Do'kon topilmadi" }); return; }
    res.json({ ok: true, id: updated.id, commission: updated.commission });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// GET /api/shops/admin/list — admin uchun do'konlar ro'yxati (owner info bilan)
router.get("/admin/list", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const search = req.query.search ? String(req.query.search) : "";
    const whereClause = search
      ? sql`WHERE s.name ILIKE ${"%" + search + "%"} OR s.phone ILIKE ${"%" + search + "%"} OR u.name ILIKE ${"%" + search + "%"}`
      : sql`WHERE 1=1`;
    const rows = await db.execute(sql`
      SELECT s.id, s.name, s.address, s.phone, s.region, s.district,
             s.commission, s.is_active, s.subscription_status, s.subscription_ends_at, s.created_at,
             u.id as owner_id, u.name as owner_name, u.phone as owner_phone, u.is_active as owner_active,
             (SELECT COUNT(*) FROM tools t WHERE t.shop_id = s.id) as tools_count,
             (SELECT COUNT(*) FROM rentals r WHERE r.shop_id = s.id) as rentals_count
      FROM shops s
      LEFT JOIN users u ON u.id = s.owner_id
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    const countRows = await db.execute(sql`
      SELECT COUNT(*) as total FROM shops s
      LEFT JOIN users u ON u.id = s.owner_id
      ${whereClause}
    `);
    res.json({ shops: rows.rows, total: Number((countRows.rows[0] as any)?.total || 0), page, limit });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

export default router;
