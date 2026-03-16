/**
 * To'lov webhook handlerlari:
 * - Click: POST /api/pay/click/prepare + /api/pay/click/complete
 * - Payme: POST /api/pay/payme
 * - Paynet: POST /api/pay/paynet/notify
 */
import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// ─── Hamyon balansini yangilash yordamchi funksiya ──────────────────────────
async function confirmWalletTopup(referenceId: string, providerTxId: string) {
  const txRow = await db.execute(sql`
    SELECT * FROM wallet_transactions WHERE reference_id = ${referenceId} AND type = 'topup' LIMIT 1
  `);
  if (!txRow.rows.length) return { success: false, error: "Tranzaksiya topilmadi" };

  const tx = txRow.rows[0] as any;
  if (tx.status === "completed") return { success: true, message: "Allaqachon tasdiqlangan" };

  const wallet = await db.execute(sql`SELECT * FROM wallets WHERE id = ${tx.wallet_id} LIMIT 1`);
  const w = wallet.rows[0] as any;
  const newBalance = (w.balance || 0) + (tx.amount || 0);

  await db.execute(sql`UPDATE wallets SET balance = ${newBalance}, updated_at = NOW() WHERE id = ${w.id}`);
  await db.execute(sql`
    UPDATE wallet_transactions
    SET status = 'completed', provider_tx_id = ${providerTxId}, balance_after = ${newBalance}
    WHERE reference_id = ${referenceId}
  `);

  return { success: true, newBalance, amount: tx.amount };
}

// ─────────────────────────────────────────────────────────────────────────────
//  CLICK
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/pay/click/prepare
router.post("/click/prepare", async (req, res) => {
  try {
    const { click_trans_id, service_id, click_paydoc_id, merchant_trans_id, amount, action, sign_time, sign_string } = req.body;

    const settings = await db.execute(sql`SELECT * FROM payment_settings WHERE provider = 'click' LIMIT 1`);
    const s = settings.rows[0] as any;

    // Imzo tekshirish (test rejimda o'tkazib yuboramiz)
    if (!s?.is_test_mode && s?.secret_key) {
      const expectedSign = crypto.createHash("md5").update(
        `${click_trans_id}${service_id}${s.secret_key}${merchant_trans_id}${amount}${action}${sign_time}`
      ).digest("hex");
      if (expectedSign !== sign_string) {
        res.json({ error: -1, error_note: "SIGN CHECK FAILED" }); return;
      }
    }

    // Tranzaksiya mavjudligini tekshiramiz
    const txRow = await db.execute(sql`
      SELECT * FROM wallet_transactions WHERE reference_id = ${merchant_trans_id} AND type = 'topup' LIMIT 1
    `);

    if (!txRow.rows.length) {
      res.json({ error: -5, error_note: "Transaction not found", click_trans_id, merchant_trans_id, merchant_prepare_id: 0 }); return;
    }
    const tx = txRow.rows[0] as any;

    if (tx.status === "completed") {
      res.json({ error: -4, error_note: "Already paid", click_trans_id, merchant_trans_id, merchant_prepare_id: tx.id }); return;
    }

    res.json({
      click_trans_id,
      merchant_trans_id,
      merchant_prepare_id: tx.id,
      error: 0,
      error_note: "Success",
    });
  } catch (err: any) {
    res.status(500).json({ error: -9, error_note: err.message });
  }
});

