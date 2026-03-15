import { Router } from "express";
import { db, paymentsTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { authenticate } from "../lib/auth.js";
import { CreatePaymentBody } from "@workspace/api-zod";

const router = Router();

router.get("/", authenticate, async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status as string | undefined;
    const rentalId = req.query.rentalId ? Number(req.query.rentalId) : undefined;

    let conditions: any[] = [];
    if (status) conditions.push(eq(paymentsTable.status, status as any));
    if (rentalId) conditions.push(eq(paymentsTable.rentalId, rentalId));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const payments = await db.select().from(paymentsTable).where(whereClause).limit(limit).offset(offset);
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(paymentsTable).where(whereClause);
    const total = Number(countResult[0].count);

    res.json({ payments, total, page, limit });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", authenticate, async (req, res) => {
  try {
    const body = CreatePaymentBody.parse(req.body);
    const [payment] = await db.insert(paymentsTable).values({
      rentalId: body.rentalId,
      amount: body.amount,
      method: body.method as any,
      status: "completed",
      type: body.type as any,
    }).returning();
    res.status(201).json(payment);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/:id", authenticate, async (req, res) => {
  try {
    const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, Number(req.params.id)));
    if (!payment) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }
    res.json(payment);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
