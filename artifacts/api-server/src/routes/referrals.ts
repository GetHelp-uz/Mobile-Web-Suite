import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate } from "../lib/auth.js";
import { getOrCreateWallet } from "./wallet.js";

const router = Router();

const REFERRAL_BONUS = 20000; // 20,000 UZS bonus

// GET /api/referrals/my — o'z referal ma'lumotlari
router.get("/my", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const me = await db.execute(sql`SELECT id, name, referral_code, referred_by FROM users WHERE id = ${user.userId} LIMIT 1`);
    const myUser = me.rows[0] as any;

    const rewards = await db.execute(sql`
      SELECT r.*, u.name as referred_name
      FROM referral_rewards r
      LEFT JOIN users u ON u.id = r.referred_id
      WHERE r.referrer_id = ${user.userId}
      ORDER BY r.created_at DESC
    `);

    const totalEarned = rewards.rows
      .filter((r: any) => r.status === "paid")
      .reduce((s: number, r: any) => s + r.amount, 0);

    res.json({
      referralCode: myUser?.referral_code,
      rewards: rewards.rows,
      totalEarned,
      pendingCount: rewards.rows.filter((r: any) => r.status === "pending").length,
    });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// POST /api/referrals/apply — referal kodni qo'llash (ro'yxatdan o'tishda)
router.post("/apply", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { referralCode } = req.body;
    if (!referralCode) { res.status(400).json({ error: "referralCode kerak" }); return; }

    // Taklif qiluvchini topish
    const referrer = await db.execute(sql`SELECT id, name FROM users WHERE referral_code = ${referralCode} LIMIT 1`);
    if (!referrer.rows.length) { res.status(404).json({ error: "Referal kod topilmadi" }); return; }

    const referrerId = (referrer.rows[0] as any).id;
    if (referrerId === user.userId) { res.status(400).json({ error: "O'z referal kodingizni ishlata olmaysiz" }); return; }

    // Allaqachon referal bor?
    const me = await db.execute(sql`SELECT referred_by FROM users WHERE id = ${user.userId} LIMIT 1`);
    if ((me.rows[0] as any)?.referred_by) { res.status(400).json({ error: "Siz allaqachon referal koddan foydalangansiz" }); return; }

    // Foydalanuvchini yangilash
    await db.execute(sql`UPDATE users SET referred_by = ${referrerId} WHERE id = ${user.userId}`);

    // Mukofot yozuvi yaratish
    await db.execute(sql`
      INSERT INTO referral_rewards (referrer_id, referred_id, amount, status)
      VALUES (${referrerId}, ${user.userId}, ${REFERRAL_BONUS}, 'pending')
    `);

    res.json({ success: true, message: `${(referrer.rows[0] as any).name} taklif kodi qo'llanildi!` });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// POST /api/referrals/reward/:id/pay — bonusni hamyonga o'tkazish (admin)
router.post("/reward/:id/pay", authenticate, async (req, res) => {
  try {
    const reward = await db.execute(sql`SELECT * FROM referral_rewards WHERE id = ${Number(req.params.id)} LIMIT 1`);
    if (!reward.rows.length) { res.status(404).json({ error: "Mukofot topilmadi" }); return; }
    const r = reward.rows[0] as any;
    if (r.status === "paid") { res.json({ success: true, message: "Allaqachon to'langan" }); return; }

    // Hamyonga qo'shish
    const wallet = await getOrCreateWallet(r.referrer_id);
    const newBalance = wallet.balance + r.amount;
    await db.execute(sql`UPDATE wallets SET balance = ${newBalance} WHERE id = ${wallet.id}`);
    await db.execute(sql`
      INSERT INTO wallet_transactions (wallet_id, user_id, amount, type, provider, status, description, balance_before, balance_after)
      VALUES (${wallet.id}, ${r.referrer_id}, ${r.amount}, 'topup', 'system', 'completed', 'Referal bonus', ${wallet.balance}, ${newBalance})
    `);
    await db.execute(sql`UPDATE referral_rewards SET status = 'paid', paid_at = NOW() WHERE id = ${Number(req.params.id)}`);

    res.json({ success: true, paidAmount: r.amount });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// GET /api/referrals/leaderboard — top referralchilar
router.get("/leaderboard", async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT u.id, u.name, u.referral_code,
             COUNT(r.id)::int as total_referrals,
             SUM(CASE WHEN r.status = 'paid' THEN r.amount ELSE 0 END)::real as total_earned
      FROM users u
      LEFT JOIN referral_rewards r ON r.referrer_id = u.id
      GROUP BY u.id, u.name, u.referral_code
      HAVING COUNT(r.id) > 0
      ORDER BY total_referrals DESC
      LIMIT 20
    `);
    res.json({ leaderboard: rows.rows });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

export default router;
