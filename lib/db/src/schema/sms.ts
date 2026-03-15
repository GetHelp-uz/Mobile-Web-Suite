import { pgTable, text, serial, integer, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";

export const smsStatusEnum = pgEnum("sms_status", ["pending", "sent", "failed", "delivered"]);
export const smsTemplateTypeEnum = pgEnum("sms_template_type", [
  "overdue",
  "reminder",
  "welcome",
  "return_confirm",
  "custom",
]);

// SMS provider sozlamalari (global yoki shop uchun)
export const smsSettingsTable = pgTable("sms_settings", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id"), // null = global (admin)
  provider: text("provider").notNull().default("eskiz"), // eskiz | playmobile | twilio
  email: text("email"),
  password: text("password"),
  token: text("token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  senderId: text("sender_id").notNull().default("4546"),
  isActive: boolean("is_active").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// SMS shablonlari
export const smsTemplatesTable = pgTable("sms_templates", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id"), // null = global
  name: text("name").notNull(),
  type: smsTemplateTypeEnum("type").notNull().default("custom"),
  message: text("message").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// SMS yuborish tarixi
export const smsLogsTable = pgTable("sms_logs", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id"),
  rentalId: integer("rental_id"),
  phone: text("phone").notNull(),
  message: text("message").notNull(),
  status: smsStatusEnum("status").notNull().default("pending"),
  provider: text("provider").notNull().default("eskiz"),
  providerMessageId: text("provider_message_id"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").defaultNow(),
});

export type SmsSettings = typeof smsSettingsTable.$inferSelect;
export type SmsTemplate = typeof smsTemplatesTable.$inferSelect;
export type SmsLog = typeof smsLogsTable.$inferSelect;
