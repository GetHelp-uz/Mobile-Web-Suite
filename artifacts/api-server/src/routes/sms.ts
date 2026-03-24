import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate, requireRole } from "../lib/auth.js";
import { sendSms, sendOverdueSmsAlerts, sendReminderSmsAlerts, sendTemplateSms } from "../lib/sms.js";

const router = Router();

// ─── Provayder sozlamalari ────────────────────────────────────────────────────

router.get("/settings", authenticate, requireRole("super_admin", "shop_owner"), async (req, res) => {
  try {
    const user = (req as any).user;
    let rows;
    if (user.role === "super_admin") {
      rows = await db.execute(sql`
        SELECT id, shop_id, provider, label, country, email, api_key, sender_id, is_active, is_global, token_expires_at, updated_at
        FROM sms_settings ORDER BY id
      `);
    } else {
      rows = await db.execute(sql`
        SELECT ss.id, ss.shop_id, ss.provider, ss.label, ss.country, ss.email, ss.api_key, ss.sender_id, ss.is_active, ss.is_global, ss.token_expires_at, ss.updated_at
        FROM sms_settings ss
        LEFT JOIN shops s ON s.id = ss.shop_id
        WHERE s.owner_id = ${user.userId} OR ss.shop_id IS NULL
        ORDER BY ss.id
      `);
    }
    res.json({ settings: rows.rows });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

router.post("/settings", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const { shopId, provider = "eskiz", label, country = "uz", email, password, apiKey, senderId = "4546", isActive, isGlobal } = req.body;

    const existing = await db.execute(
      shopId
        ? sql`SELECT id FROM sms_settings WHERE shop_id = ${shopId} AND provider = ${provider}`
        : sql`SELECT id FROM sms_settings WHERE shop_id IS NULL AND provider = ${provider}`
    );

    if (existing.rows.length) {
      const id = (existing.rows[0] as any).id;
      const updates: string[] = ["label = $1", "country = $2", "email = $3", "api_key = $4", "sender_id = $5", "is_active = $6", "is_global = $7", "updated_at = NOW()"];
      const params: any[] = [label || null, country, email || null, apiKey || null, senderId, isActive ?? false, isGlobal ?? false];
      if (password) {
        updates.push(`password = $${params.length + 1}`, `token = NULL`, `token_expires_at = NULL`);
        params.push(password);
      }
      params.push(id);
      const { rows } = await db.$client.query(
        `UPDATE sms_settings SET ${updates.join(", ")} WHERE id = $${params.length} RETURNING id, shop_id, provider, label, country, email, api_key, sender_id, is_active, is_global`,
        params
      );
      res.json({ settings: rows[0] });
    } else {
      const { rows } = await db.$client.query(
        `INSERT INTO sms_settings (shop_id, provider, label, country, email, password, api_key, sender_id, is_active, is_global)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, shop_id, provider, label, country, email, api_key, sender_id, is_active, is_global`,
        [shopId || null, provider, label || null, country, email || null, password || null, apiKey || null, senderId, isActive ?? false, isGlobal ?? false]
      );
      res.status(201).json({ settings: rows[0] });
    }
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(400).json({ error: "Noto'g'ri so'rov. Qayta urining." });
  }
});

router.delete("/settings/:id", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM sms_settings WHERE id = ${Number(req.params.id)}`);
    res.json({ success: true });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

router.patch("/settings/:id/toggle", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { rows } = await db.$client.query(
      `UPDATE sms_settings SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING id, is_active`,
      [id]
    );
    res.json({ settings: rows[0] });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

router.post("/settings/refresh-token", authenticate, requireRole("super_admin", "shop_owner"), async (req, res) => {
  try {
    const { settingsId } = req.body;
    const row = await db.execute(sql`SELECT * FROM sms_settings WHERE id = ${settingsId} LIMIT 1`);
    const settings = row.rows[0] as any;
    if (!settings) { res.status(404).json({ error: "Sozlama topilmadi" }); return; }
    if (!settings.email || !settings.password) { res.status(400).json({ error: "Email va parol kiritilmagan" }); return; }

    const loginRes = await fetch("https://notify.eskiz.uz/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: settings.email, password: settings.password }),
    });
    const loginData = await loginRes.json() as any;
    const token = loginData?.data?.token;
    if (!token) { res.status(400).json({ error: loginData?.message || "Token olinmadi" }); return; }

    const expiresAt = new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString();
    await db.execute(sql`UPDATE sms_settings SET token = ${token}, token_expires_at = ${expiresAt}, updated_at = NOW() WHERE id = ${settings.id}`);
    res.json({ success: true, expiresAt });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

// ─── Shablonlar ───────────────────────────────────────────────────────────────

router.get("/templates", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { type, lang } = req.query;
    let query = `SELECT * FROM sms_templates WHERE 1=1`;
    const params: any[] = [];
    let i = 1;
    if (user.role !== "super_admin") {
      query += ` AND (shop_id IS NULL OR shop_id IN (SELECT id FROM shops WHERE owner_id = $${i++}))`;
      params.push(user.userId);
    }
    if (type) { query += ` AND type = $${i++}`; params.push(type); }
    if (lang) { query += ` AND lang = $${i++}`; params.push(lang); }
    query += ` ORDER BY type, lang, id`;
    const { rows } = await db.$client.query(query, params);
    res.json({ templates: rows });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

router.post("/templates", authenticate, requireRole("super_admin", "shop_owner"), async (req, res) => {
  try {
    const { shopId, name, type = "custom", lang = "uz", message } = req.body;
    if (!name || !message) { res.status(400).json({ error: "Nom va matn kiritilishi shart" }); return; }
    const { rows } = await db.$client.query(
      `INSERT INTO sms_templates (shop_id, name, type, lang, message) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [shopId || null, name, type, lang, message]
    );
    res.status(201).json({ template: rows[0] });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(400).json({ error: "Noto'g'ri so'rov. Qayta urining." });
  }
});

