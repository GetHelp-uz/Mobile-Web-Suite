import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate, requireRole } from "../lib/auth.js";
import { ensureCommissionTables } from "../lib/commission.js";
ensureCommissionTables();
import os from "os";
import { execSync } from "child_process";

const router = Router();

// ─── Platform sozlamalarini olish (faqat super_admin) ────────────────────────
router.get("/settings", authenticate, requireRole("super_admin"), async (_req, res) => {
  try {
    const rows = await db.execute(sql`SELECT key, value FROM platform_settings ORDER BY key`);
    const settings: Record<string, string> = {};
    for (const row of rows.rows as any[]) {
      settings[row.key] = row.value;
    }
    res.json({ settings });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

// ─── Sozlamani yangilash (faqat super_admin) ──────────────────────────────────
router.patch("/settings/:key", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    if (value === undefined) {
      res.status(400).json({ error: "value kiritilishi shart" });
      return;
    }
    await db.execute(sql`
      UPDATE platform_settings SET value = ${String(value)}, updated_at = NOW()
      WHERE key = ${key}
    `);
    res.json({ success: true, key, value });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

// ─── Ko'p sozlamalarni bir vaqtda yangilash ────────────────────────────────────
router.post("/settings/bulk", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== "object") {
      res.status(400).json({ error: "settings obyekti kerak" });
      return;
    }
    for (const [key, value] of Object.entries(settings)) {
      await db.execute(sql`
        INSERT INTO platform_settings (key, value) VALUES (${key}, ${String(value)})
        ON CONFLICT (key) DO UPDATE SET value = ${String(value)}, updated_at = NOW()
      `);
    }
    res.json({ success: true, count: Object.keys(settings).length });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

// ─── Server holati va infratuzilma ────────────────────────────────────────────
router.get("/status", authenticate, requireRole("super_admin"), async (_req, res) => {
  try {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const uptime = os.uptime();

    // DB statistikasi
    const dbStats = await db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM users) as users_count,
        (SELECT COUNT(*) FROM shops) as shops_count,
        (SELECT COUNT(*) FROM tools) as tools_count,
        (SELECT COUNT(*) FROM rentals WHERE status = 'active') as active_rentals,
        (SELECT COUNT(*) FROM wallet_transactions) as tx_count,
        (SELECT COALESCE(SUM(balance), 0) FROM wallets) as total_wallet_balance,
        (SELECT COUNT(*) FROM rentals WHERE started_at >= NOW() - INTERVAL '24 hours') as rentals_today,
        (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '24 hours') as new_users_today
    `);
    const s = dbStats.rows[0] as any;

    // DB connection test
    let dbStatus = "healthy";
    try {
      await db.execute(sql`SELECT 1`);
    } catch {
      dbStatus = "error";
    }

    // Haftalik ijara statistikasi (7 kun)
    const weeklyRentals = await db.execute(sql`
      SELECT
        DATE(started_at) as date,
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as revenue
      FROM rentals
      WHERE started_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(started_at)
      ORDER BY date ASC
    `);

    // Oylik daromad
    const monthlyRevenue = await db.execute(sql`
      SELECT COALESCE(SUM(total_amount), 0) as total FROM rentals
      WHERE started_at >= DATE_TRUNC('month', NOW())
    `);

    // Komissiya daromadi
    const commissionRevenue = await db.execute(sql`
      SELECT COALESCE(SUM(commission_amount), 0) as total FROM commission_logs
      WHERE created_at >= DATE_TRUNC('month', NOW())
    `);

    // Eng faol do'konlar
    const topShops = await db.execute(sql`
      SELECT s.name, COUNT(r.id) as rental_count, COALESCE(SUM(r.total_amount), 0) as revenue
      FROM shops s
      LEFT JOIN rentals r ON r.shop_id = s.id AND r.started_at >= NOW() - INTERVAL '30 days'
      GROUP BY s.id, s.name
      ORDER BY rental_count DESC
      LIMIT 5
    `);

    res.json({
      server: {
        uptime,
        uptimeFormatted: formatUptime(uptime),
        cpuCount: cpus.length,
        cpuModel: cpus[0]?.model || "Unknown",
        memTotal: totalMem,
        memUsed: usedMem,
        memFree: freeMem,
        memPercent: Math.round((usedMem / totalMem) * 100),
        nodeVersion: process.version,
        platform: os.platform(),
        hostname: os.hostname(),
      },
      database: {
        status: dbStatus,
        ...s,
      },
      metrics: {
        weeklyRentals: weeklyRentals.rows,
        monthlyRevenue: Number((monthlyRevenue.rows[0] as any).total),
        commissionRevenue: Number((commissionRevenue.rows[0] as any).total),
        topShops: topShops.rows,
      },
    });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}k ${h}s ${m}d`;
}

// ─── Global komissiya stavkalarini olish ──────────────────────────────────────
router.get("/commission-settings", authenticate, requireRole("super_admin"), async (_req, res) => {
  try {
    const rows = await db.$client.query(`SELECT * FROM commission_settings ORDER BY type`);
    res.json({ settings: rows.rows });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi.' });
  }
});

// ─── Global komissiya stavkasini yangilash ────────────────────────────────────
router.patch("/commission-settings/:type", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const { type } = req.params;
    const { rate, min_amount, max_amount, is_active, description } = req.body;
    await db.$client.query(
      `UPDATE commission_settings SET
        rate = COALESCE($1, rate),
        min_amount = COALESCE($2, min_amount),
        max_amount = COALESCE($3, max_amount),
        is_active = COALESCE($4, is_active),
        description = COALESCE($5, description),
        updated_at = NOW()
      WHERE type = $6`,
      [rate ?? null, min_amount ?? null, max_amount ?? null, is_active ?? null, description ?? null, type]
    );
    res.json({ success: true });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi.' });
  }
});

// ─── Do'kon komissiya overridelarini olish ────────────────────────────────────
router.get("/shop-commission-overrides", authenticate, requireRole("super_admin"), async (_req, res) => {
  try {
    const rows = await db.$client.query(`
      SELECT sco.*, s.name as shop_name
      FROM shop_commission_overrides sco
      LEFT JOIN shops s ON s.id = sco.shop_id
      ORDER BY s.name, sco.type
    `);
    res.json({ overrides: rows.rows });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi.' });
  }
});

// ─── Do'kon komissiya override saqlash/yangilash ──────────────────────────────
router.post("/shop-commission-overrides", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const { shop_id, type, rate, is_active } = req.body;
    if (!shop_id || !type) {
      res.status(400).json({ error: "shop_id va type majburiy" }); return;
    }
    await db.$client.query(
      `INSERT INTO shop_commission_overrides (shop_id, type, rate, is_active)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (shop_id, type) DO UPDATE SET rate = $3, is_active = $4, updated_at = NOW()`,
      [shop_id, type, rate ?? 0, is_active ?? true]
    );
    res.json({ success: true });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi.' });
  }
});

// ─── Do'kon komissiya overrideni o'chirish ────────────────────────────────────
router.delete("/shop-commission-overrides/:shopId/:type", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const { shopId, type } = req.params;
    await db.$client.query(
      `DELETE FROM shop_commission_overrides WHERE shop_id = $1 AND type = $2`,
      [shopId, type]
    );
    res.json({ success: true });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi.' });
  }
});

