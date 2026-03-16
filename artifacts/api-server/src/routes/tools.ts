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
      tools: tools.map(t => ({ ...t, shopName })),
      total,
      page,
      limit,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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
      regionShopIds = regionShops.map(s => s.id);
      // If no shops in region, return empty
      if (regionShopIds.length === 0) {
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

    const uniqueShopIds = [...new Set(tools.map(t => t.shopId))];
    const shops = uniqueShopIds.length > 0
      ? await db.select({ id: shopsTable.id, name: shopsTable.name, region: shopsTable.region }).from(shopsTable)
      : [];
    const shopMap = Object.fromEntries(shops.map(s => [s.id, s.name]));

    res.json({
      tools: tools.map(t => ({ ...t, shopName: shopMap[t.shopId] || "" })),
      total,
      page,
      limit,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

// Create tool
router.post("/", authenticate, requireRole("super_admin", "shop_owner"), async (req, res) => {
  try {
    const body = CreateToolBody.parse(req.body);
    const tempId = Date.now();
    const qrCode = generateQrCode(tempId, body.shopId);
    const [tool] = await db.insert(toolsTable).values({
      name: body.name,
      description: body.description,
      category: body.category,
      shopId: body.shopId,
      pricePerDay: body.pricePerDay,
      depositAmount: body.depositAmount,
      imageUrl: body.imageUrl,
      qrCode,
    }).returning();
    // Update QR with real ID
    const realQr = generateQrCode(tool.id, body.shopId);
    const [updated] = await db.update(toolsTable).set({ qrCode: realQr }).where(eq(toolsTable.id, tool.id)).returning();
    const shop = await db.select().from(shopsTable).where(eq(shopsTable.id, body.shopId)).limit(1);
    res.status(201).json({ ...updated, shopName: shop[0]?.name || "" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

// Update tool
router.patch("/:id", authenticate, requireRole("super_admin", "shop_owner", "worker"), async (req, res) => {
  try {
    const body = UpdateToolBody.parse(req.body);
    const [tool] = await db.update(toolsTable).set(body as any).where(eq(toolsTable.id, Number(req.params.id))).returning();
    if (!tool) {
      res.status(404).json({ error: "Tool not found" });
      return;
    }
    const shop = await db.select().from(shopsTable).where(eq(shopsTable.id, tool.shopId)).limit(1);
    res.json({ ...tool, shopName: shop[0]?.name || "" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export { router as shopToolsRouter };
export default router;
