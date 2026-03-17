import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate, requireRole } from "../lib/auth.js";
import { sendSms, sendOverdueSmsAlerts } from "../lib/sms.js";

const router = Router();

// ─── Sozlamalar ───────────────────────────────────────────────────────────────

// Barcha SMS sozlamalarini olish (admin)
router.get("/settings", authenticate, requireRole("super_admin", "shop_owner"), async (req, res) => {
  try {
    const user = (req as any).user;
    let query;
    if (user.role === "super_admin") {
      query = await db.execute(sql`SELECT id, shop_id, provider, email, sender_id, is_active, token_expires_at, updated_at FROM sms_settings ORDER BY id`);
    } else {
      // Shop owner faqat o'z shopini ko'radi
      query = await db.execute(sql`
        SELECT ss.id, ss.shop_id, ss.provider, ss.email, ss.sender_id, ss.is_active, ss.token_expires_at, ss.updated_at
        FROM sms_settings ss
        JOIN shops s ON s.id = ss.shop_id
        WHERE s.owner_id = ${user.userId} OR ss.shop_id IS NULL
        ORDER BY ss.id
      `);
    }
    res.json({ settings: query.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// SMS sozlamasini yaratish/yangilash
router.post("/settings", authenticate, requireRole("super_admin", "shop_owner"), async (req, res) => {
  try {
    const { shopId, provider = "eskiz", email, password, senderId = "4546", isActive } = req.body;
    const user = (req as any).user;

    // Shop_owner faqat o'z shopini o'zgartira oladi
    if (user.role === "shop_owner" && shopId) {
      const shop = await db.execute(sql`SELECT id FROM shops WHERE id = ${shopId} AND owner_id = ${user.userId}`);
      if (!shop.rows.length) {
        res.status(403).json({ error: "Ruxsat yo'q" });
        return;
      }
    }

    const existing = await db.execute(
      shopId
        ? sql`SELECT id FROM sms_settings WHERE shop_id = ${shopId}`
        : sql`SELECT id FROM sms_settings WHERE shop_id IS NULL`
    );

    if (existing.rows.length) {
      const id = (existing.rows[0] as any).id;
      const updates: string[] = ["provider = $1", "email = $2", "sender_id = $3", "is_active = $4", "updated_at = NOW()"];
      const params: any[] = [provider, email || null, senderId, isActive ?? false];
      if (password) {
        updates.push(`password = $${params.length + 1}`, `token = NULL`, `token_expires_at = NULL`);
        params.push(password);
      }
      params.push(id);
      const { rows } = await db.$client.query(
        `UPDATE sms_settings SET ${updates.join(", ")} WHERE id = $${params.length} RETURNING id, shop_id, provider, email, sender_id, is_active`,
        params
      );
      res.json({ settings: rows[0] });
    } else {
      const { rows } = await db.$client.query(
        `INSERT INTO sms_settings (shop_id, provider, email, password, sender_id, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, shop_id, provider, email, sender_id, is_active`,
        [shopId || null, provider, email || null, password || null, senderId, isActive ?? false]
      );
      res.status(201).json({ settings: rows[0] });
    }
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Token yangilash (Eskiz login)
router.post("/settings/refresh-token", authenticate, requireRole("super_admin", "shop_owner"), async (req, res) => {
  try {
    const { shopId } = req.body;
    const row = shopId
      ? await db.execute(sql`SELECT * FROM sms_settings WHERE shop_id = ${shopId} LIMIT 1`)
      : await db.execute(sql`SELECT * FROM sms_settings WHERE shop_id IS NULL LIMIT 1`);

    const settings = row.rows[0] as any;
    if (!settings?.email || !settings?.password) {
      res.status(400).json({ error: "Email va parol kiritilmagan" });
      return;
    }

    const loginRes = await fetch("https://notify.eskiz.uz/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: settings.email, password: settings.password }),
    });
    const loginData = await loginRes.json() as any;
    const token = loginData?.data?.token;

    if (!token) {
      res.status(400).json({ error: loginData?.message || "Token olinmadi. Email/parolni tekshiring." });
      return;
    }

    const expiresAt = new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString();
    await db.execute(sql`
      UPDATE sms_settings SET token = ${token}, token_expires_at = ${expiresAt}, updated_at = NOW()
      WHERE id = ${settings.id}
    `);
    res.json({ success: true, expiresAt });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Shablonlar ───────────────────────────────────────────────────────────────

router.get("/templates", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    let rows;
    if (user.role === "super_admin") {
      rows = await db.execute(sql`SELECT * FROM sms_templates ORDER BY id`);
    } else {
      rows = await db.execute(sql`
        SELECT st.* FROM sms_templates st
        LEFT JOIN shops s ON s.id = st.shop_id
        WHERE st.shop_id IS NULL OR s.owner_id = ${user.userId}
        ORDER BY st.id
      `);
    }
    res.json({ templates: rows.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/templates", authenticate, requireRole("super_admin", "shop_owner"), async (req, res) => {
  try {
    const { shopId, name, type = "custom", message } = req.body;
    if (!name || !message) {
      res.status(400).json({ error: "Nom va matn kiritilishi shart" });
      return;
    }
    const { rows } = await db.$client.query(
      `INSERT INTO sms_templates (shop_id, name, type, message) VALUES ($1, $2, $3, $4) RETURNING *`,
      [shopId || null, name, type, message]
    );
    res.status(201).json({ template: rows[0] });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.patch("/templates/:id", authenticate, requireRole("super_admin", "shop_owner"), async (req, res) => {
  try {
    const { name, type, message, isActive } = req.body;
    const id = Number(req.params.id);
    const sets: string[] = [];
    const params: any[] = [];
    let i = 1;
    if (name !== undefined) { sets.push(`name = $${i++}`); params.push(name); }
    if (type !== undefined) { sets.push(`type = $${i++}`); params.push(type); }
    if (message !== undefined) { sets.push(`message = $${i++}`); params.push(message); }
    if (isActive !== undefined) { sets.push(`is_active = $${i++}`); params.push(isActive); }
    if (!sets.length) { res.status(400).json({ error: "Hech narsa o'zgartirilmadi" }); return; }
    params.push(id);
    const { rows } = await db.$client.query(`UPDATE sms_templates SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`, params);
    res.json({ template: rows[0] });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/templates/:id", authenticate, requireRole("super_admin", "shop_owner"), async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM sms_templates WHERE id = ${Number(req.params.id)}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── SMS Yuborish ────────────────────────────────────────────────────────────

router.post("/send", authenticate, requireRole("super_admin", "shop_owner"), async (req, res) => {
  try {
    const { phone, message, shopId, rentalId } = req.body;
    if (!phone || !message) {
      res.status(400).json({ error: "Telefon va xabar kiritilishi shart" });
      return;
    }
    const result = await sendSms(phone, message, shopId, rentalId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Ko'p SMS yuborish (bulk)
router.post("/send-bulk", authenticate, requireRole("super_admin", "shop_owner"), async (req, res) => {
  try {
    const { phones, message, shopId } = req.body;
    if (!phones?.length || !message) {
      res.status(400).json({ error: "Telefon raqamlar va xabar kiritilishi shart" });
      return;
    }
    const results = await Promise.allSettled(
      phones.map((phone: string) => sendSms(phone, message, shopId))
    );
    const success = results.filter(r => r.status === "fulfilled" && (r as any).value.success).length;
    res.json({ total: phones.length, success, failed: phones.length - success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── SMS Tarixi ───────────────────────────────────────────────────────────────

router.get("/logs", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    let rows;
    if (user.role === "super_admin") {
      rows = await db.execute(sql`SELECT * FROM sms_logs ORDER BY sent_at DESC LIMIT ${limit} OFFSET ${offset}`);
    } else {
      rows = await db.execute(sql`
        SELECT sl.* FROM sms_logs sl
        JOIN shops s ON s.id = sl.shop_id
        WHERE s.owner_id = ${user.userId}
        ORDER BY sl.sent_at DESC LIMIT ${limit} OFFSET ${offset}
      `);
    }
    res.json({ logs: rows.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Muddati o'tgan ijaralar uchun SMS (manual trigger) ───────────────────────

router.post("/trigger-overdue", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const count = await sendOverdueSmsAlerts();
    res.json({ success: true, sent: count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
