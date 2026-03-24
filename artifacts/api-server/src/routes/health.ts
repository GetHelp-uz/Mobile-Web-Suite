import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();
const startTime = Date.now();

// ── Tezkor sog'lom tekshiruv ─────────────────────────────────────────────────
router.get("/healthz", (_req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

// ── Batafsil production tekshiruv ────────────────────────────────────────────
router.get("/healthz/detail", async (_req, res) => {
  const uptimeMs = Date.now() - startTime;
  const uptimeSec = Math.floor(uptimeMs / 1000);
  const uptimeMin = Math.floor(uptimeSec / 60);
  const uptimeHrs = Math.floor(uptimeMin / 60);

  let dbStatus = "ok";
  let dbLatencyMs = 0;

  try {
    const t0 = Date.now();
    await db.execute(sql`SELECT 1`);
    dbLatencyMs = Date.now() - t0;
  } catch {
    dbStatus = "error";
  }

  const memUsage = process.memoryUsage();

  res.json({
    status: dbStatus === "ok" ? "ok" : "degraded",
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV || "development",
    uptime: {
      seconds: uptimeSec,
      human: `${uptimeHrs}h ${uptimeMin % 60}m ${uptimeSec % 60}s`,
    },
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
    },
    memory: {
      heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
      rssMB: Math.round(memUsage.rss / 1024 / 1024),
    },
    ts: new Date().toISOString(),
  });
});

export default router;
