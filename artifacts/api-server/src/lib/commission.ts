import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

// ─── Komissiya jadvallarini avtomatik yaratish ─────────────────────────────
export async function ensureCommissionTables() {
  try {
    await db.$client.query(`
      CREATE TABLE IF NOT EXISTS commission_settings (
        id SERIAL PRIMARY KEY,
        type VARCHAR(40) UNIQUE NOT NULL,
        rate DECIMAL(5,2) DEFAULT 0,
        min_amount INTEGER DEFAULT 0,
        max_amount INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        description TEXT DEFAULT '',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      INSERT INTO commission_settings (type, rate, description) VALUES
        ('rental_shop',         10, 'Do''kon ijaraga berganda platform komissiyasi (ijara narxidan)'),
        ('rental_customer',      0, 'Mijoz ijara olayotganda qo''shimcha komissiya'),
        ('topup_customer',       0, 'Mijoz hamyon to''ldirganda komissiya'),
        ('topup_shop',           0, 'Do''kon egasi hamyon to''ldirganda komissiya'),
        ('withdrawal_customer',  2, 'Mijoz yechib olayotganda komissiya'),
        ('withdrawal_shop',      1, 'Do''kon egasi yechib olayotganda komissiya')
      ON CONFLICT (type) DO NOTHING;

      CREATE TABLE IF NOT EXISTS shop_commission_overrides (
        id SERIAL PRIMARY KEY,
        shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        type VARCHAR(40) NOT NULL,
        rate DECIMAL(5,2) DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(shop_id, type)
      );

      CREATE TABLE IF NOT EXISTS escrow_holds (
        id SERIAL PRIMARY KEY,
        rental_id INTEGER REFERENCES rentals(id) ON DELETE SET NULL,
        user_id INTEGER NOT NULL REFERENCES users(id),
        wallet_id INTEGER NOT NULL REFERENCES wallets(id),
        amount INTEGER NOT NULL,
        type VARCHAR(30) DEFAULT 'deposit',
        status VARCHAR(20) DEFAULT 'held',
        released_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS commission_transactions (
        id SERIAL PRIMARY KEY,
        type VARCHAR(40) NOT NULL,
        user_id INTEGER REFERENCES users(id),
        shop_id INTEGER REFERENCES shops(id),
        rental_id INTEGER REFERENCES rentals(id),
        gross_amount INTEGER NOT NULL,
        commission_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
        commission_amount INTEGER NOT NULL DEFAULT 0,
        net_amount INTEGER NOT NULL,
        description TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  } catch (e: any) {
    console.error("[Commission Tables]", e.message);
  }
}

// ─── Komissiya stavkasini olish (do'kon override → global fallback) ────────
export async function getCommissionRate(
  type: string,
  shopId?: number | null
): Promise<{ rate: number; isActive: boolean }> {
  try {
    if (shopId) {
      const override = await db.$client.query(
        `SELECT rate, is_active FROM shop_commission_overrides WHERE shop_id = $1 AND type = $2 LIMIT 1`,
        [shopId, type]
      );
      if (override.rows.length && override.rows[0].is_active) {
        return { rate: Number(override.rows[0].rate), isActive: true };
      }
    }
    const global = await db.$client.query(
      `SELECT rate, is_active FROM commission_settings WHERE type = $1 LIMIT 1`,
      [type]
    );
    if (!global.rows.length) return { rate: 0, isActive: false };
    return { rate: Number(global.rows[0].rate), isActive: global.rows[0].is_active };
  } catch {
    return { rate: 0, isActive: false };
  }
}

// ─── Komissiyani hisoblash ─────────────────────────────────────────────────
export function calcCommission(grossAmount: number, rate: number, minAmt = 0, maxAmt = 0): number {
  if (rate <= 0) return 0;
  let comm = Math.round(grossAmount * rate / 100);
  if (minAmt > 0 && comm < minAmt) comm = minAmt;
  if (maxAmt > 0 && comm > maxAmt) comm = maxAmt;
  return Math.min(comm, grossAmount);
}

// ─── Komissiya tranzaksiyasini yozish ──────────────────────────────────────
export async function logCommissionTx(params: {
  type: string;
  userId?: number | null;
  shopId?: number | null;
  rentalId?: number | null;
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  description?: string;
}) {
  const net = params.grossAmount - params.commissionAmount;
  try {
    await db.$client.query(
      `INSERT INTO commission_transactions
        (type, user_id, shop_id, rental_id, gross_amount, commission_rate, commission_amount, net_amount, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        params.type, params.userId ?? null, params.shopId ?? null, params.rentalId ?? null,
        params.grossAmount, params.commissionRate, params.commissionAmount, net,
        params.description ?? "",
      ]
    );
  } catch (e: any) {
    console.error("[CommissionLog]", e.message);
  }
}

// ─── Escrow hold yaratish ──────────────────────────────────────────────────
export async function createEscrowHold(params: {
  rentalId?: number | null;
  userId: number;
  walletId: number;
  amount: number;
  type?: string;
}) {
  try {
    const result = await db.$client.query(
      `INSERT INTO escrow_holds (rental_id, user_id, wallet_id, amount, type, status)
       VALUES ($1,$2,$3,$4,$5,'held') RETURNING id`,
      [params.rentalId ?? null, params.userId, params.walletId, params.amount, params.type ?? "deposit"]
    );
    return result.rows[0]?.id as number;
  } catch (e: any) {
    console.error("[EscrowHold]", e.message);
    return null;
  }
}

// ─── Escrow hold chiqarish (release) ─────────────────────────────────────
export async function releaseEscrowHold(holdId: number) {
  try {
    await db.$client.query(
      `UPDATE escrow_holds SET status = 'released', released_at = NOW() WHERE id = $1`,
      [holdId]
    );
  } catch (e: any) {
    console.error("[EscrowRelease]", e.message);
  }
}
