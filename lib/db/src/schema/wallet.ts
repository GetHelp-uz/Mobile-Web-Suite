import { pgTable, text, serial, integer, timestamp, real, boolean, pgEnum } from "drizzle-orm/pg-core";

export const walletTxTypeEnum = pgEnum("wallet_tx_type", [
  "topup",        // Hisobni to'ldirish
  "payment",      // Ijara to'lovi
  "deposit_hold", // Depozit ushlanishi
  "deposit_release", // Depozit qaytarish
  "deposit_deduct",  // Zarar uchun depozitdan ayirish
  "refund",       // Qaytarib berish
  "withdrawal",   // Chiqarib olish
]);

export const walletTxStatusEnum = pgEnum("wallet_tx_status", [
  "pending", "completed", "failed", "cancelled"
]);

export const walletProviderEnum = pgEnum("wallet_provider", [
  "click", "payme", "paynet", "cash", "system"
]);

// Foydalanuvchi hamyoni
export const walletsTable = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  balance: real("balance").notNull().default(0),
  escrowBalance: real("escrow_balance").notNull().default(0), // Ushlab turilgan depozitlar
  currency: text("currency").notNull().default("UZS"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Hamyon tranzaksiyalari
export const walletTransactionsTable = pgTable("wallet_transactions", {
  id: serial("id").primaryKey(),
  walletId: integer("wallet_id").notNull(),
  userId: integer("user_id").notNull(),
  rentalId: integer("rental_id"),
  amount: real("amount").notNull(),
  type: walletTxTypeEnum("type").notNull(),
  provider: walletProviderEnum("provider").notNull().default("system"),
  status: walletTxStatusEnum("status").notNull().default("pending"),
  referenceId: text("reference_id"),
  providerTxId: text("provider_tx_id"),
  description: text("description"),
  balanceBefore: real("balance_before").notNull().default(0),
  balanceAfter: real("balance_after").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Wallet = typeof walletsTable.$inferSelect;
export type WalletTransaction = typeof walletTransactionsTable.$inferSelect;