router.patch("/templates/:id", authenticate, requireRole("super_admin", "shop_owner"), async (req, res) => {
  try {
    const { name, type, lang, message, isActive } = req.body;
    const id = Number(req.params.id);
    const sets: string[] = [];
    const params: any[] = [];
    let i = 1;
    if (name !== undefined) { sets.push(`name = $${i++}`); params.push(name); }
    if (type !== undefined) { sets.push(`type = $${i++}`); params.push(type); }
    if (lang !== undefined) { sets.push(`lang = $${i++}`); params.push(lang); }
    if (message !== undefined) { sets.push(`message = $${i++}`); params.push(message); }
    if (isActive !== undefined) { sets.push(`is_active = $${i++}`); params.push(isActive); }
    if (!sets.length) { res.status(400).json({ error: "Hech narsa o'zgartirilmadi" }); return; }
    params.push(id);
    const { rows } = await db.$client.query(`UPDATE sms_templates SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`, params);
    res.json({ template: rows[0] });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(400).json({ error: "Noto'g'ri so'rov. Qayta urining." });
  }
});

router.delete("/templates/:id", authenticate, requireRole("super_admin", "shop_owner"), async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM sms_templates WHERE id = ${Number(req.params.id)}`);
    res.json({ success: true });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

// ─── SMS Yuborish ─────────────────────────────────────────────────────────────

router.post("/send", authenticate, requireRole("super_admin", "shop_owner"), async (req, res) => {
  try {
    const { phone, message, shopId, rentalId, lang } = req.body;
    if (!phone || !message) { res.status(400).json({ error: "Telefon va xabar kiritilishi shart" }); return; }
    const result = await sendSms(phone, message, { shopId, rentalId, lang });
    res.json(result);
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

router.post("/send-bulk", authenticate, requireRole("super_admin", "shop_owner"), async (req, res) => {
  try {
    const { phones, message, shopId, lang } = req.body;
    if (!phones?.length || !message) { res.status(400).json({ error: "Telefon raqamlar va xabar kiritilishi shart" }); return; }
    const results = await Promise.allSettled(
      phones.map((phone: string) => sendSms(phone, message, { shopId, lang }))
    );
    const success = results.filter(r => r.status === "fulfilled" && (r as any).value.success).length;
    res.json({ total: phones.length, success, failed: phones.length - success });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

// Shablon bilan test SMS yuborish
router.post("/send-template", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const { phone, type, lang = "uz", vars = {} } = req.body;
    if (!phone || !type) { res.status(400).json({ error: "Telefon va shablon turi kiritilishi shart" }); return; }
    const result = await sendTemplateSms(phone, type, vars, { lang });
    res.json(result);
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

// ─── SMS Tarixi ───────────────────────────────────────────────────────────────

router.get("/logs", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const limit = Number(req.query.limit) || 100;
    const offset = Number(req.query.offset) || 0;
    const status = req.query.status as string;
    const templateType = req.query.templateType as string;

    let query = `SELECT * FROM sms_logs WHERE 1=1`;
    const params: any[] = [];
    let i = 1;

    if (user.role !== "super_admin") {
      query += ` AND shop_id IN (SELECT id FROM shops WHERE owner_id = $${i++})`;
      params.push(user.userId);
    }
    if (status) { query += ` AND status = $${i++}`; params.push(status); }
    if (templateType) { query += ` AND template_type = $${i++}`; params.push(templateType); }
    query += ` ORDER BY sent_at DESC LIMIT $${i++} OFFSET $${i++}`;
    params.push(limit, offset);

    const { rows } = await db.$client.query(query, params);
    res.json({ logs: rows });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

// ─── Statistika ───────────────────────────────────────────────────────────────

router.get("/stats", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const stats = await db.execute(sql`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'sent') AS sent,
        COUNT(*) FILTER (WHERE status = 'failed') AS failed,
        COUNT(*) FILTER (WHERE sent_at > NOW() - INTERVAL '24 hours') AS today,
        COUNT(*) FILTER (WHERE sent_at > NOW() - INTERVAL '7 days') AS week,
        COUNT(*) FILTER (WHERE sent_at > NOW() - INTERVAL '30 days') AS month
      FROM sms_logs
    `);
    const byType = await db.execute(sql`
      SELECT template_type, COUNT(*) AS cnt, COUNT(*) FILTER (WHERE status = 'sent') AS sent
      FROM sms_logs WHERE template_type IS NOT NULL
      GROUP BY template_type ORDER BY cnt DESC
    `);
    const byProvider = await db.execute(sql`
      SELECT provider, COUNT(*) AS cnt, COUNT(*) FILTER (WHERE status = 'sent') AS sent
      FROM sms_logs GROUP BY provider ORDER BY cnt DESC
    `);
    res.json({ stats: stats.rows[0], byType: byType.rows, byProvider: byProvider.rows });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

// ─── Avtomatik triggerlar ─────────────────────────────────────────────────────

router.post("/trigger-overdue", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const count = await sendOverdueSmsAlerts();
    res.json({ success: true, sent: count, type: "overdue" });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

router.post("/trigger-reminder", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const count = await sendReminderSmsAlerts();
    res.json({ success: true, sent: count, type: "reminder" });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

// ─── SMS Paket rejalari (admin) ─────────────────────────────────────────────

async function ensureSmsPackageTables() {
  try {
    await db.$client.query(`
      CREATE TABLE IF NOT EXISTS sms_packages (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        name_uz VARCHAR(100),
        sms_count INTEGER NOT NULL DEFAULT 100,
        price_monthly INTEGER NOT NULL DEFAULT 50000,
        price_per_sms INTEGER NOT NULL DEFAULT 500,
        is_active BOOLEAN DEFAULT TRUE,
        features JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS shop_sms_subscriptions (
        id SERIAL PRIMARY KEY,
        shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        package_id INTEGER REFERENCES sms_packages(id),
        is_enabled BOOLEAN DEFAULT FALSE,
        sms_used INTEGER DEFAULT 0,
        sms_limit INTEGER DEFAULT 0,
        expires_at TIMESTAMPTZ,
        activated_at TIMESTAMPTZ,
        activated_by INTEGER,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(shop_id)
      );
      INSERT INTO sms_packages (name, name_uz, sms_count, price_monthly, price_per_sms, features)
      SELECT 'Boshlangich', 'Boshlang''ich', 100, 50000, 500, '["100 ta SMS/oy", "Asosiy shablonlar", "SMS tarixi"]'
      WHERE NOT EXISTS (SELECT 1 FROM sms_packages WHERE name = 'Boshlangich');
      INSERT INTO sms_packages (name, name_uz, sms_count, price_monthly, price_per_sms, features)
      SELECT 'Professional', 'Professional', 500, 150000, 300, '["500 ta SMS/oy", "Barcha shablonlar", "Tahlil va hisobotlar"]'
      WHERE NOT EXISTS (SELECT 1 FROM sms_packages WHERE name = 'Professional');
      INSERT INTO sms_packages (name, name_uz, sms_count, price_monthly, price_per_sms, features)
      SELECT 'Biznes', 'Biznes', 2000, 400000, 200, '["2000 ta SMS/oy", "Maxsus shablonlar", "API kirish"]'
      WHERE NOT EXISTS (SELECT 1 FROM sms_packages WHERE name = 'Biznes');
    `);
  } catch (e: any) { console.error('[SMS Tables]', e.message); }
}
ensureSmsPackageTables();

// GET /api/sms/packages — barcha paketlar
router.get("/packages", authenticate, async (_req, res) => {
  try {
    const { rows } = await db.$client.query(`SELECT * FROM sms_packages ORDER BY price_monthly ASC`);
    res.json({ packages: rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/sms/packages — yangi paket yaratish (admin)
router.post("/packages", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const { name, nameUz, smsCount, priceMonthly, pricePerSms, features } = req.body;
    const { rows } = await db.$client.query(
      `INSERT INTO sms_packages (name, name_uz, sms_count, price_monthly, price_per_sms, features)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, nameUz || null, smsCount || 100, priceMonthly || 50000, pricePerSms || 500, JSON.stringify(features || [])]
    );
    res.status(201).json({ package: rows[0] });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// PATCH /api/sms/packages/:id — paket yangilash (admin)
