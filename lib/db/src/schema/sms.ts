import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";

export const smsSettingsTable = pgTable("sms_settings", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id"),
  provider: text("provider").notNull().default("eskiz"),
  label: text("label"),
  country: text("country").default("uz"),
  email: text("email"),
  password: text("password"),
  apiKey: text("api_key"),
  token: text("token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  senderId: text("sender_id").notNull().default("4546"),
  isActive: boolean("is_active").notNull().default(false),
  isGlobal: boolean("is_global").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const smsTemplatesTable = pgTable("sms_templates", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id"),
  name: text("name").notNull(),
  type: text("type").notNull().default("custom"),
  lang: text("lang").notNull().default("uz"),
  message: text("message").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const smsLogsTable = pgTable("sms_logs", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id"),
  rentalId: integer("rental_id"),
  phone: text("phone").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("pending"),
  provider: text("provider").notNull().default("eskiz"),
  templateType: text("template_type"),
  lang: text("lang").default("uz"),
  providerMessageId: text("provider_message_id"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").defaultNow(),
});

export type SmsSettings = typeof smsSettingsTable.$inferSelect;
export type SmsTemplate = typeof smsTemplatesTable.$inferSelect;
export type SmsLog = typeof smsLogsTable.$inferSelect;
