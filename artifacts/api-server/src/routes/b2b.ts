import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate, requireRole } from "../lib/auth.js";

const router = Router();

// ── B2B KLIENTLAR ─────────────────────────────────────────────────────────────

// GET /api/b2b/clients — admin barcha klientlar
router.get("/clients", authenticate, requireRole("super_admin", "shop_owner"), async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT bc.*, u.name as user_name, u.phone as user_phone
      FROM b2b_clients bc
      LEFT JOIN users u ON u.id = bc.user_id
      ORDER BY bc.created_at DESC
    `);
    res.json({ clients: rows.rows });
  } catch (err: any) { console.error('[B2B]', err.message); res.status(500).json({ error: 'Server xatosi' }); }
});

// GET /api/b2b/my-profile — o'z B2B profilim
router.get("/my-profile", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const rows = await db.execute(sql`SELECT * FROM b2b_clients WHERE user_id = ${user.userId} LIMIT 1`);
    res.json({ profile: rows.rows[0] || null });
  } catch (err: any) { console.error('[B2B]', err.message); res.status(500).json({ error: 'Server xatosi' }); }
});

// POST /api/b2b/register — B2B ariza berish
router.post("/register", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { companyName, companyInn, contactPerson, contactPhone, contactEmail, address } = req.body;
    if (!companyName || !contactPerson || !contactPhone) {
      res.status(400).json({ error: "companyName, contactPerson, contactPhone majburiy" });
      return;
    }
    const existing = await db.execute(sql`SELECT id FROM b2b_clients WHERE user_id = ${user.userId} LIMIT 1`);
    if (existing.rows.length) { res.status(409).json({ error: "Siz allaqachon B2B arizasi bergansiz" }); return; }

    const r = await db.execute(sql`
      INSERT INTO b2b_clients (user_id, company_name, company_inn, contact_person, contact_phone, contact_email, address)
      VALUES (${user.userId}, ${companyName}, ${companyInn || null}, ${contactPerson}, ${contactPhone}, ${contactEmail || null}, ${address || null})
      RETURNING *
    `);
    res.status(201).json({ client: r.rows[0], message: "Ariza yuborildi. Admin ko'rib chiqadi." });
  } catch (err: any) { console.error('[B2B]', err.message); res.status(500).json({ error: 'Server xatosi' }); }
});

// PATCH /api/b2b/clients/:id/verify — tasdiqlash (admin)
router.patch("/clients/:id/verify", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const { discountPercent, creditLimit, paymentTermDays } = req.body;
    await db.execute(sql`
      UPDATE b2b_clients SET
        is_verified = TRUE,
        discount_percent = COALESCE(${discountPercent ? Number(discountPercent) : null}, discount_percent),
        credit_limit = COALESCE(${creditLimit ? Number(creditLimit) : null}, credit_limit),
        payment_term_days = COALESCE(${paymentTermDays ? Number(paymentTermDays) : null}, payment_term_days)
      WHERE id = ${Number(req.params.id)}
    `);
    res.json({ success: true });
  } catch (err: any) { console.error('[B2B]', err.message); res.status(500).json({ error: 'Server xatosi' }); }
});

// ── B2B SHARTNOMALAR ──────────────────────────────────────────────────────────

// GET /api/b2b/contracts
router.get("/contracts", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    let cond = sql`1=1`;
    if (user.role === "customer") {
      const client = await db.execute(sql`SELECT id FROM b2b_clients WHERE user_id = ${user.userId} LIMIT 1`);
      if (!client.rows.length) { res.json({ contracts: [] }); return; }
      cond = sql`bc2.client_id = ${(client.rows[0] as any).id}`;
    } else if (user.role === "shop_owner") {
      const shop = await db.execute(sql`SELECT id FROM shops WHERE owner_id = ${user.userId} LIMIT 1`);
      if (!shop.rows.length) { res.json({ contracts: [] }); return; }
      cond = sql`bc2.shop_id = ${(shop.rows[0] as any).id}`;
    }
    const rows = await db.execute(sql`
      SELECT bc2.*, bc.company_name, s.name as shop_name
      FROM b2b_contracts bc2
      LEFT JOIN b2b_clients bc ON bc.id = bc2.client_id
      LEFT JOIN shops s ON s.id = bc2.shop_id
      WHERE ${cond}
      ORDER BY bc2.created_at DESC
    `);
    res.json({ contracts: rows.rows });
  } catch (err: any) { console.error('[B2B]', err.message); res.status(500).json({ error: 'Server xatosi' }); }
});

// POST /api/b2b/contracts — shartnoma tuzish (admin/shop_owner)
router.post("/contracts", authenticate, requireRole("super_admin", "shop_owner"), async (req, res) => {
  try {
    const user = (req as any).user;
    const { clientId, shopId, startDate, endDate, monthlyLimit, discountPercent, toolsAllowed, notes } = req.body;
    if (!clientId || !startDate || !endDate) {
      res.status(400).json({ error: "clientId, startDate, endDate majburiy" });
      return;
    }
    let finalShopId = shopId;
    if (user.role === "shop_owner") {
      const shop = await db.execute(sql`SELECT id FROM shops WHERE owner_id = ${user.userId} LIMIT 1`);
      finalShopId = shop.rows.length ? (shop.rows[0] as any).id : null;
    }
    const contractNumber = `B2B-${Date.now().toString(36).toUpperCase()}`;
    const r = await db.execute(sql`
      INSERT INTO b2b_contracts (client_id, shop_id, contract_number, start_date, end_date, monthly_limit, discount_percent, tools_allowed, notes, signed_at)
      VALUES (${Number(clientId)}, ${finalShopId || null}, ${contractNumber}, ${startDate}, ${endDate}, ${monthlyLimit || null}, ${discountPercent || 0}, ${toolsAllowed ? JSON.stringify(toolsAllowed) : null}::jsonb, ${notes || null}, NOW())
      RETURNING *
    `);
    res.status(201).json({ contract: r.rows[0] });
  } catch (err: any) { console.error('[B2B]', err.message); res.status(500).json({ error: 'Server xatosi' }); }
});

// GET /api/b2b/stats — B2B statistikasi (admin)
router.get("/stats", authenticate, requireRole("super_admin"), async (_req, res) => {
  try {
    const stats = await db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM b2b_clients) as total_clients,
        (SELECT COUNT(*) FROM b2b_clients WHERE is_verified = TRUE) as verified_clients,
        (SELECT COUNT(*) FROM b2b_contracts WHERE status = 'active') as active_contracts,
        (SELECT COALESCE(SUM(monthly_limit), 0) FROM b2b_contracts WHERE status = 'active') as total_monthly_limit
    `);
    res.json({ stats: stats.rows[0] });
  } catch (err: any) { console.error('[B2B]', err.message); res.status(500).json({ error: 'Server xatosi' }); }
});

export default router;