router.patch("/packages/:id", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, nameUz, smsCount, priceMonthly, pricePerSms, features, isActive } = req.body;
    const { rows } = await db.$client.query(
      `UPDATE sms_packages SET
        name = COALESCE($1, name),
        name_uz = COALESCE($2, name_uz),
        sms_count = COALESCE($3, sms_count),
        price_monthly = COALESCE($4, price_monthly),
        price_per_sms = COALESCE($5, price_per_sms),
        features = COALESCE($6, features),
        is_active = COALESCE($7, is_active)
       WHERE id = $8 RETURNING *`,
      [name || null, nameUz || null, smsCount || null, priceMonthly || null, pricePerSms || null,
       features ? JSON.stringify(features) : null, isActive !== undefined ? isActive : null, id]
    );
    res.json({ package: rows[0] });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// DELETE /api/sms/packages/:id
router.delete("/packages/:id", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    await db.$client.query(`DELETE FROM sms_packages WHERE id = $1`, [Number(req.params.id)]);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Do'kon SMS obunalari ─────────────────────────────────────────────────────

// GET /api/sms/shop-subscriptions — do'kon SMS obunalari ro'yxati
router.get("/shop-subscriptions", authenticate, requireRole("super_admin"), async (_req, res) => {
  try {
    const { rows } = await db.$client.query(`
      SELECT s.id as shop_id, s.name as shop_name, s.owner_id,
        u.name as owner_name, u.phone as owner_phone,
        sub.id as sub_id, sub.is_enabled, sub.sms_used, sub.sms_limit, sub.expires_at, sub.activated_at, sub.package_id, sub.notes,
        pkg.name as package_name, pkg.sms_count, pkg.price_monthly
      FROM shops s
      LEFT JOIN users u ON u.id = s.owner_id
      LEFT JOIN shop_sms_subscriptions sub ON sub.shop_id = s.id
      LEFT JOIN sms_packages pkg ON pkg.id = sub.package_id
      ORDER BY s.name ASC
    `);
    res.json({ subscriptions: rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/sms/shop-subscriptions — do'konga SMS ulash/yangilash
router.post("/shop-subscriptions", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const user = (req as any).user;
    const { shopId, packageId, isEnabled, smsLimit, expiresAt, notes } = req.body;
    if (!shopId) { res.status(400).json({ error: "shopId kerak" }); return; }
    const { rows } = await db.$client.query(`
      INSERT INTO shop_sms_subscriptions (shop_id, package_id, is_enabled, sms_limit, expires_at, activated_at, activated_by, notes)
      VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)
      ON CONFLICT (shop_id) DO UPDATE SET
        package_id = EXCLUDED.package_id,
        is_enabled = EXCLUDED.is_enabled,
        sms_limit = EXCLUDED.sms_limit,
        expires_at = EXCLUDED.expires_at,
        activated_at = CASE WHEN EXCLUDED.is_enabled THEN NOW() ELSE shop_sms_subscriptions.activated_at END,
        activated_by = $6,
        notes = EXCLUDED.notes,
        updated_at = NOW()
      RETURNING *
    `, [shopId, packageId || null, isEnabled ?? false, smsLimit || 0, expiresAt || null, user.userId, notes || null]);
    res.json({ subscription: rows[0] });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// PATCH /api/sms/shop-subscriptions/:shopId/toggle — do'kon SMS yoqish/o'chirish
router.patch("/shop-subscriptions/:shopId/toggle", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const shopId = Number(req.params.shopId);
    const { rows } = await db.$client.query(`
      INSERT INTO shop_sms_subscriptions (shop_id, is_enabled)
      VALUES ($1, TRUE)
      ON CONFLICT (shop_id) DO UPDATE SET is_enabled = NOT shop_sms_subscriptions.is_enabled, updated_at = NOW()
      RETURNING *
    `, [shopId]);
    res.json({ subscription: rows[0] });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
