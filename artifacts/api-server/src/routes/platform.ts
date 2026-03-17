import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate, requireRole } from "../lib/auth.js";
import os from "os";
import { execSync } from "child_process";

const router = Router();

// ─── Platform sozlamalarini olish ─────────────────────────────────────────────
router.get("/settings", async (_req, res) => {
  try {
    const rows = await db.execute(sql`SELECT key, value FROM platform_settings ORDER BY key`);
    const settings: Record<string, string> = {};
    for (const row of rows.rows as any[]) {
      settings[row.key] = row.value;
    }
    res.json({ settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}k ${h}s ${m}d`;
}

// ─── Komissiya statistikasi ────────────────────────────────────────────────────
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
    res.status(500).json({ error: err.message });
  }
});

export default router;
