import { Router } from "express";
import { db, pool } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate, requireRole } from "../lib/auth.js";

const router = Router();

interface WalletRow {
  id: number;
  user_id: number;
  balance: number;
  escrow_balance: number;
}

interface FundRow {
  id: number;
  name: string;
  description: string | null;
  tool_type: string;
  shop_id: number | null;
  target_amount: number;
  collected_amount: number;
  annual_return_rate: number;
  duration_months: number;
  min_investment: number;
  status: string;
  start_date: string;
  end_date: string | null;
  created_by: number;
}

interface InvestmentRow {
  id: number;
  fund_id: number;
  user_id: number;
  amount: number;
  share_percent: number;
  earned_amount: number;
  status: string;
  invested_at: string;
  returned_at: string | null;
}

type FundStatus = "active" | "closed" | "matured" | "cancelled";

const VALID_FUND_STATUSES: readonly FundStatus[] = ["active", "closed", "matured", "cancelled"];

function isFundStatus(v: string): v is FundStatus {
  return (VALID_FUND_STATUSES as readonly string[]).includes(v);
}

// ─── Hamyon olish yoki yaratish ───────────────────────────────────────────────
async function getOrCreateWallet(userId: number): Promise<WalletRow> {
  const existing = await db.execute(sql`SELECT * FROM wallets WHERE user_id = ${userId} LIMIT 1`);
  if (existing.rows.length) return existing.rows[0] as unknown as WalletRow;
  const created = await db.execute(sql`
    INSERT INTO wallets (user_id, balance, escrow_balance) VALUES (${userId}, 0, 0)
    RETURNING *
  `);
  return created.rows[0] as unknown as WalletRow;
}