// ─── Escrow holati ────────────────────────────────────────────────────────────
router.get("/escrow", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const status = (req.query.status as string) || "held";
    const rows = await db.$client.query(`
      SELECT
        eh.*,
        u.name as user_name, u.phone as user_phone,
        r.status as rental_status
      FROM escrow_holds eh
      LEFT JOIN users u ON u.id = eh.user_id
      LEFT JOIN rentals r ON r.id = eh.rental_id
      WHERE eh.status = $1
      ORDER BY eh.created_at DESC
      LIMIT 100
    `, [status]);

    const totals = await db.$client.query(`
      SELECT
        COUNT(*) FILTER (WHERE status='held') as held_count,
        COALESCE(SUM(amount) FILTER (WHERE status='held'), 0) as held_amount,
        COUNT(*) FILTER (WHERE status='released') as released_count,
        COALESCE(SUM(amount) FILTER (WHERE status='released'), 0) as released_amount
      FROM escrow_holds
    `);

    res.json({ holds: rows.rows, totals: totals.rows[0] });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi.' });
  }
});

// ─── Komissiya tranzaksiyalari statistikasi ────────────────────────────────────
router.get("/commission-transactions", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const period = (req.query.period as string) || "month";
    const type = (req.query.type as string) || "";
    const interval = period === "week" ? "7 days" : period === "year" ? "365 days" : "30 days";

    const where = type
      ? `WHERE ct.created_at >= NOW() - INTERVAL '${interval}' AND ct.type = '${type}'`
      : `WHERE ct.created_at >= NOW() - INTERVAL '${interval}'`;

    const rows = await db.$client.query(`
      SELECT ct.*, u.name as user_name, s.name as shop_name
      FROM commission_transactions ct
      LEFT JOIN users u ON u.id = ct.user_id
      LEFT JOIN shops s ON s.id = ct.shop_id
      ${where}
      ORDER BY ct.created_at DESC LIMIT 100
    `);

    const totals = await db.$client.query(`
      SELECT
        COALESCE(SUM(commission_amount),0) as total_commission,
        COALESCE(SUM(gross_amount),0) as total_gross,
        COALESCE(SUM(net_amount),0) as total_net,
        COUNT(*) as count
      FROM commission_transactions
      ${where.replace('ct.', '')}
    `);

    const byType = await db.$client.query(`
      SELECT type, COUNT(*) as cnt,
        COALESCE(SUM(commission_amount),0) as commission,
        COALESCE(SUM(gross_amount),0) as gross
      FROM commission_transactions
      WHERE created_at >= NOW() - INTERVAL '${interval}'
      GROUP BY type ORDER BY commission DESC
    `);

    res.json({ transactions: rows.rows, totals: totals.rows[0], byType: byType.rows });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi.' });
  }
});

