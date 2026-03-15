import { pgTable, text, serial, integer, timestamp, real, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const paymentStatusEnum = pgEnum("payment_status", ["pending", "completed", "failed", "refunded"]);
export const paymentTypeEnum = pgEnum("payment_type", ["rental", "deposit", "deposit_refund", "damage_deduction"]);
export const paymentMethodEnum2 = pgEnum("payment_method2", ["click", "payme", "paynet", "cash"]);

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  rentalId: integer("rental_id").notNull(),
  amount: real("amount").notNull(),
  method: paymentMethodEnum2("method").notNull(),
  status: paymentStatusEnum("status").notNull().default("pending"),
  type: paymentTypeEnum("type").notNull(),
  transactionId: text("transaction_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, createdAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
