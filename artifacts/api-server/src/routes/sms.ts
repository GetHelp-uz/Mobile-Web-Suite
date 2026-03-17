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

export default router;
