import { pgTable, text, serial, integer, timestamp, real, boolean, pgEnum } from "drizzle-orm/pg-core";

export const fundStatusEnum = pgEnum("fund_status", [
  "active",   // Ochiq — investitsiya qabul qilmoqda
  "closed",   // To'liq to'plangan — yangi investitsiya yo'q
  "matured",  // Muddat tugagan — asosiy pul qaytarilgan
  "cancelled" // Bekor qilingan
]);

export const investmentStatusEnum = pgEnum("investment_status", [
  "active",   // Faol
  "returned", // Asosiy pul qaytarilgan
  "cancelled" // Bekor qilingan
]);

// Ijara fondlari jadvali
export const investmentFundsTable = pgTable("investment_funds", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  toolType: text("tool_type").notNull(),       // Qaysi asbob turi
  shopId: integer("shop_id"),                   // Qaysi do'kon ishlatadi
  targetAmount: real("target_amount").notNull(), // Maqsad summa (so'm)
  collectedAmount: real("collected_amount").notNull().default(0), // To'plangan summa
  annualReturnRate: real("annual_return_rate").notNull(), // Yillik daromad foizi (masalan: 28.5)
  durationMonths: integer("duration_months").notNull(), // Davomiylik (oy)
  minInvestment: real("min_investment").notNull().default(500000), // Minimum investitsiya (500,000 so'm)
  status: fundStatusEnum("status").notNull().default("active"),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),               // Muddat tugash sanasi
  createdBy: integer("created_by").notNull(),   // Admin user ID
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Foydalanuvchi investitsiyalari jadvali
export const userInvestmentsTable = pgTable("user_investments", {
  id: serial("id").primaryKey(),
  fundId: integer("fund_id").notNull(),
  userId: integer("user_id").notNull(),
  amount: real("amount").notNull(),              // Investitsiya miqdori
  sharePercent: real("share_percent").notNull().default(0), // Ulush foizi
  earnedAmount: real("earned_amount").notNull().default(0), // To'plangan daromad
  status: investmentStatusEnum("status").notNull().default("active"),
  investedAt: timestamp("invested_at").defaultNow(),
  returnedAt: timestamp("returned_at"),          // Qaytarilgan sana
  createdAt: timestamp("created_at").defaultNow(),
});

export type InvestmentFund = typeof investmentFundsTable.$inferSelect;
export type UserInvestment = typeof userInvestmentsTable.$inferSelect;
