import { Router } from "express";
import { db, toolsTable, shopsTable } from "@workspace/db";
import { eq, sql, and, inArray } from "drizzle-orm";
import { authenticate, requireRole } from "../lib/auth.js";
import { CreateToolBody, UpdateToolBody } from "@workspace/api-zod";
import crypto from "crypto";

const router = Router();

function generateQrCode(toolId: number, shopId: number): string {
  const data = `tool:${toolId}:shop:${shopId}:${Date.now()}`;
  return crypto.createHash("sha256").update(data).digest("hex").slice(0, 16);
}

// List tools for a specific shop (mounted under /shops/:shopId/tools)
router.get("/shops/:shopId/tools", async (req, res) => {
  try {
    const shopId = Number(req.params.shopId);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status as string | undefined;

    let conditions: any[] = [eq(toolsTable.shopId, shopId)];
    if (status) conditions.push(eq(toolsTable.status, status as any));

    const tools = await db.select().from(toolsTable).where(and(...conditions)).limit(limit).offset(offset);
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(toolsTable).where(and(...conditions));
    const total = Number(countResult[0].count);

    const shop = await db.select().from(shopsTable).where(eq(shopsTable.id, shopId)).limit(1);
    const shopName = shop[0]?.name || "";

    res.json({
      tools: tools.map((t: any) => ({ ...t, shopName })),
      total,
      page,
      limit,
    });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

// List all tools
router.get("/", async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status as string | undefined;
    const shopId = req.query.shopId ? Number(req.query.shopId) : undefined;
    const category = req.query.category as string | undefined;
    const region = req.query.region as string | undefined;

    // If region filter requested, get shop IDs for that region first
    let regionShopIds: number[] | undefined;
    if (region) {
      const regionShops = await db
        .select({ id: shopsTable.id })
        .from(shopsTable)
        .where(eq(shopsTable.region, region));
      regionShopIds = regionShops.map((s: any) => s.id);
      // If no shops in region, return empty
      if ((regionShopIds as number[]).length === 0) {
        res.json({ tools: [], total: 0, page, limit });
        return;
      }
    }

    let conditions: any[] = [];
    if (status) conditions.push(eq(toolsTable.status, status as any));
    if (shopId) conditions.push(eq(toolsTable.shopId, shopId));
    if (category) conditions.push(eq(toolsTable.category, category));
    if (regionShopIds) conditions.push(inArray(toolsTable.shopId, regionShopIds));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const tools = await db.select().from(toolsTable).where(whereClause).limit(limit).offset(offset);
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(toolsTable).where(whereClause);
    const total = Number(countResult[0].count);

    const uniqueShopIds = [...new Set(tools.map((t: any) => t.shopId))];
    const shops = uniqueShopIds.length > 0
      ? await db.select({ id: shopsTable.id, name: shopsTable.name, region: shopsTable.region }).from(shopsTable)
      : [];
    const shopMap = Object.fromEntries(shops.map((s: any) => [s.id, s.name]));

    res.json({
      tools: tools.map((t: any) => ({ ...t, shopName: shopMap[t.shopId] || "" })),
      total,
      page,
      limit,
    });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

// Get QR code for tool - must be before /:id
router.get("/scan/:qrCode", async (req, res) => {
  try {
    const [tool] = await db.select().from(toolsTable).where(eq(toolsTable.qrCode, req.params.qrCode));
    if (!tool) {
      res.status(404).json({ error: "Tool not found" });
      return;
    }
    const shop = await db.select().from(shopsTable).where(eq(shopsTable.id, tool.shopId)).limit(1);
    res.json({ ...tool, shopName: shop[0]?.name || "" });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

// GET /api/tools/barcode-check/:code — shtrix/QR kod tekshirish (mavjudmi?)
router.get("/barcode-check/:code", async (req, res) => {
  try {
    const code = decodeURIComponent(req.params.code);
    // custom_barcode yoki qr_code orqali qidirish
    const rows = await db.execute(sql`
      SELECT t.*, s.name as shop_name
      FROM tools t
      LEFT JOIN shops s ON s.id = t.shop_id
      WHERE t.custom_barcode = ${code}
         OR t.qr_code = ${code}
      LIMIT 1
    `);
    if (rows.rows.length === 0) {
      res.json({ exists: false });
      return;
    }
    const tool = rows.rows[0] as any;
    res.json({ exists: true, tool });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

// Create tool
router.post("/", authenticate, requireRole("super_admin", "shop_owner"), async (req, res) => {
  try {
    if (req.body === undefined) {
      console.error("[POST /api/tools] req.body is undefined. Headers:", req.headers);
    }
    const body = CreateToolBody.parse(req.body || {});
    const user = (req as any).user;

    // Validate shopId for non-admins
    if (user.role !== "super_admin") {
      if (!user.shopId || body.shopId !== user.shopId) {
        res.status(403).json({ error: "Siz faqat o'zingizning do'koningizga asbob qo'sha olasiz." });
        return;
      }
    }

    if (!body.shopId || body.shopId === 0) {
      res.status(400).json({ error: "Do'kon ID-si noto'g'ri. Iltimos, sahifani yangilab qayta urining." });
      return;
    }

    const customBarcode = body.customBarcode || null;

    // Shtrix kod unique tekshiruvi
    if (customBarcode) {
      const existing = await db.execute(sql`SELECT id, name FROM tools WHERE custom_barcode = ${customBarcode} LIMIT 1`);
      if (existing.rows.length > 0) {
        const ex = existing.rows[0] as any;
        res.status(400).json({ error: `Bu shtrix kod allaqachon "${ex.name}" asbobida ishlatilgan (ID: ${ex.id})` });
        return;
      }
    }

    const tempId = Date.now();
    const qrCode = generateQrCode(tempId, body.shopId);
    
    // We will initially insert the user provided barcode, or we'll update it right after with the generated ID
    const initialBarcode = customBarcode || undefined;

    const [tool] = await db.insert(toolsTable).values({
      name: body.name,
      description: body.description,
      category: body.category,
      shopId: body.shopId,
      pricePerDay: body.pricePerDay,
      depositAmount: body.depositAmount,
      pricePerHour: body.pricePerHour,
      imageUrl: body.imageUrl,
      customBarcode: initialBarcode,
      qrCode,
    }).returning();

    // Update QR with real ID + generate Code-128 barcode if none provided
    const realQr = generateQrCode(tool.id, body.shopId);
    // Auto-generate barcode: GH + zero-padded shopId (4 digits) + zero-padded toolId (6 digits)
    const finalBarcode = customBarcode || `GH${String(body.shopId).padStart(4, "0")}${String(tool.id).padStart(6, "0")}`;
    await db.execute(sql`
      UPDATE tools SET qr_code = ${realQr}, custom_barcode = ${finalBarcode}
      WHERE id = ${tool.id}
    `);
    const updatedRow = await db.execute(sql`SELECT * FROM tools WHERE id = ${tool.id} LIMIT 1`);
    const updated = updatedRow.rows[0] as any;
    const shop = await db.select().from(shopsTable).where(eq(shopsTable.id, body.shopId)).limit(1);
    res.status(201).json({ ...updated, tool: { ...updated, shopName: shop[0]?.name || "" }, shopName: shop[0]?.name || "" });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(400).json({ error: "Noto'g'ri so'rov. Qayta urining." });
  }
});

// Get tool by ID
router.get("/:id", async (req, res) => {
  try {
    const [tool] = await db.select().from(toolsTable).where(eq(toolsTable.id, Number(req.params.id)));
    if (!tool) {
      res.status(404).json({ error: "Tool not found" });
      return;
    }
    const shop = await db.select().from(shopsTable).where(eq(shopsTable.id, tool.shopId)).limit(1);
    res.json({ ...tool, shopName: shop[0]?.name || "" });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

// Update tool
router.patch("/:id", authenticate, requireRole("super_admin", "shop_owner", "worker"), async (req, res) => {
  try {
    const body = UpdateToolBody.parse(req.body);
    const customBarcode = body.customBarcode;
    const toolId = Number(req.params.id);
    const [tool] = await db.update(toolsTable).set(body as any).where(eq(toolsTable.id, toolId)).returning();
    if (!tool) {
      res.status(404).json({ error: "Tool not found" });
      return;
    }
    // Ensure barcode is set: preserve existing or generate if missing
    const existingBarcode = await db.$client.query(
      `SELECT custom_barcode FROM tools WHERE id = $1 LIMIT 1`, [toolId]
    );
    const currentBarcode = (existingBarcode.rows[0] as any)?.custom_barcode;
    if (customBarcode !== undefined || !currentBarcode) {
      const finalBarcode = customBarcode || `GH${String(tool.shopId).padStart(4, "0")}${String(toolId).padStart(6, "0")}`;
      await db.execute(sql`UPDATE tools SET custom_barcode = ${finalBarcode} WHERE id = ${toolId}`);
    }
    const shop = await db.select().from(shopsTable).where(eq(shopsTable.id, tool.shopId)).limit(1);
    res.json({ ...tool, shopName: shop[0]?.name || "" });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(400).json({ error: "Noto'g'ri so'rov. Qayta urining." });
  }
});

// Delete tool
router.delete("/:id", authenticate, requireRole("super_admin", "shop_owner"), async (req, res) => {
  try {
    const [deleted] = await db.delete(toolsTable).where(eq(toolsTable.id, Number(req.params.id))).returning();
    if (!deleted) {
      res.status(404).json({ error: "Tool not found" });
      return;
    }
    res.json({ message: "Tool deleted" });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

// Get QR code data for a tool
router.get("/:id/qr", authenticate, async (req, res) => {
  try {
    const [tool] = await db.select().from(toolsTable).where(eq(toolsTable.id, Number(req.params.id)));
    if (!tool) {
      res.status(404).json({ error: "Tool not found" });
      return;
    }
    res.json({
      toolId: tool.id,
      qrCode: tool.qrCode,
      qrImageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(tool.qrCode)}`,
    });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

// GET /api/tools/:id/barcode-image — Code-128 barcode SVG (bosib chiqarish uchun)
router.get("/:id/barcode-image", authenticate, async (req, res) => {
  try {
    const result = await db.$client.query(
      `SELECT id, name, custom_barcode, qr_code FROM tools WHERE id = $1 LIMIT 1`,
      [Number(req.params.id)]
    );
    const tool = result.rows[0];
    if (!tool) { res.status(404).json({ error: "Asbob topilmadi" }); return; }
    const barcodeValue = tool.custom_barcode || `GH${String(tool.id).padStart(6, "0")}`;
    const { generateCode128SVG } = await import("../lib/barcode-svg.js");
    const svg = generateCode128SVG(barcodeValue, { height: 70, moduleWidth: 2, showText: true });
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(svg);
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

// PATCH /api/tools/:id/stock — zaxira miqdorini yangilash
router.patch("/:id/stock", authenticate, requireRole("super_admin", "shop_owner"), async (req, res) => {
  try {
    const { stockCount } = req.body;
    if (stockCount === undefined || stockCount < 0) {
      res.status(400).json({ error: "stockCount musbat son bo'lishi kerak" }); return;
    }
    await db.execute(sql`UPDATE tools SET stock_count = ${Number(stockCount)} WHERE id = ${Number(req.params.id)}`);
    res.json({ success: true, stockCount: Number(stockCount) });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// GET /api/tools/:id/passport — asbob pasporti (faqat super_admin, shop_owner, worker)
router.get("/:id/passport", authenticate, requireRole("super_admin", "shop_owner", "worker"), async (req, res) => {
  try {
    const toolId = Number(req.params.id);
    const user = (req as any).user;

    const toolResult = await db.$client.query(
      `SELECT t.*, s.name as shop_name, s.phone as shop_phone, s.address as shop_address
       FROM tools t
       JOIN shops s ON s.id = t.shop_id
       WHERE t.id = $1`,
      [toolId]
    );
    if (!toolResult.rows.length) {
      res.status(404).json({ error: "Asbob topilmadi" }); return;
    }
    const tool = toolResult.rows[0];

    // Non-admin roles can only view tools belonging to their own shop
    if (user.role !== "super_admin" && tool.shop_id !== user.shopId) {
      res.status(403).json({ error: "Ruxsat yo'q" }); return;
    }

    const eventsResult = await db.$client.query(
      `SELECT te.*, u.name as actor_name
       FROM tool_events te
       LEFT JOIN users u ON u.id = te.actor_id
       WHERE te.tool_id = $1
       ORDER BY te.created_at DESC`,
      [toolId]
    );

    const statsResult = await db.$client.query(
      `SELECT
         COUNT(*) FILTER (WHERE event_type = 'rental_started') as total_rentals,
         COUNT(*) FILTER (WHERE event_type = 'maintenance_started') as total_maintenance,
         COUNT(*) FILTER (WHERE event_type = 'repair') as total_repairs,
         COALESCE(SUM(cost) FILTER (WHERE event_type IN ('repair','maintenance_completed')), 0) as total_maintenance_cost
       FROM tool_events
       WHERE tool_id = $1`,
      [toolId]
    );

    res.json({ tool, events: eventsResult.rows, stats: statsResult.rows[0] });
  } catch (err: any) {
    console.error("[Passport] GET /:id/passport error:", err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// POST /api/tools/:id/events — yangi voqea qo'shish
router.post("/:id/events", authenticate, requireRole("super_admin", "shop_owner", "worker"), async (req, res) => {
  try {
    const toolId = Number(req.params.id);
    const user = (req as any).user;
    const { eventType, title, description, cost, performedBy } = req.body;

    if (!eventType || !title) {
      res.status(400).json({ error: "eventType va title majburiy" }); return;
    }

    const VALID_EVENT_TYPES = [
      "rental_started", "rental_returned", "maintenance_started",
      "maintenance_completed", "repair", "inspection", "damage", "note", "sold", "transferred", "modification"
    ];
    if (!VALID_EVENT_TYPES.includes(eventType)) {
      res.status(400).json({ error: "Noto'g'ri event_type" }); return;
    }

    const toolResult = await db.$client.query(
      "SELECT id, shop_id FROM tools WHERE id = $1",
      [toolId]
    );
    if (!toolResult.rows.length) {
      res.status(404).json({ error: "Asbob topilmadi" }); return;
    }
    const tool = toolResult.rows[0];

    // Non-admin roles (shop_owner, worker) can only write events for tools in their own shop
    if (user.role !== "super_admin" && tool.shop_id !== user.shopId) {
      res.status(403).json({ error: "Ruxsat yo'q" }); return;
    }

    const result = await db.$client.query(
      `INSERT INTO tool_events (tool_id, shop_id, event_type, title, description, actor_id, cost, performed_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [toolId, tool.shop_id, eventType, title, description || null, user.id, cost || null, performedBy || null]
    );

    res.json({ success: true, event: result.rows[0] });
  } catch (err: any) {
    console.error("[Passport] POST /:id/events error:", err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

export { router as shopToolsRouter };
export default router;
