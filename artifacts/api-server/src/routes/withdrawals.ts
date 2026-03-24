import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate, requireRole } from "../lib/auth.js";
import { getCommissionRate, calcCommission, logCommissionTx } from "../lib/commission.js";

const router = Router();

// ─── Yechib olish so'rovi yaratish (do'kon egasi yoki mijoz) ──────────────────
router.post("/", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const isCustomer = user.role === "customer";
    const isShopOwner = user.role === "shop_owner";
    const isAdmin = user.role === "super_admin";

    if (!isCustomer && !isShopOwner && !isAdmin) {
      res.status(403).json({ error: "Yechib olish uchun ruxsat yo'q" });
      return;
    }

    const { amount, provider, cardNumber, cardHolder, shopId: bodyShopId } = req.body;
    if (!amount || amount <= 0) {
      res.status(400).json({ error: "Miqdor noto'g'ri" });
      return;
    }
    if (!cardNumber) {
      res.status(400).json({ error: "Karta raqami kiritilishi shart" });
      return;
    }

    // shopId — do'kon egalari uchun majburiy, mijozlar uchun null
    let shopId: number | null = null;
    if (isShopOwner || isAdmin) {
      const ownShop = await db.execute(sql`SELECT id FROM shops WHERE owner_id = ${user.userId} LIMIT 1`);
      if (!ownShop.rows.length) {
        res.status(404).json({ error: "Do'kon topilmadi" });
        return;
      }
      const ownShopId = (ownShop.rows[0] as any).id;
      if (bodyShopId && bodyShopId !== ownShopId) {
        res.status(403).json({ error: "Boshqa do'kondan yechib olish taqiqlangan" });
        return;
      }
      shopId = ownShopId;
    }

    // Wallet balansini tekshirish
    const wallet = await db.execute(sql`SELECT * FROM wallets WHERE user_id = ${user.userId} LIMIT 1`);
    if (!wallet.rows.length) {
      res.status(404).json({ error: "Hamyon topilmadi" });
      return;
    }
    const w = wallet.rows[0] as any;

    // ─── Komissiya hisoblash ──────────────────────────────────────────────────
    const commType = isShopOwner ? "withdrawal_shop" : "withdrawal_customer";
    let shopIdForComm: number | null = null;
    if (isShopOwner && shopId) {
      shopIdForComm = shopId;
    }
    const { rate: commRate, isActive: commActive } = await getCommissionRate(commType, shopIdForComm);

    // Min/max olish
    const commSettingRow = await db.$client.query(
      `SELECT min_amount, max_amount FROM commission_settings WHERE type = $1 LIMIT 1`, [commType]
    );
    const minAmt = commSettingRow.rows[0]?.min_amount ?? 0;
    const maxAmt = commSettingRow.rows[0]?.max_amount ?? 0;

    const commissionAmount = commActive ? calcCommission(amount, commRate, minAmt, maxAmt) : 0;
    const totalDeduction = amount + commissionAmount; // foydalanuvchi balansidan yechiladi

    if (w.balance < totalDeduction) {
      const needed = commissionAmount > 0
        ? `${amount.toLocaleString()} UZS + ${commissionAmount.toLocaleString()} UZS komissiya = ${totalDeduction.toLocaleString()} UZS`
        : `${amount.toLocaleString()} UZS`;
      res.status(400).json({ error: `Balans yetarli emas. Kerak: ${needed}. Mavjud: ${Number(w.balance).toLocaleString()} UZS` });
      return;
    }

    // Avvaldan kutayotgan so'rov bormi?
    const pending = await db.execute(sql`
      SELECT id FROM withdrawal_requests WHERE user_id = ${user.userId} AND status = 'pending'
    `);
    if (pending.rows.length) {
      res.status(400).json({ error: "Sizda allaqachon kutayotgan yechib olish so'rovingiz bor" });
      return;
    }

    // Balansdan yechish (komissiya + so'rov summasi escrow ga o'tkazish)
    await db.execute(sql`
      UPDATE wallets SET
        balance = balance - ${totalDeduction},
        escrow_balance = escrow_balance + ${totalDeduction},
        updated_at = NOW()
      WHERE user_id = ${user.userId}
    `);

    // Wallet tranzaksiya yozish
    await db.execute(sql`
      INSERT INTO wallet_transactions (wallet_id, user_id, amount, type, provider, status, description, balance_before, balance_after)
      VALUES (
        ${w.id}, ${user.userId}, ${amount},
        'withdrawal', ${provider || 'payme'}, 'pending',
        ${`Karta yechib olish: ${cardNumber}${commissionAmount > 0 ? ` (${commRate}% komissiya: ${commissionAmount.toLocaleString()} UZS)` : ''}`},
        ${w.balance}, ${w.balance - totalDeduction}
      )
    `);

    // Komissiya logini yozish
    if (commissionAmount > 0) {
      await logCommissionTx({
        type: commType,
        userId: user.userId,
        shopId: shopIdForComm,
        grossAmount: amount,
        commissionRate: commRate,
        commissionAmount,
        description: `Yechib olish komissiyasi: karta ${cardNumber}`,
      });
    }

    // So'rov yaratish (commission_amount ham saqlanadi)
    const result = await db.execute(sql`
      INSERT INTO withdrawal_requests (shop_id, user_id, amount, provider, card_number, card_holder, status)
      VALUES (${shopId}, ${user.userId}, ${amount}, ${provider || 'payme'}, ${cardNumber}, ${cardHolder || ''}, 'pending')
      RETURNING *
    `);

    res.status(201).json({
      request: result.rows[0],
      commissionAmount,
      commissionRate: commRate,
      totalDeduction,
      message: commissionAmount > 0
        ? `Yechib olish so'rovi yuborildi. Komissiya: ${commissionAmount.toLocaleString()} UZS (${commRate}%). Admin tomonidan ko'rib chiqiladi.`
        : "Yechib olish so'rovi yuborildi. Admin tomonidan ko'rib chiqiladi.",
    });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

// ─── Barcha yechib olish so'rovlari (admin) ───────────────────────────────────
router.get("/", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const status = (req.query.status as string) || "";
    const rows = await db.execute(sql`
      SELECT
        wr.*,
        u.name as owner_name,
        u.phone as owner_phone,
        s.name as shop_name,
        w.balance as current_balance
      FROM withdrawal_requests wr
      LEFT JOIN users u ON u.id = wr.user_id
      LEFT JOIN shops s ON s.id = wr.shop_id
      LEFT JOIN wallets w ON w.user_id = wr.user_id
      ${status ? sql`WHERE wr.status = ${status}` : sql``}
      ORDER BY wr.created_at DESC
    `);
    res.json({ requests: rows.rows });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

// ─── Do'kon o'zining so'rovlari ───────────────────────────────────────────────
router.get("/my", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const rows = await db.execute(sql`
      SELECT * FROM withdrawal_requests WHERE user_id = ${user.userId}
      ORDER BY created_at DESC LIMIT 20
    `);
    res.json({ requests: rows.rows });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

// ─── So'rovni tasdiqlash/rad etish (admin) ────────────────────────────────────
router.patch("/:id", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status, adminNote } = req.body;
    if (!["approved", "rejected", "processing"].includes(status)) {
      res.status(400).json({ error: "Status noto'g'ri" });
      return;
    }

    const wr = await db.execute(sql`SELECT * FROM withdrawal_requests WHERE id = ${id} LIMIT 1`);
    if (!wr.rows.length) {
      res.status(404).json({ error: "So'rov topilmadi" });
      return;
    }
    const w = wr.rows[0] as any;

    if (status === "rejected" && w.status === "pending") {
      // Rad etilsa — escrow dan balansga qaytarish
      await db.execute(sql`
        UPDATE wallets SET
          balance = balance + ${w.amount},
          escrow_balance = escrow_balance - ${w.amount},
          updated_at = NOW()
        WHERE user_id = ${w.user_id}
      `);

      // Wallet tranzaksiyani bekor qilish
      await db.execute(sql`
        UPDATE wallet_transactions SET status = 'cancelled'
        WHERE user_id = ${w.user_id} AND type = 'withdrawal' AND status = 'pending'
        ORDER BY created_at DESC LIMIT 1
      `);
    }

    if (status === "approved" && w.status === "pending") {
      // Tasdiqlansa — escrow dan chiqarib yuborish
      await db.execute(sql`
        UPDATE wallets SET
          escrow_balance = escrow_balance - ${w.amount},
          updated_at = NOW()
        WHERE user_id = ${w.user_id}
      `);

      await db.execute(sql`
        UPDATE wallet_transactions SET status = 'completed'
        WHERE user_id = ${w.user_id} AND type = 'withdrawal' AND status = 'pending'
        ORDER BY created_at DESC LIMIT 1
      `);
    }

    await db.execute(sql`
      UPDATE withdrawal_requests SET
        status = ${status},
        admin_note = ${adminNote || null},
        processed_at = ${status !== "processing" ? sql`NOW()` : sql`NULL`}
      WHERE id = ${id}
    `);

    res.json({ success: true, status });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

export default router;
