import { db } from "@workspace/db";
import { ensureCommissionTables } from "./commission.js";
import { ensurePassportTables } from "./passport.js";

async function ensureCoreTables() {
  await db.$client.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'rental_status'
      ) AND NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'rental_status' AND e.enumlabel = 'completed'
      ) THEN
        ALTER TYPE rental_status ADD VALUE 'completed';
      END IF;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;

    ALTER TABLE rentals
      ADD COLUMN IF NOT EXISTS contract_signed BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMP;

    CREATE TABLE IF NOT EXISTS contracts (
      id SERIAL PRIMARY KEY,
      rental_id INTEGER NOT NULL UNIQUE REFERENCES rentals(id) ON DELETE CASCADE,
      contract_number VARCHAR(80) NOT NULL UNIQUE,
      customer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      shop_id INTEGER REFERENCES shops(id) ON DELETE SET NULL,
      content TEXT DEFAULT '',
      signature_data TEXT,
      signature_ip VARCHAR(128),
      signed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS login_attempts (
      id SERIAL PRIMARY KEY,
      identifier VARCHAR(255) NOT NULL,
      ip_address VARCHAR(128) NOT NULL,
      success BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier_created_at
      ON login_attempts(identifier, created_at DESC);

    CREATE TABLE IF NOT EXISTS revoked_tokens (
      id SERIAL PRIMARY KEY,
      token_hash VARCHAR(128) NOT NULL UNIQUE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS password_reset_codes (
      id SERIAL PRIMARY KEY,
      phone VARCHAR(32) NOT NULL,
      code VARCHAR(255) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_password_reset_codes_phone_created_at
      ON password_reset_codes(phone, created_at DESC);

    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(100) NOT NULL,
      entity_id INTEGER,
      details JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS push_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      platform VARCHAR(32) DEFAULT 'unknown',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS platform_settings (
      id SERIAL PRIMARY KEY,
      key VARCHAR(120) NOT NULL UNIQUE,
      value TEXT DEFAULT '',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS payment_settings (
      id SERIAL PRIMARY KEY,
      provider VARCHAR(30) UNIQUE NOT NULL,
      merchant_id VARCHAR(200) DEFAULT '',
      secret_key VARCHAR(500) DEFAULT '',
      service_id VARCHAR(200) DEFAULT '',
      api_url VARCHAR(500) DEFAULT '',
      is_active BOOLEAN DEFAULT FALSE,
      is_test_mode BOOLEAN DEFAULT TRUE,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      updated_by INTEGER
    );

    INSERT INTO payment_settings (provider, api_url) VALUES
      ('click', 'https://my.click.uz/services/pay'),
      ('payme', 'https://checkout.paycom.uz'),
      ('paynet', 'https://paynet.uz/paying/gw'),
      ('uzum', 'https://checkout.uzum.uz')
    ON CONFLICT (provider) DO NOTHING;

    CREATE TABLE IF NOT EXISTS shop_payment_settings (
      id SERIAL PRIMARY KEY,
      shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      provider VARCHAR(30) NOT NULL DEFAULT 'paynet',
      merchant_id VARCHAR(200) DEFAULT '',
      secret_key VARCHAR(500) DEFAULT '',
      service_id VARCHAR(200) DEFAULT '',
      is_active BOOLEAN DEFAULT FALSE,
      is_test_mode BOOLEAN DEFAULT TRUE,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(shop_id, provider)
    );

    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS referral_code TEXT,
      ADD COLUMN IF NOT EXISTS referred_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code_unique ON users(referral_code);

    UPDATE users
    SET referral_code = CONCAT('GH', LPAD(id::text, 6, '0'))
    WHERE referral_code IS NULL OR referral_code = '';

    ALTER TABLE tools
      ADD COLUMN IF NOT EXISTS stock_count INTEGER NOT NULL DEFAULT 1;

    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'general',
      related_id INTEGER,
      related_type TEXT,
      sound_type TEXT DEFAULT 'general',
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_user_created
      ON notifications(user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      description TEXT,
      location TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      total_amount REAL NOT NULL DEFAULT 0,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_projects_customer_created
      ON projects(customer_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_projects_shop_created
      ON projects(shop_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS project_rentals (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      rental_id INTEGER NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(project_id, rental_id)
    );

    ALTER TABLE subscription_plans
      ADD COLUMN IF NOT EXISTS duration_days INTEGER NOT NULL DEFAULT 30;

    CREATE TABLE IF NOT EXISTS subscriptions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan_id INTEGER NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
      shop_id INTEGER REFERENCES shops(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'active',
      starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
      payment_method TEXT NOT NULL DEFAULT 'wallet',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_subscriptions_user_created
      ON subscriptions(user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS referral_rewards (
      id SERIAL PRIMARY KEY,
      referrer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      referred_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      paid_at TIMESTAMPTZ,
      UNIQUE(referrer_id, referred_id)
    );
    CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer_created
      ON referral_rewards(referrer_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS worker_tasks (
      id SERIAL PRIMARY KEY,
      shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      worker_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL DEFAULT 'normal',
      status TEXT NOT NULL DEFAULT 'pending',
      due_date TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS damage_reports (
      id SERIAL PRIMARY KEY,
      rental_id INTEGER REFERENCES rentals(id) ON DELETE SET NULL,
      tool_id INTEGER REFERENCES tools(id) ON DELETE SET NULL,
      customer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      photo_url TEXT,
      severity TEXT NOT NULL DEFAULT 'minor',
      estimated_cost REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'open',
      resolved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export async function ensureRuntimeSchema() {
  await ensureCoreTables();
  await ensureCommissionTables();
  await ensurePassportTables();
}
