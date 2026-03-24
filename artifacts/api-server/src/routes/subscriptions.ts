import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate, requireRole } from "../lib/auth.js";

const router = Router();

// GET /api/subscriptions/plans — barcha obuna rejalari
router.get("/plans", async (_req, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM subscription_plans WHERE is_active = TRUE ORDER BY price ASC`);
    res.json({ plans: rows.rows });
  } catch (err: any) { console.error('[Subs]', err.message); res.status(500).json({ error: 'Server xatosi' }); }
});

// GET /api/subscriptions/my — o'z obunalarim
router.get("/my", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const rows = await db.execute(sql`
      SELECT s.*, sp.name as plan_name, sp.max_tools, sp.max_workers, sp.features, sp.price as plan_price
      FROM subscriptions s
      LEFT JOIN subscription_plans sp ON sp.id = s.plan_id
      WHERE s.user_id = ${user.userId}
      ORDER BY s.created_at DESC
      LIMIT 10
    `);
    const active = rows.rows.find((r: any) => r.status === 'active' && new Date(r.expires_at) > new Date());
    res.json({ subscriptions: rows.rows, active: active || null });
  } catch (err: any) { console.error('[Subs]', err.message); res.status(500).json({ error: 'Server xatosi' }); }
});

// POST /api/subscriptions/subscribe — obunaga yozilish
router.post("/subscribe", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { planId, shopId, paymentMethod, autoRenew } = req.body;
    if (!planId) { res.status(400).json({ error: "planId majburiy" }); return; }

    const plan = await db.execute(sql`SELECT * FROM subscription_plans WHERE id = ${Number(planId)} AND is_active = TRUE LIMIT 1`);
    if (!plan.rows.length) { res.status(404).json({ error: "Reja topilmadi" }); return; }
    const p = plan.rows[0] as any;

    // Aktiv obuna bormi?
    const existing = await db.execute(sql`
      SELECT id FROM subscriptions WHERE user_id = ${user.userId} AND status = 'active' AND expires_at > NOW() LIMIT 1
    `);
    if (existing.rows.length) { res.status(409).json({ error: "Sizda aktiv obuna mavjud" }); return; }

    // Hamyon tekshiruvi
    const wallet = await db.execute(sql`SELECT balance FROM wallets WHERE user_id = ${user.userId} LIMIT 1`);
    if (!wallet.rows.length || Number((wallet.rows[0] as any).balance) < Number(p.price)) {
      res.status(400).json({ error: `Balans yetarli emas. Kerak: ${Number(p.price).toLocaleString()} UZS` });
      return;
    }

    // To'lov
    await db.execute(sql`UPDATE wallets SET balance = balance - ${Number(p.price)} WHERE user_id = ${user.userId}`);
    await db.execute(sql`
      INSERT INTO wallet_transactions (user_id, type, amount, status, description)
      VALUES (${user.userId}, 'debit', ${Number(p.price)}, 'completed', ${'Obuna: ' + p.name})
    `);

    const durationDays = p.duration_days || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    const sub = await db.execute(sql`
      INSERT INTO subscriptions (user_id, plan_id, shop_id, status, expires_at, auto_renew, payment_method)
      VALUES (${user.userId}, ${Number(planId)}, ${shopId || null}, 'active', ${expiresAt.toISOString()}, ${autoRenew || false}, ${paymentMethod || 'wallet'})
      RETURNING *
    `);
    res.status(201).json({ subscription: sub.rows[0], plan: p, message: "Obunaga muvaffaqiyatli yozildingiz!" });
  } catch (err: any) { console.error('[Subs]', err.message); res.status(500).json({ error: 'Server xatosi' }); }
});

// POST /api/subscriptions/cancel — bekor qilish
router.post("/cancel", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    await db.execute(sql`
      UPDATE subscriptions SET status = 'cancelled', auto_renew = FALSE
      WHERE user_id = ${user.userId} AND status = 'active'
    `);
    res.json({ success: true, message: "Obuna bekor qilindi" });
  } catch (err: any) { console.error('[Subs]', err.message); res.status(500).json({ error: 'Server xatosi' }); }
});

// Admin: barcha obunalar
router.get("/all", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT s.*, u.name as user_name, u.phone as user_phone, sp.name as plan_name
      FROM subscriptions s
      LEFT JOIN users u ON u.id = s.user_id
      LEFT JOIN subscription_plans sp ON sp.id = s.plan_id
      ORDER BY s.created_at DESC LIMIT 100
    `);
    const stats = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status='active') as active_count,
        COUNT(*) FILTER (WHERE status='cancelled') as cancelled_count,
        COALESCE(SUM(sp2.price) FILTER (WHERE s2.status='active'), 0) as monthly_revenue
      FROM subscriptions s2
      LEFT JOIN subscription_plans sp2 ON sp2.id = s2.plan_id
    `);
    res.json({ subscriptions: rows.rows, stats: stats.rows[0] });
  } catch (err: any) { console.error('[Subs]', err.message); res.status(500).json({ error: 'Server xatosi' }); }
});

export default router;
