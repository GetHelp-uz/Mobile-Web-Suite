import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error("XAVFSIZLIK XATOSI: JWT_SECRET env o'rnatilmagan yoki 32 belgidan qisqa!");
  process.exit(1);
}

// ─── Token yaratish ──────────────────────────────────────────────────────────
export function generateToken(userId: number, role: string): string {
  return jwt.sign({ userId, role, iat: Math.floor(Date.now() / 1000) }, JWT_SECRET!, {
    expiresIn: "60d",
    issuer: "gethelp-uz",
    audience: "gethelp-app",
  });
}

// ─── Token tekshirish ────────────────────────────────────────────────────────
export function verifyToken(token: string): { userId: number; role: string; exp?: number } {
  return jwt.verify(token, JWT_SECRET!, {
    issuer: "gethelp-uz",
    audience: "gethelp-app",
  }) as any;
}

// ─── Token hash (revocation uchun) ──────────────────────────────────────────
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// ─── Login urinishlarini tekshirish ─────────────────────────────────────────
// 15 daqiqa ichida 5 ta muvaffaqiyatsiz urinish = 30 daqiqa bloklash
const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;
const LOCKOUT_MINUTES = 30;

export async function checkLoginAttempts(identifier: string, ip: string): Promise<{
  allowed: boolean;
  remainingSeconds?: number;
  attemptsLeft?: number;
}> {
  try {
    // Faol bloklash bormi? (so'nggi LOCKOUT_MINUTES ichida MAX_ATTEMPTS dan ortiq muvaffaqiyatsiz urinish)
    const lockCutoff = new Date(Date.now() - LOCKOUT_MINUTES * 60 * 1000);
    const lockCheck = await db.execute(sql`
      SELECT COUNT(*) as cnt FROM login_attempts
      WHERE identifier = ${identifier}
        AND success = false
        AND created_at > ${lockCutoff.toISOString()}
    `);
    const failCount = Number((lockCheck.rows[0] as any)?.cnt || 0);

    if (failCount >= MAX_ATTEMPTS) {
      const lastAttempt = await db.execute(sql`
        SELECT created_at FROM login_attempts
        WHERE identifier = ${identifier} AND success = false
        ORDER BY created_at DESC LIMIT 1
      `);
      const last = new Date((lastAttempt.rows[0] as any)?.created_at || Date.now());
      const lockExpiry = new Date(last.getTime() + LOCKOUT_MINUTES * 60 * 1000);
      const remaining = Math.ceil((lockExpiry.getTime() - Date.now()) / 1000);
      return { allowed: false, remainingSeconds: Math.max(0, remaining) };
    }

    // So'nggi oynada nechta urinish?
    const windowCutoff = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as cnt FROM login_attempts
      WHERE identifier = ${identifier}
        AND success = false
        AND created_at > ${windowCutoff.toISOString()}
    `);
    const cnt = Number((countResult.rows[0] as any)?.cnt || 0);
    return { allowed: true, attemptsLeft: Math.max(0, MAX_ATTEMPTS - cnt) };
  } catch {
    return { allowed: true };
  }
}

// ─── Login urinishini yozib qo'yish ─────────────────────────────────────────
export async function recordLoginAttempt(identifier: string, ip: string, success: boolean): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO login_attempts (identifier, ip_address, success)
      VALUES (${identifier}, ${ip}, ${success})
    `);
    // Muvaffaqiyatli login — eski urinishlarni tozalaymiz
    if (success) {
      await db.execute(sql`
        DELETE FROM login_attempts
        WHERE identifier = ${identifier} AND success = false
      `);
    }
    // Eski yozuvlarni tozalash (24 soatdan o'tganlar)
    await db.execute(sql`
      DELETE FROM login_attempts WHERE created_at < NOW() - INTERVAL '24 hours'
    `).catch(() => {});
  } catch {}
}

// ─── Token bekor qilish (logout) ────────────────────────────────────────────
export async function revokeToken(token: string, userId: number, expiresAt: Date): Promise<void> {
  try {
    const hash = hashToken(token);
    await db.execute(sql`
      INSERT INTO revoked_tokens (token_hash, user_id, expires_at)
      VALUES (${hash}, ${userId}, ${expiresAt.toISOString()})
      ON CONFLICT (token_hash) DO NOTHING
    `);
    // Eskirgan tokenlarni tozalash
    await db.execute(sql`DELETE FROM revoked_tokens WHERE expires_at < NOW()`).catch(() => {});
  } catch {}
}

// ─── Token bekor qilinganmi? ─────────────────────────────────────────────────
export async function isTokenRevoked(token: string): Promise<boolean> {
  try {
    const hash = hashToken(token);
    const result = await db.execute(sql`
      SELECT id FROM revoked_tokens WHERE token_hash = ${hash} AND expires_at > NOW() LIMIT 1
    `);
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

// ─── Middleware: Token tekshirish (revocation bilan) ─────────────────────────
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Avtorizatsiya talab qilinadi" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = verifyToken(token);
    (req as any).user = payload;
    (req as any).rawToken = token;
    // Token revocation async tekshiruvi (performance uchun faqat muhim yo'llarda)
    next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      res.status(401).json({ error: "Sessiya muddati tugadi. Qayta kiring.", code: "TOKEN_EXPIRED" });
    } else {
      res.status(401).json({ error: "Noto'g'ri token", code: "INVALID_TOKEN" });
    }
  }
}

// ─── Muhim marshrut uchun revocation tekshiruvi ──────────────────────────────
export function authenticateStrict(req: Request, res: Response, next: NextFunction) {
  authenticate(req, res, async () => {
    const token = (req as any).rawToken;
    const revoked = await isTokenRevoked(token);
    if (revoked) {
      res.status(401).json({ error: "Token bekor qilingan. Qayta kiring.", code: "TOKEN_REVOKED" });
      return;
    }
    next();
  });
}

// ─── Rol tekshirish ──────────────────────────────────────────────────────────
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ error: "Bu amalni bajarish uchun ruxsatingiz yo'q" });
      return;
    }
    next();
  };
}
