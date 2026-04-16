import { pgTable, text, serial, integer, timestamp, real, pgEnum, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const rentalStatusEnum = pgEnum("rental_status", ["active", "returned", "overdue"]);
export const paymentMethodEnum = pgEnum("payment_method", ["click", "payme", "paynet", "cash"]);

export const rentalsTable = pgTable("rentals", {
  id: serial("id").primaryKey(),
  toolId: integer("tool_id").notNull(),
  customerId: integer("customer_id").notNull(),
  shopId: integer("shop_id").notNull(),
  workerId: integer("worker_id"),
  status: rentalStatusEnum("status").notNull().default("active"),
  rentalPrice: real("rental_price").notNull(),
  depositAmount: real("deposit_amount").notNull(),
  totalAmount: real("total_amount").notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull().default("cash"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  returnedAt: timestamp("returned_at"),
  dueDate: timestamp("due_date").notNull(),
  damageNote: text("damage_note"),
  damageCost: real("damage_cost"),
  verificationType: text("verification_type"),
  idFrontUrl: text("id_front_url"),
  idBackUrl: text("id_back_url"),
  selfieUrl: text("selfie_url"),
  verificationStatus: text("verification_status").default("pending"),
  contractSigned: boolean("contract_signed").default(false),
  contractSignedAt: timestamp("contract_signed_at"),
});

export const insertRentalSchema = createInsertSchema(rentalsTable).omit({ id: true, startedAt: true });
export type InsertRental = z.infer<typeof insertRentalSchema>;
export type Rental = typeof rentalsTable.$inferSelect;
