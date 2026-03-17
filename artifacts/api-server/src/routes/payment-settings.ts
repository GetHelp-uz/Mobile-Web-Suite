import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate, requireRole } from "../lib/auth.js";

const router = Router();

// ─── System-wide credentials yordamchi funksiya ──────────────────────────────
export async function getProviderSettings(provider: string) {
  const res = await db.execute(sql`
    SELECT * FROM payment_settings WHERE provider = ${provider} LIMIT 1
  `);
  return res.rows[0] as any | null;
}

// GET /api/payment-settings — barcha to'lov provayderlar (admin)
router.get("/", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM payment_settings ORDER BY provider`);
    // secret_key'ni mask qilib qaytaramiz
    const masked = (rows.rows as any[]).map(r => ({
      ...r,
      secret_key: r.secret_key ? "•".repeat(Math.min(r.secret_key.length, 8)) + r.secret_key.slice(-4) : "",
    }));
    res.json(masked);
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

// GET /api/payment-settings/:provider — bitta provayderning sozlamalari (admin)
router.get("/:provider", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const { provider } = req.params;
    const row = await db.execute(sql`SELECT * FROM payment_settings WHERE provider = ${provider} LIMIT 1`);
    if (!row.rows.length) { res.status(404).json({ error: "Provayder topilmadi" }); return; }
    const r = row.rows[0] as any;
    res.json(r);
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

// PUT /api/payment-settings/:provider — to'lov provayderini yangilash (admin)
router.put("/:provider", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const { provider } = req.params;
    const user = (req as any).user;
    const { merchant_id, secret_key, service_id, api_url, is_active, is_test_mode } = req.body;

    const existing = await db.execute(sql`SELECT id FROM payment_settings WHERE provider = ${provider} LIMIT 1`);
    if (!existing.rows.length) { res.status(404).json({ error: "Provayder topilmadi" }); return; }

    const hasNewSecret = !!(secret_key && !String(secret_key).includes("•"));

    // Step-by-step updates (each field individually — avoids drizzle nested sql issues)
    await db.execute(sql`
      UPDATE payment_settings SET
        merchant_id  = ${merchant_id !== undefined ? String(merchant_id) : ""},
        service_id   = ${service_id !== undefined ? String(service_id) : ""},
        is_active    = ${is_active !== undefined ? Boolean(is_active) : true},
        is_test_mode = ${is_test_mode !== undefined ? Boolean(is_test_mode) : true},
        api_url      = ${api_url !== undefined ? String(api_url) : ""},
        updated_at   = NOW(),
        updated_by   = ${user.userId}
      WHERE provider = ${provider}
    `);
    if (hasNewSecret) {
      await db.execute(sql`UPDATE payment_settings SET secret_key = ${String(secret_key)} WHERE provider = ${provider}`);
    }

    const updated = await db.execute(sql`SELECT * FROM payment_settings WHERE provider = ${provider} LIMIT 1`);
    const r = updated.rows[0] as any;
    res.json({ success: true, setting: { ...r, secret_key: r.secret_key ? "•".repeat(4) + r.secret_key.slice(-4) : "" } });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

// GET /api/payment-settings/shop/:shopId — do'kon Paynet sozlamalari
router.get("/shop/:shopId", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const shopId = Number(req.params.shopId);

    // Faqat o'z do'koni yoki admin
    if (user.role !== "super_admin") {
      const shop = await db.execute(sql`SELECT owner_id FROM shops WHERE id = ${shopId} LIMIT 1`);
      if (!shop.rows.length || (shop.rows[0] as any).owner_id !== user.userId) {
        res.status(403).json({ error: "Ruxsat yo'q" }); return;
      }
    }

    const rows = await db.execute(sql`
      SELECT * FROM shop_payment_settings WHERE shop_id = ${shopId} ORDER BY provider
    `);
    const masked = (rows.rows as any[]).map(r => ({
      ...r,
      secret_key: r.secret_key ? "•".repeat(4) + r.secret_key.slice(-4) : "",
    }));
    res.json(masked);
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

// PUT /api/payment-settings/shop/:shopId — do'kon to'lov sozlamalarini yangilash
router.put("/shop/:shopId", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const shopId = Number(req.params.shopId);

    if (user.role !== "super_admin") {
      const shop = await db.execute(sql`SELECT owner_id FROM shops WHERE id = ${shopId} LIMIT 1`);
      if (!shop.rows.length || (shop.rows[0] as any).owner_id !== user.userId) {
        res.status(403).json({ error: "Ruxsat yo'q" }); return;
      }
    }

    const { provider = "paynet", merchant_id, secret_key, service_id, is_active, is_test_mode } = req.body;

    await db.execute(sql`
      INSERT INTO shop_payment_settings (shop_id, provider, merchant_id, secret_key, service_id, is_active, is_test_mode, updated_at)
      VALUES (${shopId}, ${provider}, ${merchant_id || null}, ${secret_key || null}, ${service_id || null}, ${is_active ?? false}, ${is_test_mode ?? true}, NOW())
      ON CONFLICT (shop_id, provider) DO UPDATE SET
        merchant_id  = EXCLUDED.merchant_id,
        secret_key   = CASE WHEN EXCLUDED.secret_key IS NOT NULL AND EXCLUDED.secret_key NOT LIKE '%•%' THEN EXCLUDED.secret_key ELSE shop_payment_settings.secret_key END,
        service_id   = EXCLUDED.service_id,
        is_active    = EXCLUDED.is_active,
        is_test_mode = EXCLUDED.is_test_mode,
        updated_at   = NOW()
    `);

    res.json({ success: true, message: "Do'kon to'lov sozlamalari saqlandi" });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

// POST /api/payment-settings/test — to'lov ulanishini test qilish
router.post("/test", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const { provider } = req.body;
    const s = await getProviderSettings(provider);

    if (!s || !s.merchant_id) {
      res.json({ success: false, message: `${provider.toUpperCase()} sozlanmagan (merchant_id bo'sh)` });
      return;
    }

    // Haqiqiy API test emas — credentials mavjudligini tekshirish
    const checks: string[] = [];
    if (s.merchant_id) checks.push("merchant_id: ✓");
    if (s.secret_key) checks.push("secret_key: ✓");
    if (s.service_id) checks.push("service_id: ✓");

    res.json({
      success: checks.length >= 2,
      provider,
      isTestMode: s.is_test_mode,
      checks,
      message: checks.length >= 2
        ? `${provider.toUpperCase()} sozlangan (${s.is_test_mode ? "test rejim" : "jonli rejim"})`
        : `${provider.toUpperCase()} to'liq sozlanmagan`,
    });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

export default router;
