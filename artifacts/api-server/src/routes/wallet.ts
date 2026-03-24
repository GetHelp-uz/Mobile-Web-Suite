import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate } from "../lib/auth.js";
import crypto from "crypto";

const router = Router();

// ─── Hamyon olish yoki yaratish ───────────────────────────────────────────────
async function getOrCreateWallet(userId: number) {
  const existing = await db.execute(sql`SELECT * FROM wallets WHERE user_id = ${userId} LIMIT 1`);
  if (existing.rows.length) return existing.rows[0] as any;
  const created = await db.execute(sql`
    INSERT INTO wallets (user_id, balance, escrow_balance) VALUES (${userId}, 0, 0)
    RETURNING *
  `);
  return created.rows[0] as any;
}

// GET /api/wallet/me
router.get("/me", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const wallet = await getOrCreateWallet(user.userId);
    const txns = await db.execute(sql`
      SELECT * FROM wallet_transactions WHERE user_id = ${user.userId}
      ORDER BY created_at DESC LIMIT 20
    `);
    res.json({ wallet, transactions: txns.rows });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

// GET /api/wallet/transactions
router.get("/transactions", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const limit = Number(req.query.limit) || 30;
    const offset = Number(req.query.offset) || 0;
    const txns = await db.execute(sql`
      SELECT * FROM wallet_transactions WHERE user_id = ${user.userId}
      ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `);
    const total = await db.execute(sql`SELECT COUNT(*) as cnt FROM wallet_transactions WHERE user_id = ${user.userId}`);
    res.json({ transactions: txns.rows, total: Number((total.rows[0] as any).cnt) });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

// POST /api/wallet/topup — to'ldirish so'rovi yaratish
router.post("/topup", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { amount, provider } = req.body;

    if (!amount || amount <= 0) {
      res.status(400).json({ error: "Miqdor noto'g'ri" });
      return;
    }
    if (!["click", "payme", "paynet", "uzum"].includes(provider)) {
      res.status(400).json({ error: "To'lov usuli noto'g'ri" });
      return;
    }

    const wallet = await getOrCreateWallet(user.userId);
    const refId = crypto.randomUUID();

    // Tranzaksiya yaratamiz (pending holatda)
    await db.execute(sql`
      INSERT INTO wallet_transactions (wallet_id, user_id, amount, type, provider, status, reference_id, description, balance_before, balance_after)
      VALUES (${wallet.id}, ${user.userId}, ${Number(amount)}, 'topup', ${provider}, 'pending', ${refId}, ${'Hamyon to\'ldirish: ' + provider}, ${wallet.balance}, ${wallet.balance + Number(amount)})
    `);

    // To'lov URL-larini generatsiya qilamiz
    const encodedAmount = Math.round(Number(amount) * 100); // tiyin
    let paymentUrl = "";

    // DB'dan credentials olish
    const settingsRow = await db.execute(sql`SELECT * FROM payment_settings WHERE provider = ${provider} AND is_active = true LIMIT 1`);
    const pSettings = settingsRow.rows[0] as any;
    const isTest = !pSettings || pSettings.is_test_mode;

    const returnUrl = process.env.APP_URL
      ? `${process.env.APP_URL}/wallet/success`
      : `https://gethelp.uz/wallet/success`;

    if (provider === "click") {
      const serviceId = pSettings?.service_id || process.env.CLICK_SERVICE_ID || "12345";
      const merchantId = pSettings?.merchant_id || process.env.CLICK_MERCHANT_ID || "gethelp";
      const base = isTest ? "https://my.click.uz/services/pay" : "https://my.click.uz/services/pay";
      paymentUrl = `${base}?service_id=${serviceId}&merchant_id=${merchantId}&amount=${amount}&transaction_param=${refId}&return_url=${encodeURIComponent(returnUrl)}`;
    } else if (provider === "payme") {
      const paymeMerchant = pSettings?.merchant_id || process.env.PAYME_MERCHANT_ID || "65f8e5c9e34b2700017e65c9";
      const base64Param = Buffer.from(`m=${paymeMerchant};ac.order_id=${refId};a=${encodedAmount}`).toString("base64");
      const base = isTest ? "https://checkout.paycom.uz" : "https://checkout.paycom.uz";
      paymentUrl = `${base}/${base64Param}`;
    } else if (provider === "paynet") {
      const paynetMerchant = pSettings?.merchant_id || process.env.PAYNET_MERCHANT_ID || "gethelp";
      const serviceId = pSettings?.service_id || process.env.PAYNET_SERVICE_ID || "";
      const base = isTest ? "https://test.paynet.uz/processing/order" : "https://paynet.uz/processing/order";
      paymentUrl = `${base}?merchantId=${paynetMerchant}&orderId=${refId}&amount=${amount}&currency=860&returnUrl=${encodeURIComponent(returnUrl)}${serviceId ? `&serviceId=${serviceId}` : ""}`;
    } else if (provider === "uzum") {
      const uzumMerchant = pSettings?.merchant_id || process.env.UZUM_MERCHANT_ID || "";
      const uzumService = pSettings?.service_id || process.env.UZUM_SERVICE_ID || "";
      const base = isTest
        ? "https://checkout.test.uzum.uz"
        : (pSettings?.api_url || "https://checkout.uzum.uz");
      // Uzum checkout URL formatiga mos
      paymentUrl = uzumMerchant
        ? `${base}/pay?serviceId=${uzumService || uzumMerchant}&orderId=${refId}&amount=${encodedAmount}&returnUrl=${encodeURIComponent(returnUrl)}`
        : "";
    }

    res.json({
      success: true,
      referenceId: refId,
      amount: Number(amount),
      provider,
      paymentUrl,
      message: `${provider.toUpperCase()} orqali ${amount} UZS to'ldirish`,
    });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

// POST /api/wallet/topup/confirm — to'lovni tasdiqlash (test uchun yoki webhook)
router.post("/topup/confirm", authenticate, async (req, res) => {
  try {
    const { referenceId, providerTxId } = req.body;
    if (!referenceId) { res.status(400).json({ error: "referenceId kerak" }); return; }

    const txRow = await db.execute(sql`
      SELECT * FROM wallet_transactions WHERE reference_id = ${referenceId} AND type = 'topup' LIMIT 1
    `);
    if (!txRow.rows.length) { res.status(404).json({ error: "Tranzaksiya topilmadi" }); return; }

    const tx = txRow.rows[0] as any;
    if (tx.status === "completed") { res.json({ success: true, message: "Allaqachon tasdiqlangan" }); return; }

    // Hamyon balansini yangilaymiz
    const wallet = await db.execute(sql`SELECT * FROM wallets WHERE id = ${tx.wallet_id} LIMIT 1`);
    const w = wallet.rows[0] as any;
    const newBalance = (w.balance || 0) + (tx.amount || 0);

    await db.execute(sql`UPDATE wallets SET balance = ${newBalance}, updated_at = NOW() WHERE id = ${w.id}`);
    await db.execute(sql`
      UPDATE wallet_transactions
      SET status = 'completed', provider_tx_id = ${providerTxId || null}, balance_after = ${newBalance}
      WHERE reference_id = ${referenceId}
    `);

    res.json({ success: true, newBalance, amount: tx.amount });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

// POST /api/wallet/pay — hamyondan to'lash
router.post("/pay", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { amount, rentalId, type = "payment", description } = req.body;

    if (!amount || amount <= 0) { res.status(400).json({ error: "Miqdor noto'g'ri" }); return; }

    const wallet = await getOrCreateWallet(user.userId);
    if (wallet.balance < Number(amount)) {
      res.status(400).json({ error: `Hamyon balansi yetarli emas. Balans: ${wallet.balance} UZS, kerak: ${amount} UZS` });
      return;
    }

    const newBalance = wallet.balance - Number(amount);
    await db.execute(sql`UPDATE wallets SET balance = ${newBalance}, updated_at = NOW() WHERE id = ${wallet.id}`);
    await db.execute(sql`
      INSERT INTO wallet_transactions (wallet_id, user_id, rental_id, amount, type, provider, status, description, balance_before, balance_after)
      VALUES (${wallet.id}, ${user.userId}, ${rentalId || null}, ${Number(amount)}, ${type}, 'system', 'completed', ${description || "Hamyondan to'lov"}, ${wallet.balance}, ${newBalance})
    `);

    res.json({ success: true, newBalance, deducted: Number(amount) });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

// POST /api/wallet/deposit-hold — depozitni escrowga o'tkazish
router.post("/deposit-hold", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { amount, rentalId } = req.body;
    if (!amount || !rentalId) { res.status(400).json({ error: "amount va rentalId kerak" }); return; }

    const wallet = await getOrCreateWallet(user.userId);
    if (wallet.balance < Number(amount)) {
      res.status(400).json({ error: "Depozit uchun hamyon balansi yetarli emas" });
      return;
    }

    const newBalance = wallet.balance - Number(amount);
    const newEscrow = wallet.escrow_balance + Number(amount);

    await db.execute(sql`UPDATE wallets SET balance = ${newBalance}, escrow_balance = ${newEscrow}, updated_at = NOW() WHERE id = ${wallet.id}`);
    await db.execute(sql`
      INSERT INTO wallet_transactions (wallet_id, user_id, rental_id, amount, type, provider, status, description, balance_before, balance_after)
      VALUES (${wallet.id}, ${user.userId}, ${rentalId}, ${Number(amount)}, 'deposit_hold', 'system', 'completed', 'Ijara depoziti', ${wallet.balance}, ${newBalance})
    `);

    res.json({ success: true, newBalance, escrowBalance: newEscrow });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

// POST /api/wallet/deposit-release — depozitni qaytarish
router.post("/deposit-release", authenticate, async (req, res) => {
  try {
    const { userId, amount, rentalId, damageCost = 0 } = req.body;
    const targetUserId = userId || (req as any).user.userId;

    const wallet = await getOrCreateWallet(targetUserId);
    const releaseAmount = Math.max(0, Number(amount) - Number(damageCost));
    const newBalance = wallet.balance + releaseAmount;
    const newEscrow = Math.max(0, wallet.escrow_balance - Number(amount));

    await db.execute(sql`UPDATE wallets SET balance = ${newBalance}, escrow_balance = ${newEscrow}, updated_at = NOW() WHERE id = ${wallet.id}`);

    if (releaseAmount > 0) {
      await db.execute(sql`
        INSERT INTO wallet_transactions (wallet_id, user_id, rental_id, amount, type, provider, status, description, balance_before, balance_after)
        VALUES (${wallet.id}, ${targetUserId}, ${rentalId || null}, ${releaseAmount}, 'deposit_release', 'system', 'completed', 'Depozit qaytarildi', ${wallet.balance}, ${newBalance})
      `);
    }
    if (damageCost > 0) {
      await db.execute(sql`
        INSERT INTO wallet_transactions (wallet_id, user_id, rental_id, amount, type, provider, status, description, balance_before, balance_after)
        VALUES (${wallet.id}, ${targetUserId}, ${rentalId || null}, ${Number(damageCost)}, 'deposit_deduct', 'system', 'completed', 'Zarar uchun ushlab qolindi', ${wallet.balance}, ${newBalance})
      `);
    }

    res.json({ success: true, released: releaseAmount, deducted: damageCost, newBalance });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

export { getOrCreateWallet };
export default router;