// ─── GET /api/funds — barcha faol fondlar (autentifikatsiya kerak) ────────────
router.get("/", authenticate, async (req, res) => {
  try {
    const authUser = (req as unknown as { user: { userId: number; role: string } }).user;
    const rawStatus = (req.query.status as string) || "active";
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    // Non-admins always see only active funds; admins can filter by validated enum value
    const isAdmin = authUser.role === "super_admin";
    const showAll = isAdmin && rawStatus === "all";
    const statusFilter: FundStatus = (isAdmin && isFundStatus(rawStatus)) ? rawStatus : "active";

    const funds = await db.execute(
      showAll
        ? sql`
            SELECT
              f.*,
              s.name as shop_name,
              s.address as shop_address,
              COALESCE(inv_count.count, 0) as investor_count
            FROM investment_funds f
            LEFT JOIN shops s ON f.shop_id = s.id
            LEFT JOIN (
              SELECT fund_id, COUNT(*) as count
              FROM user_investments
              WHERE status = 'active'
              GROUP BY fund_id
            ) inv_count ON inv_count.fund_id = f.id
            ORDER BY f.created_at DESC
            LIMIT ${limit} OFFSET ${offset}
          `
        : sql`
            SELECT
              f.*,
              s.name as shop_name,
              s.address as shop_address,
              COALESCE(inv_count.count, 0) as investor_count
            FROM investment_funds f
            LEFT JOIN shops s ON f.shop_id = s.id
            LEFT JOIN (
              SELECT fund_id, COUNT(*) as count
              FROM user_investments
              WHERE status = 'active'
              GROUP BY fund_id
            ) inv_count ON inv_count.fund_id = f.id
            WHERE f.status = ${statusFilter}
            ORDER BY f.created_at DESC
            LIMIT ${limit} OFFSET ${offset}
          `
    );

    const totalResult = await db.execute(
      showAll
        ? sql`SELECT COUNT(*) as total FROM investment_funds`
        : sql`SELECT COUNT(*) as total FROM investment_funds WHERE status = ${statusFilter}`
    );
    const total = Number((totalResult.rows[0] as { total: string }).total);

    res.json({
      funds: funds.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Funds GET]", message);
    res.status(500).json({ error: "Server xatosi yuz berdi. Qayta urining." });
  }
});

// ─── GET /api/funds/my — foydalanuvchi investitsiyalari ──────────────────────
router.get("/my", authenticate, async (req, res) => {
  try {
    const authUser = (req as unknown as { user: { userId: number } }).user;

    const investments = await db.execute(sql`
      SELECT
        ui.*,
        f.name as fund_name,
        f.tool_type,
        f.annual_return_rate,
        f.duration_months,
        f.status as fund_status,
        f.target_amount,
        f.collected_amount
      FROM user_investments ui
      JOIN investment_funds f ON ui.fund_id = f.id
      WHERE ui.user_id = ${authUser.userId}
      ORDER BY ui.invested_at DESC
    `);

    const typedInvestments = investments.rows as unknown as InvestmentRow[];
    const totalInvested = typedInvestments.reduce(
      (sum: number, inv: InvestmentRow) => sum + Number(inv.amount),
      0
    );
    const totalEarned = typedInvestments.reduce(
      (sum: number, inv: InvestmentRow) => sum + Number(inv.earned_amount),
      0
    );

    res.json({
      investments: investments.rows,
      summary: {
        totalInvested,
        totalEarned,
        count: investments.rows.length,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Funds My GET]", message);
    res.status(500).json({ error: "Server xatosi yuz berdi. Qayta urining." });
  }
});

// ─── GET /api/funds/:id — fond tafsiloti ─────────────────────────────────────
router.get("/:id", authenticate, async (req, res) => {
  try {
    const fundId = Number(req.params.id);
    const authUser = (req as unknown as { user: { userId: number; role: string } }).user;

    const fundResult = await db.execute(sql`
      SELECT
        f.*,
        s.name as shop_name,
        s.address as shop_address,
        COALESCE(inv_count.count, 0) as investor_count
      FROM investment_funds f
      LEFT JOIN shops s ON f.shop_id = s.id
      LEFT JOIN (
        SELECT fund_id, COUNT(*) as count
        FROM user_investments
        WHERE status = 'active'
        GROUP BY fund_id
      ) inv_count ON inv_count.fund_id = f.id
      WHERE f.id = ${fundId}
      LIMIT 1
    `);

    if (!fundResult.rows.length) {
      res.status(404).json({ error: "Fond topilmadi" });
      return;
    }

    const fund = fundResult.rows[0] as unknown as FundRow;

    // Agar admin bo'lsa, investorlar ro'yxatini qaytaradi
    let investors: Record<string, unknown>[] = [];
    if (authUser.role === "super_admin") {
      const invResult = await db.execute(sql`
        SELECT
          ui.*,
          u.name as user_name,
          u.phone as user_phone
        FROM user_investments ui
        JOIN users u ON ui.user_id = u.id
        WHERE ui.fund_id = ${fundId}
        ORDER BY ui.invested_at DESC
      `);
      investors = invResult.rows as Record<string, unknown>[];
    }

    // Joriy foydalanuvchining investitsiyasi
    const myInv = await db.execute(sql`
      SELECT * FROM user_investments
      WHERE fund_id = ${fundId} AND user_id = ${authUser.userId}
      LIMIT 1
    `);

    res.json({
      fund,
      investors,
      myInvestment: myInv.rows[0] || null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Fund GET by ID]", message);
    res.status(500).json({ error: "Server xatosi yuz berdi. Qayta urining." });
  }
});

// ─── POST /api/funds — yangi fond yaratish (faqat admin) ─────────────────────
router.post("/", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const authUser = (req as unknown as { user: { userId: number } }).user;
    const {
      name, description, toolType, shopId,
      targetAmount, annualReturnRate, durationMonths, minInvestment,
    } = req.body as {
      name: unknown; description: unknown; toolType: unknown; shopId: unknown;
      targetAmount: unknown; annualReturnRate: unknown; durationMonths: unknown; minInvestment: unknown;
    };

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      res.status(400).json({ error: "Fond nomi kamida 2 ta harf bo'lishi kerak" });
      return;
    }
    if (!toolType || typeof toolType !== "string") {
      res.status(400).json({ error: "Asbob turi kerak" });
      return;
    }
    const targetAmt = Number(targetAmount);
    if (!targetAmt || targetAmt <= 0) {
      res.status(400).json({ error: "Maqsad summa noto'g'ri" });
      return;
    }
    const annualRate = Number(annualReturnRate);
    if (!annualRate || annualRate <= 0 || annualRate > 100) {
      res.status(400).json({ error: "Yillik daromad foizi 0–100 orasida bo'lishi kerak" });
      return;
    }
    const durationMo = Number(durationMonths);
    if (!durationMo || durationMo < 1) {
      res.status(400).json({ error: "Davomiylik kamida 1 oy bo'lishi kerak" });
      return;
    }

    const MIN_INVESTMENT_FLOOR = 500000;
    const minInvRaw = Number(minInvestment);
    const minInv = Math.max(isNaN(minInvRaw) || minInvRaw <= 0 ? MIN_INVESTMENT_FLOOR : minInvRaw, MIN_INVESTMENT_FLOOR);
    const durationMs = durationMo * 30 * 24 * 60 * 60 * 1000;
    const endDate = new Date(Date.now() + durationMs);
    const shopIdNum = shopId ? Number(shopId) : null;
    const descText = description && typeof description === "string" ? description : null;

    const result = await db.execute(sql`
      INSERT INTO investment_funds (
        name, description, tool_type, shop_id,
        target_amount, annual_return_rate, duration_months,
        min_investment, created_by, end_date
      ) VALUES (
        ${name.trim()}, ${descText}, ${toolType},
        ${shopIdNum},
        ${targetAmt}, ${annualRate},
        ${durationMo}, ${minInv},
        ${authUser.userId}, ${endDate.toISOString()}
      )
      RETURNING *
    `);

    res.status(201).json({ fund: result.rows[0], ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Fund POST]", message);
    res.status(500).json({ error: "Server xatosi yuz berdi. Qayta urining." });
  }
});

// ─── PATCH /api/funds/:id — fond tahrirlash yoki yopish (admin) ──────────────
router.patch("/:id", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const fundId = Number(req.params.id);
    const { name, description, status, annualReturnRate, minInvestment } = req.body as {
      name?: string; description?: string; status?: string;
      annualReturnRate?: number; minInvestment?: number;
    };

    const existing = await db.execute(sql`SELECT id FROM investment_funds WHERE id = ${fundId} LIMIT 1`);
    if (!existing.rows.length) {
      res.status(404).json({ error: "Fond topilmadi" });
      return;
    }

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (name !== undefined) {
      updates.push(`name = $${updates.length + 1}`);
      values.push(String(name));
    }
    if (description !== undefined) {
      updates.push(`description = $${updates.length + 1}`);
      values.push(String(description));
    }
    if (status !== undefined) {
      if (!isFundStatus(status)) {
        res.status(400).json({ error: "Noto'g'ri holat" });
        return;
      }
      updates.push(`status = $${updates.length + 1}`);
      values.push(status);
    }
    if (annualReturnRate !== undefined) {
      updates.push(`annual_return_rate = $${updates.length + 1}`);
      values.push(Number(annualReturnRate));
    }
    if (minInvestment !== undefined) {
      updates.push(`min_investment = $${updates.length + 1}`);
      values.push(Number(minInvestment));
    }

    if (updates.length === 0) {
      res.status(400).json({ error: "Yangilash uchun ma'lumot kerak" });
      return;
    }

    updates.push(`updated_at = NOW()`);
    values.push(fundId);

    const result = await db.$client.query(
      `UPDATE investment_funds SET ${updates.join(", ")} WHERE id = $${values.length} RETURNING *`,
      values
    );

    res.json({ fund: result.rows[0], ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Fund PATCH]", message);
    res.status(500).json({ error: "Server xatosi yuz berdi. Qayta urining." });
  }
});

// ─── POST /api/funds/:id/invest — hamyondan investitsiya qilish ───────────────
router.post("/:id/invest", authenticate, async (req, res) => {
  try {
    const fundId = Number(req.params.id);
    const authUser = (req as unknown as { user: { userId: number } }).user;
    const { amount } = req.body as { amount: unknown };

    const investAmount = Number(amount);
    if (!investAmount || investAmount <= 0) {
      res.status(400).json({ error: "Investitsiya miqdori noto'g'ri" });
      return;
    }

    // Fond mavjudligini tekshirish
    const fundResult = await db.execute(sql`SELECT * FROM investment_funds WHERE id = ${fundId} LIMIT 1`);
    if (!fundResult.rows.length) {
      res.status(404).json({ error: "Fond topilmadi" });
      return;
    }

    const fund = fundResult.rows[0] as unknown as FundRow;

    if (fund.status !== "active") {
      res.status(400).json({ error: "Bu fond hozir investitsiya qabul qilmayapti" });
      return;
    }

    if (investAmount < fund.min_investment) {
      res.status(400).json({
        error: `Minimum investitsiya miqdori: ${fund.min_investment.toLocaleString()} so'm`,
      });
      return;
    }

    const remaining = fund.target_amount - fund.collected_amount;
    if (investAmount > remaining) {
      res.status(400).json({
        error: `Ushbu fondda qolgan summa: ${remaining.toLocaleString()} so'm`,
      });
      return;
    }

    // Hamyonni tekshirish (transaksiyadan tashqarida — oldindan tekshirish)
    const wallet = await getOrCreateWallet(authUser.userId);
    if (wallet.balance < investAmount) {
      res.status(400).json({ error: "Hamyon balansida yetarli mablag' yo'q" });
      return;
    }

    const sharePercent = (investAmount / fund.target_amount) * 100;
    const newBalance = wallet.balance - investAmount;
    const newCollected = fund.collected_amount + investAmount;
    const newFundStatus: FundStatus = newCollected >= fund.target_amount ? "closed" : "active";

    // Atomik transaksiya: hamyon, wallet_tx, user_investments, fond yangilanishi
    const client = await pool.connect();
    let invRow: Record<string, unknown>;
    try {
      await client.query("BEGIN");

      await client.query(
        "UPDATE wallets SET balance = $1, updated_at = NOW() WHERE user_id = $2",
        [newBalance, authUser.userId]
      );

      await client.query(
        `INSERT INTO wallet_transactions (wallet_id, user_id, amount, type, provider, status, description, balance_before, balance_after)
         VALUES ($1, $2, $3, 'payment', 'system', 'completed', $4, $5, $6)`,
        [wallet.id, authUser.userId, -investAmount, `Investitsiya: ${fund.name}`, wallet.balance, newBalance]
      );

      const invRes = await client.query(
        "INSERT INTO user_investments (fund_id, user_id, amount, share_percent, status) VALUES ($1, $2, $3, $4, 'active') RETURNING *",
        [fundId, authUser.userId, investAmount, sharePercent]
      );
      invRow = invRes.rows[0] as Record<string, unknown>;

      await client.query(
        "UPDATE investment_funds SET collected_amount = $1, status = $2, updated_at = NOW() WHERE id = $3",
        [newCollected, newFundStatus, fundId]
      );

      await client.query("COMMIT");
    } catch (txErr: unknown) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }

    res.status(201).json({
      ok: true,
      investment: invRow,
      newWalletBalance: newBalance,
      fundStatus: newFundStatus,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Fund Invest POST]", message);
    res.status(500).json({ error: "Server xatosi yuz berdi. Qayta urining." });
  }
});

// ─── POST /api/funds/:id/distribute — oylik daromad ulashish (admin) ─────────
router.post("/:id/distribute", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const fundId = Number(req.params.id);

    const fundResult = await db.execute(sql`SELECT * FROM investment_funds WHERE id = ${fundId} LIMIT 1`);
    if (!fundResult.rows.length) {
      res.status(404).json({ error: "Fond topilmadi" });
      return;
    }

    const fund = fundResult.rows[0] as unknown as FundRow;

    if (fund.status !== "active" && fund.status !== "closed") {
      res.status(400).json({ error: "Bu fond uchun daromad ulashish mumkin emas" });
      return;
    }

    const investors = await db.execute(sql`
      SELECT ui.*, u.id as uid
      FROM user_investments ui
      JOIN users u ON ui.user_id = u.id
      WHERE ui.fund_id = ${fundId} AND ui.status = 'active'
    `);

    if (!investors.rows.length) {
      res.status(400).json({ error: "Ushbu fondda faol investor yo'q" });
      return;
    }

    const monthlyRate = fund.annual_return_rate / 100 / 12;
    let distributed = 0;

    // Barcha investorlar uchun atomik transaksiya
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      for (const invRow of investors.rows) {
        const inv = invRow as unknown as InvestmentRow;
        const monthlyEarning = inv.amount * monthlyRate;

        const walletRes = await client.query(
          "SELECT * FROM wallets WHERE user_id = $1 LIMIT 1",
          [inv.user_id]
        );
        let walletId: number;
        let walletBalance: number;

        if (walletRes.rows.length) {
          walletId = (walletRes.rows[0] as WalletRow).id;
          walletBalance = (walletRes.rows[0] as WalletRow).balance;
        } else {
          const newW = await client.query(
            "INSERT INTO wallets (user_id, balance, escrow_balance) VALUES ($1, 0, 0) RETURNING *",
            [inv.user_id]
          );
          walletId = (newW.rows[0] as WalletRow).id;
          walletBalance = 0;
        }

        const newBalance = walletBalance + monthlyEarning;

        await client.query(
          "UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2",
          [newBalance, walletId]
        );

        await client.query(
          `INSERT INTO wallet_transactions (wallet_id, user_id, amount, type, provider, status, description, balance_before, balance_after)
           VALUES ($1, $2, $3, 'refund', 'system', 'completed', $4, $5, $6)`,
          [walletId, inv.user_id, monthlyEarning, `Oylik daromad: ${fund.name}`, walletBalance, newBalance]
        );

        await client.query(
          "UPDATE user_investments SET earned_amount = earned_amount + $1 WHERE id = $2",
          [monthlyEarning, inv.id]
        );

        distributed++;
      }

      await client.query("COMMIT");
    } catch (txErr: unknown) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }

    res.json({
      ok: true,
      distributed,
      monthlyRate: (monthlyRate * 100).toFixed(3),
      message: `${distributed} ta investor hamyoniga daromad ulashildi`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Fund Distribute POST]", message);
    res.status(500).json({ error: "Server xatosi yuz berdi. Qayta urining." });
  }
});

