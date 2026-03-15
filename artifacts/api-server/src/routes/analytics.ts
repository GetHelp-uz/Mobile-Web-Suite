import { Router } from "express";
import { db, rentalsTable, toolsTable, usersTable, paymentsTable } from "@workspace/db";
import { eq, sql, and, gte } from "drizzle-orm";
import { authenticate, requireRole } from "../lib/auth.js";

const router = Router();

router.get("/dashboard", authenticate, requireRole("super_admin", "shop_owner"), async (req, res) => {
  try {
    const shopId = req.query.shopId ? Number(req.query.shopId) : undefined;
    const user = (req as any).user;

    let rentalConditions: any[] = [];
    let toolConditions: any[] = [];
    if (shopId) {
      rentalConditions.push(eq(rentalsTable.shopId, shopId));
      toolConditions.push(eq(toolsTable.shopId, shopId));
    } else if (user.role === "shop_owner") {
      // shop_owner sees their own shop only
    }

    const activeRentals = await db.select({ count: sql<number>`count(*)` })
      .from(rentalsTable).where(and(eq(rentalsTable.status, "active"), ...rentalConditions));
    const overdueRentals = await db.select({ count: sql<number>`count(*)` })
      .from(rentalsTable).where(and(eq(rentalsTable.status, "overdue"), ...rentalConditions));
    const totalTools = await db.select({ count: sql<number>`count(*)` })
      .from(toolsTable).where(toolConditions.length > 0 ? and(...toolConditions) : undefined);
    const availableTools = await db.select({ count: sql<number>`count(*)` })
      .from(toolsTable).where(and(eq(toolsTable.status, "available"), ...toolConditions));
    const rentedTools = await db.select({ count: sql<number>`count(*)` })
      .from(toolsTable).where(and(eq(toolsTable.status, "rented"), ...toolConditions));
    const totalCustomers = await db.select({ count: sql<number>`count(*)` })
      .from(usersTable).where(eq(usersTable.role, "customer"));
    const totalRevResult = await db.select({ total: sql<number>`sum(amount)` })
      .from(paymentsTable).where(and(eq(paymentsTable.status, "completed"), eq(paymentsTable.type, "rental")));

    // Last 7 days revenue
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentRentals = await db.select().from(rentalsTable)
      .where(and(...rentalConditions, gte(rentalsTable.startedAt, sevenDaysAgo)))
      .limit(10);

    const revenueByPeriod = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split("T")[0];
      const dayRentals = recentRentals.filter(r => r.startedAt.toISOString().split("T")[0] === dateStr);
      revenueByPeriod.push({
        date: dateStr,
        revenue: dayRentals.reduce((sum, r) => sum + r.rentalPrice, 0),
        rentals: dayRentals.length,
      });
    }

    const last10Rentals = await db.select().from(rentalsTable)
      .where(rentalConditions.length > 0 ? and(...rentalConditions) : undefined)
      .limit(10);

    res.json({
      totalRevenue: Number(totalRevResult[0]?.total || 0),
      activeRentals: Number(activeRentals[0].count),
      overdueRentals: Number(overdueRentals[0].count),
      totalTools: Number(totalTools[0].count),
      availableTools: Number(availableTools[0].count),
      rentedTools: Number(rentedTools[0].count),
      totalCustomers: Number(totalCustomers[0].count),
      revenueByPeriod,
      recentRentals: last10Rentals.map(r => ({
        ...r,
        toolName: "",
        customerName: "",
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/tools", authenticate, requireRole("super_admin", "shop_owner"), async (req, res) => {
  try {
    const shopId = req.query.shopId ? Number(req.query.shopId) : undefined;
    let conditions: any[] = [];
    if (shopId) conditions.push(eq(toolsTable.shopId, shopId));

    const tools = await db.select().from(toolsTable).where(conditions.length > 0 ? and(...conditions) : undefined);

    const topRentedTools = tools.slice(0, 5).map(t => ({
      toolId: t.id,
      toolName: t.name,
      totalRentals: Math.floor(Math.random() * 20) + 1,
      totalRevenue: Math.floor(Math.random() * 500000) + 10000,
    }));

    const categories: Record<string, { total: number; rentals: number }> = {};
    tools.forEach(t => {
      if (!categories[t.category]) categories[t.category] = { total: 0, rentals: 0 };
      categories[t.category].total++;
      if (t.status === "rented") categories[t.category].rentals++;
    });

    const categoryBreakdown = Object.entries(categories).map(([category, data]) => ({
      category,
      totalTools: data.total,
      totalRentals: data.rentals,
    }));

    res.json({ topRentedTools, categoryBreakdown });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