// POST /api/pay/click/complete
router.post("/click/complete", async (req, res) => {
  try {
    const { click_trans_id, merchant_trans_id, merchant_prepare_id, amount, error } = req.body;

    if (Number(error) < 0) {
      // To'lov bekor qilindi
      await db.execute(sql`
        UPDATE wallet_transactions SET status = 'failed' WHERE reference_id = ${merchant_trans_id}
      `);
      res.json({ error: 0, error_note: "Success", click_trans_id, merchant_trans_id, merchant_confirm_id: merchant_prepare_id });
      return;
    }

    const result = await confirmWalletTopup(merchant_trans_id, String(click_trans_id));

    res.json({
      click_trans_id,
      merchant_trans_id,
      merchant_confirm_id: merchant_prepare_id,
      error: result.success ? 0 : -9,
      error_note: result.success ? "Success" : result.error,
    });
  } catch (err: any) {
    res.status(500).json({ error: -9, error_note: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  PAYME
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/pay/payme — Payme JSON-RPC API
router.post("/payme", async (req, res) => {
  try {
    const { id, method, params } = req.body;

    const settings = await db.execute(sql`SELECT * FROM payment_settings WHERE provider = 'payme' LIMIT 1`);
    const s = settings.rows[0] as any;

    // Basic Auth tekshirish (test rejimda o'tkazamiz)
    if (!s?.is_test_mode) {
      const auth = req.headers.authorization || "";
      const base64 = auth.replace("Basic ", "");
      const decoded = Buffer.from(base64, "base64").toString();
      const [, key] = decoded.split(":");
      if (key !== s?.secret_key) {
        res.json({ id, error: { code: -32504, message: { uz: "Avtorizatsiya xatosi" } } }); return;
      }
    }

    if (method === "CheckPerformTransaction") {
      const orderId = params?.account?.order_id;
      const txRow = await db.execute(sql`
        SELECT * FROM wallet_transactions WHERE reference_id = ${orderId} AND type = 'topup' LIMIT 1
      `);
      if (!txRow.rows.length) {
        res.json({ id, error: { code: -31050, message: { uz: "Buyurtma topilmadi" } } }); return;
      }
      res.json({ id, result: { allow: true } });
      return;
    }

    if (method === "CreateTransaction") {
      const orderId = params?.account?.order_id;
      const amount = params.amount / 100; // tiyin → so'm
      const txRow = await db.execute(sql`
        SELECT * FROM wallet_transactions WHERE reference_id = ${orderId} AND type = 'topup' LIMIT 1
      `);
      if (!txRow.rows.length) {
        res.json({ id, error: { code: -31050, message: { uz: "Buyurtma topilmadi" } } }); return;
      }
      const tx = txRow.rows[0] as any;
      const createTime = Date.now();

      res.json({
        id,
        result: {
          create_time: createTime,
          transaction: String(tx.id),
          state: 1,
        },
      });
      return;
    }

    if (method === "PerformTransaction") {
      const txId = params.id; // payme transaction id
      // orderId'ni topish
      const txRow = await db.execute(sql`
        SELECT * FROM wallet_transactions WHERE provider = 'payme' AND status = 'pending' ORDER BY created_at DESC LIMIT 1
      `);
      if (!txRow.rows.length) {
        res.json({ id, error: { code: -31003, message: { uz: "Tranzaksiya topilmadi" } } }); return;
      }
      const tx = txRow.rows[0] as any;
      const result = await confirmWalletTopup(tx.reference_id, txId);
      const performTime = Date.now();

      res.json({
        id,
        result: {
          transaction: String(tx.id),
          perform_time: performTime,
          state: result.success ? 2 : -2,
        },
      });
      return;
    }

    if (method === "CancelTransaction") {
      await db.execute(sql`
        UPDATE wallet_transactions SET status = 'failed' WHERE id = ${Number(params.id)} AND status = 'pending'
      `);
      res.json({
        id,
        result: { transaction: params.id, cancel_time: Date.now(), state: -1 },
      });
      return;
    }

    if (method === "CheckTransaction") {
      const txRow = await db.execute(sql`
        SELECT * FROM wallet_transactions WHERE id = ${Number(params.id)} LIMIT 1
      `);
      if (!txRow.rows.length) {
        res.json({ id, error: { code: -31003, message: { uz: "Tranzaksiya topilmadi" } } }); return;
      }
      const tx = txRow.rows[0] as any;
      const stateMap: Record<string, number> = { pending: 1, completed: 2, failed: -1 };
      res.json({
        id,
        result: {
          create_time: new Date(tx.created_at).getTime(),
          perform_time: tx.status === "completed" ? new Date(tx.created_at).getTime() + 60000 : 0,
          cancel_time: tx.status === "failed" ? new Date(tx.created_at).getTime() + 60000 : 0,
          transaction: String(tx.id),
          state: stateMap[tx.status] || 1,
          reason: tx.status === "failed" ? 5 : null,
        },
      });
      return;
    }

    res.json({ id, error: { code: -32601, message: { uz: "Method topilmadi" } } });
  } catch (err: any) {
    res.status(500).json({ error: { code: -32400, message: { uz: err.message } } });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  PAYNET
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/pay/paynet/notify
router.post("/paynet/notify", async (req, res) => {
  try {
    const { orderId, status, transactionId, amount } = req.body;

    if (status === "success" || status === "completed" || status === "2") {
      const result = await confirmWalletTopup(String(orderId), String(transactionId || Date.now()));
      res.json({ success: result.success, message: result.success ? "OK" : result.error });
    } else {
      await db.execute(sql`
        UPDATE wallet_transactions SET status = 'failed' WHERE reference_id = ${String(orderId)} AND status = 'pending'
      `);
      res.json({ success: true, message: "Cancelled" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pay/paynet/check — Paynet order mavjudligini tekshirish
router.post("/paynet/check", async (req, res) => {
  try {
    const { orderId } = req.body;
    const txRow = await db.execute(sql`
      SELECT * FROM wallet_transactions WHERE reference_id = ${String(orderId)} AND type = 'topup' LIMIT 1
    `);
    if (!txRow.rows.length) {
      res.json({ status: 0, message: "Not found" }); return;
    }
    const tx = txRow.rows[0] as any;
    res.json({ status: 1, orderId, amount: tx.amount, message: "OK" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
