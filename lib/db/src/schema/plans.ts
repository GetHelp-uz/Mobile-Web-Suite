import { pgTable, text, serial, boolean, integer, timestamp, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const subscriptionPlansTable = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameUz: text("name_uz").notNull(),
  price: real("price").notNull(),
  maxTools: integer("max_tools").notNull().default(30),
  maxWorkers: integer("max_workers").notNull().default(3),
  features: jsonb("features").notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPlanSchema = createInsertSchema(subscriptionPlansTable).omit({ id: true, createdAt: true });
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type SubscriptionPlan = typeof subscriptionPlansTable.$inferSelect;
