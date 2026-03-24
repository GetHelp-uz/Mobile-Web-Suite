import { db } from "@workspace/db";

export async function ensurePassportTables() {
  try {
    await db.$client.query(`
      CREATE TABLE IF NOT EXISTS tool_events (
        id SERIAL PRIMARY KEY,
        tool_id INTEGER NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
        shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        rental_id INTEGER REFERENCES rentals(id) ON DELETE SET NULL,
        actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        event_type VARCHAR(40) NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        cost NUMERIC(14,2),
        performed_by TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_tool_events_tool_id ON tool_events(tool_id);
      CREATE INDEX IF NOT EXISTS idx_tool_events_shop_id ON tool_events(shop_id);
      CREATE INDEX IF NOT EXISTS idx_tool_events_created_at ON tool_events(created_at DESC);
    `);
    console.log("[Passport] tool_events table ready");
  } catch (err: any) {
    console.error("[Passport] ensurePassportTables error:", err.message);
  }
}

export async function addToolEvent(params: {
  toolId: number;
  shopId: number;
  eventType: string;
  title: string;
  description?: string;
  rentalId?: number;
  actorId?: number;
  cost?: number;
  performedBy?: string;
}) {
  try {
    await db.$client.query(
      `INSERT INTO tool_events (tool_id, shop_id, event_type, title, description, rental_id, actor_id, cost, performed_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        params.toolId, params.shopId, params.eventType, params.title,
        params.description || null, params.rentalId || null,
        params.actorId || null, params.cost || null, params.performedBy || null,
      ]
    );
  } catch (err: any) {
    console.error("[Passport] addToolEvent error:", err.message);
  }
}
