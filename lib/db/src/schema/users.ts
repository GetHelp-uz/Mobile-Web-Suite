import { pgTable, text, serial, boolean, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const roleEnum = pgEnum("user_role", ["super_admin", "shop_owner", "worker", "customer"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").unique(),
  phone: text("phone").notNull().unique(),
  email: text("email"),
  password: text("password").notNull(),
  role: roleEnum("role").notNull().default("customer"),
  shopId: integer("shop_id"),
  region: text("region"),
  district: text("district"),
  address: text("address"),
  homeLat: text("home_lat"),
  homeLng: text("home_lng"),
  preferredLang: text("preferred_lang").default("uz"),
  passportId: text("passport_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
