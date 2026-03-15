import { pgTable, text, serial, boolean, integer, timestamp, real, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "expired", "trial"]);

export const shopsTable = pgTable("shops", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  ownerId: integer("owner_id").notNull(),
  region: text("region"),
  district: text("district"),
  subscriptionStatus: subscriptionStatusEnum("subscription_status").notNull().default("trial"),
  subscriptionEndsAt: timestamp("subscription_ends_at"),
  commission: real("commission").notNull().default(10),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertShopSchema = createInsertSchema(shopsTable).omit({ id: true, createdAt: true });
export type InsertShop = z.infer<typeof insertShopSchema>;
export type Shop = typeof shopsTable.$inferSelect;