// ─── POST /api/funds/:id/return — muddat tugaganda asosiy pul qaytarish (admin)
router.post("/:id/return", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const fundId = Number(req.params.id);

    const fundResult = await db.execute(sql`SELECT * FROM investment_funds WHERE id = ${fundId} LIMIT 1`);
    if (!fundResult.rows.length) {
      res.status(404).json({ error: "Fond topilmadi" });
      return;
    }

    const fund = fundResult.rows[0] as unknown as FundRow;

    const investors = await db.execute(sql`
      SELECT * FROM user_investments
      WHERE fund_id = ${fundId} AND status = 'active'
    `);

    let returned = 0;

    // Barcha qaytarishlar uchun atomik transaksiya
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      for (const invRow of investors.rows) {
        const inv = invRow as unknown as InvestmentRow;

        const walletRes = await client.query(
          "SELECT * FROM wallets WHERE user_id = $1 LIMIT 1",
          [inv.user_id]
        );
        let walletId: number;
        let walletBalance: number;

        if (walletRes.rows.length) {
          walletId = (walletRes.rows[0] as WalletRow).id;
          walletBalance = (walletRes.rows[0] as WalletRow).balance;
        } else {
          const newW = await client.query(
            "INSERT INTO wallets (user_id, balance, escrow_balance) VALUES ($1, 0, 0) RETURNING *",
            [inv.user_id]
          );
          walletId = (newW.rows[0] as WalletRow).id;
          walletBalance = 0;
        }

        const newBalance = walletBalance + inv.amount;

        await client.query(
          "UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2",
          [newBalance, walletId]
        );

        await client.query(
          `INSERT INTO wallet_transactions (wallet_id, user_id, amount, type, provider, status, description, balance_before, balance_after)
           VALUES ($1, $2, $3, 'refund', 'system', 'completed', $4, $5, $6)`,
          [walletId, inv.user_id, inv.amount, `Investitsiya qaytarildi: ${fund.name}`, walletBalance, newBalance]
        );

        await client.query(
          "UPDATE user_investments SET status = 'returned', returned_at = NOW() WHERE id = $1",
          [inv.id]
        );

        returned++;
      }

      await client.query(
        "UPDATE investment_funds SET status = 'matured', updated_at = NOW() WHERE id = $1",
        [fundId]
      );

      await client.query("COMMIT");
    } catch (txErr: unknown) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }

    res.json({
      ok: true,
      returned,
      message: `${returned} ta investorga asosiy pul qaytarildi`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Fund Return POST]", message);
    res.status(500).json({ error: "Server xatosi yuz berdi. Qayta urining." });
  }
});

export default router;
