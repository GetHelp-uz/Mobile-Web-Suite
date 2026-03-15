import { pgTable, text, serial, integer, timestamp, real, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const toolStatusEnum = pgEnum("tool_status", ["available", "rented", "maintenance"]);

export const toolsTable = pgTable("tools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  shopId: integer("shop_id").notNull(),
  pricePerDay: real("price_per_day").notNull(),
  depositAmount: real("deposit_amount").notNull(),
  status: toolStatusEnum("status").notNull().default("available"),
  qrCode: text("qr_code").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertToolSchema = createInsertSchema(toolsTable).omit({ id: true, createdAt: true });
export type InsertTool = z.infer<typeof insertToolSchema>;
export type Tool = typeof toolsTable.$inferSelect;
