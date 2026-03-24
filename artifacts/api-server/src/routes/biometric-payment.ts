import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate } from "../lib/auth.js";
import crypto from "crypto";

const router = Router();

// ── Biometrik to'lov tokenini ro'yxatdan o'tkazish ─────────────────────────
// POST /api/biometric-payment/register
router.post("/register", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { deviceId, paymentLimit = 1000000 } = req.body;

    if (!deviceId || typeof deviceId !== "string" || deviceId.length > 200) {
      res.status(400).json({ error: "deviceId noto'g'ri" });
      return;
    }
    if (paymentLimit < 0 || paymentLimit > 50000000) {
      res.status(400).json({ error: "To'lov limiti 0-50,000,000 oralig'ida bo'lishi kerak" });
      return;
    }

    // Noyob token yaratish
    const biometricToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(biometricToken).digest("hex");

    await db.execute(sql`
      INSERT INTO payment_biometrics (user_id, device_id, biometric_token, payment_limit)
      VALUES (${user.userId}, ${deviceId}, ${tokenHash}, ${paymentLimit})
      ON CONFLICT (user_id) DO UPDATE SET
        device_id = ${deviceId},
        biometric_token = ${tokenHash},
        payment_limit = ${paymentLimit},
        is_enabled = true,
        updated_at = NOW()
    `);

    await db.execute(sql`
      INSERT INTO security_events (user_id, event_type, ip_address, details, severity)
      VALUES (${user.userId}, 'biometric_registered', ${req.ip || 'unknown'},
        ${{ deviceId: deviceId.slice(0, 20) }}::jsonb, 'info')
    `);

    res.json({
      ok: true,
      biometricToken,
      message: "Biometrik to'lov muvaffaqiyatli ro'yxatdan o'tkazildi",
    });
  } catch (err: any) {
    console.error("[Biometric] Register xatosi:", err.message);
    res.status(500).json({ error: "Server xatosi yuz berdi." });
  }
});

// ── Biometrik to'lov tokenini tekshirish ───────────────────────────────────
// POST /api/biometric-payment/verify
router.post("/verify", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { biometricToken, deviceId, amount } = req.body;

    if (!biometricToken || !deviceId) {
      res.status(400).json({ error: "biometricToken va deviceId talab qilinadi" });
      return;
    }

    const tokenHash = crypto.createHash("sha256").update(biometricToken).digest("hex");

    const result = await db.execute(sql`
      SELECT * FROM payment_biometrics
      WHERE user_id = ${user.userId} AND biometric_token = ${tokenHash} AND is_enabled = true
      LIMIT 1
    `);

    if (!result.rows.length) {
      await db.execute(sql`
        INSERT INTO security_events (user_id, event_type, ip_address, details, severity)
        VALUES (${user.userId}, 'biometric_verify_failed', ${req.ip || 'unknown'},
          ${{ deviceId: (deviceId || "").slice(0, 20) }}::jsonb, 'warning')
      `);
      res.status(401).json({ error: "Biometrik token noto'g'ri yoki eskirgan" });
      return;
    }

    const record = result.rows[0] as any;

    if (record.device_id !== deviceId) {
      res.status(401).json({ error: "Qurilma moslashmadi" });
      return;
    }

    if (amount && Number(amount) > Number(record.payment_limit)) {
      res.status(403).json({
        error: `Biometrik to'lov limiti: ${Number(record.payment_limit).toLocaleString("uz-UZ")} so'm`,
        limit: record.payment_limit,
      });
      return;
    }

    // Bir martalik tasdiq tokeni chiqarish (5 daqiqa amal qiladi)
    const confirmToken = crypto.randomBytes(20).toString("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await db.execute(sql`
      INSERT INTO payment_idempotency (idempotency_key, user_id, result, expires_at)
      VALUES (${`biometric_confirm:${confirmToken}`}, ${user.userId},
        ${{ confirmed: true, userId: user.userId, amount, ts: Date.now() }}::jsonb,
        ${expiresAt.toISOString()})
    `);

    res.json({
      ok: true,
      confirmToken,
      expiresAt: expiresAt.toISOString(),
      paymentLimit: record.payment_limit,
    });
  } catch (err: any) {
    console.error("[Biometric] Verify xatosi:", err.message);
    res.status(500).json({ error: "Server xatosi yuz berdi." });
  }
});

// ── Biometrik to'lov holatini ko'rish ───────────────────────────────────────
// GET /api/biometric-payment/status
router.get("/status", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const result = await db.execute(sql`
      SELECT is_enabled, payment_limit, device_id, created_at, updated_at
      FROM payment_biometrics WHERE user_id = ${user.userId} LIMIT 1
    `);

    if (!result.rows.length) {
      res.json({ registered: false });
      return;
    }

    const r = result.rows[0] as any;
    res.json({
      registered: true,
      isEnabled: r.is_enabled,
      paymentLimit: r.payment_limit,
      deviceIdPrefix: (r.device_id || "").slice(0, 8) + "...",
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    });
  } catch (err: any) {
    console.error("[Biometric] Status xatosi:", err.message);
    res.status(500).json({ error: "Server xatosi yuz berdi." });
  }
});

// ── Biometrik to'lovni o'chirish ─────────────────────────────────────────────
// DELETE /api/biometric-payment/revoke
router.delete("/revoke", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    await db.execute(sql`
      UPDATE payment_biometrics SET is_enabled = false, updated_at = NOW()
      WHERE user_id = ${user.userId}
    `);
    await db.execute(sql`
      INSERT INTO security_events (user_id, event_type, ip_address, severity)
      VALUES (${user.userId}, 'biometric_revoked', ${req.ip || 'unknown'}, 'info')
    `);
    res.json({ ok: true, message: "Biometrik to'lov o'chirildi" });
  } catch (err: any) {
    console.error("[Biometric] Revoke xatosi:", err.message);
    res.status(500).json({ error: "Server xatosi yuz berdi." });
  }
});

export default router;