// ─── Komissiya statistikasi (eski endpoint — backward compat) ────────────────
router.get("/commissions", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const period = (req.query.period as string) || "month";
    const interval = period === "week" ? "7 days" : period === "year" ? "365 days" : "30 days";

    const logs = await db.execute(sql`
      SELECT
        cl.*,
        s.name as shop_name,
        r.started_at as rental_date
      FROM commission_logs cl
      LEFT JOIN shops s ON s.id = cl.shop_id
      LEFT JOIN rentals r ON r.id = cl.rental_id
      WHERE cl.created_at >= NOW() - INTERVAL ${sql.raw(`'${interval}'`)}
      ORDER BY cl.created_at DESC
      LIMIT 100
    `);

    const totals = await db.execute(sql`
      SELECT
        COALESCE(SUM(commission_amount), 0) as total_commission,
        COALESCE(SUM(shop_amount), 0) as total_shop_amount,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COUNT(*) as count
      FROM commission_logs
      WHERE created_at >= NOW() - INTERVAL ${sql.raw(`'${interval}'`)}
    `);

    const byShop = await db.execute(sql`
      SELECT
        cl.shop_id,
        s.name as shop_name,
        COUNT(*) as transactions,
        COALESCE(SUM(cl.commission_amount), 0) as commission,
        COALESCE(SUM(cl.total_amount), 0) as revenue,
        AVG(cl.commission_rate) as avg_rate
      FROM commission_logs cl
      LEFT JOIN shops s ON s.id = cl.shop_id
      WHERE cl.created_at >= NOW() - INTERVAL ${sql.raw(`'${interval}'`)}
      GROUP BY cl.shop_id, s.name
      ORDER BY commission DESC
    `);

    res.json({
      logs: logs.rows,
      totals: totals.rows[0],
      byShop: byShop.rows,
    });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

export default router;
