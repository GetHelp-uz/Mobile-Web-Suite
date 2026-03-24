import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";

export const toolEventsTable = pgTable("tool_events", {
  id: serial("id").primaryKey(),
  toolId: integer("tool_id").notNull(),
  shopId: integer("shop_id").notNull(),
  rentalId: integer("rental_id"),
  actorId: integer("actor_id"),
  eventType: text("event_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  cost: numeric("cost", { precision: 14, scale: 2 }),
  performedBy: text("performed_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type ToolEvent = typeof toolEventsTable.$inferSelect;
