import { Router } from "express";
import { db, rentalsTable, toolsTable, usersTable, paymentsTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { authenticate } from "../lib/auth.js";
import { CreateRentalBody, ReturnRentalBody, StartRentalByQrBody, ReturnRentalByQrBody } from "@workspace/api-zod";

const router = Router();

async function enrichRental(r: any) {
  const [tool] = await db.select({ name: toolsTable.name }).from(toolsTable).where(eq(toolsTable.id, r.toolId));
  const [customer] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, r.customerId));
  return {
    ...r,
    toolName: tool?.name || "",
    customerName: customer?.name || "",
  };
}

// List all rentals
router.get("/", authenticate, async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status as string | undefined;
    const customerId = req.query.customerId ? Number(req.query.customerId) : undefined;
    const shopId = req.query.shopId ? Number(req.query.shopId) : undefined;
    const user = (req as any).user;

    let conditions: any[] = [];
    if (status) conditions.push(eq(rentalsTable.status, status as any));
    if (customerId) conditions.push(eq(rentalsTable.customerId, customerId));
    if (shopId) conditions.push(eq(rentalsTable.shopId, shopId));
    // Customers only see their own rentals
    if (user.role === "customer") conditions.push(eq(rentalsTable.customerId, user.userId));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const rentals = await db.select().from(rentalsTable).where(whereClause).limit(limit).offset(offset);
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(rentalsTable).where(whereClause);
    const total = Number(countResult[0].count);

    const enriched = await Promise.all(rentals.map(enrichRental));
    res.json({ rentals: enriched, total, page, limit });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

// Create rental
router.post("/", authenticate, async (req, res) => {
  try {
    const body = req.body;
    const toolId = Number(body.toolId);
    const customerId = Number(body.customerId);
    const paymentMethod = body.paymentMethod || "cash";
    if (!toolId || !customerId || !body.dueDate) {
      res.status(400).json({ error: "toolId, customerId va dueDate majburiy" });
      return;
    }
    const [tool] = await db.select().from(toolsTable).where(eq(toolsTable.id, toolId));
    if (!tool) {
      res.status(404).json({ error: "Tool not found" });
      return;
    }
    if (tool.status !== "available") {
      res.status(400).json({ error: "Asbob hozirda mavjud emas (ijarada yoki ta'mirda)" });
      return;
    }
    const rentalDays = body.rentalDays ? Number(body.rentalDays) : 1;
    const totalAmount = tool.pricePerDay * rentalDays + tool.depositAmount;
    const [rental] = await db.insert(rentalsTable).values({
      toolId,
      customerId,
      shopId: tool.shopId,
      workerId: (req as any).user.userId,
      rentalPrice: tool.pricePerDay * rentalDays,
      depositAmount: tool.depositAmount,
      totalAmount,
      paymentMethod: paymentMethod as any,
      dueDate: new Date(body.dueDate),
      status: "active",
      verificationType: body.verificationType || null,
      idFrontUrl: body.idFrontUrl || null,
      idBackUrl: body.idBackUrl || null,
      selfieUrl: body.selfieUrl || null,
      verificationStatus: body.verificationType === "passport" ? "pending" : "approved",
    } as any).returning();

    await db.update(toolsTable).set({ status: "rented" }).where(eq(toolsTable.id, body.toolId));

    // Create payment record
    await db.insert(paymentsTable).values({
      rentalId: rental.id,
      amount: totalAmount,
      method: body.paymentMethod as any,
      status: "completed",
      type: "rental",
    });

    // ─── Avtomatik komissiya hisoblash va do'kon hamyoniga o'tkazish ──────────
    try {
      // Platform komissiyasini olish
      const settingRow = await db.execute(sql`SELECT value FROM platform_settings WHERE key = 'auto_commission_enabled'`);
      const autoCommission = (settingRow.rows[0] as any)?.value === "true";

      if (autoCommission && body.verificationType !== "passport") {
        // Do'konning komissiya foizini olish
        const shopRow = await db.execute(sql`SELECT commission, owner_id FROM shops WHERE id = ${tool.shopId} LIMIT 1`);
        const shop = shopRow.rows[0] as any;
        const commissionRate = shop?.commission || 10;
        const rentalAmount = tool.pricePerDay * rentalDays;
        const commissionAmount = Math.round(rentalAmount * commissionRate / 100);
        const shopAmount = rentalAmount - commissionAmount;
        const ownerId = shop?.owner_id;

        if (ownerId) {
          // Do'kon egasi hamyonini yaratish yoki topish
          await db.execute(sql`
            INSERT INTO wallets (user_id, balance, escrow_balance)
            VALUES (${ownerId}, 0, 0)
            ON CONFLICT (user_id) DO NOTHING
          `);

          // Do'kon egasi hamyoniga ijara summasini komissiyasiz o'tkazish
          const walletRow = await db.execute(sql`SELECT * FROM wallets WHERE user_id = ${ownerId} LIMIT 1`);
          const ownerWallet = walletRow.rows[0] as any;

          await db.execute(sql`
            UPDATE wallets SET balance = balance + ${shopAmount}, updated_at = NOW()
            WHERE user_id = ${ownerId}
          `);

          await db.execute(sql`
            INSERT INTO wallet_transactions (wallet_id, user_id, rental_id, amount, type, provider, status, description, balance_before, balance_after)
            VALUES (
              ${ownerWallet.id}, ${ownerId}, ${rental.id},
              ${shopAmount}, 'payment', 'system', 'completed',
              ${`Ijara #${rental.id} to'lovi (${commissionRate}% komissiya ayirildi)`},
              ${ownerWallet.balance}, ${ownerWallet.balance + shopAmount}
            )
          `);

          // Komissiya logini saqlash
          await db.execute(sql`
            INSERT INTO commission_logs (rental_id, shop_id, total_amount, commission_rate, commission_amount, shop_amount)
            VALUES (${rental.id}, ${tool.shopId}, ${rentalAmount}, ${commissionRate}, ${commissionAmount}, ${shopAmount})
          `);
        }
      }
    } catch (commErr: any) {
      console.error("[Commission] Xatolik:", commErr.message);
    }
    // ─────────────────────────────────────────────────────────────────────────

    const enriched = await enrichRental(rental);
    res.status(201).json(enriched);
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(400).json({ error: "Noto'g'ri so'rov. Qayta urining." });
  }
});

// Start rental by QR
router.post("/start-by-qr", authenticate, async (req, res) => {
  try {
    const body = StartRentalByQrBody.parse(req.body);
    const [tool] = await db.select().from(toolsTable).where(eq(toolsTable.qrCode, body.qrCode));
    if (!tool) {
      res.status(404).json({ error: "Tool not found for this QR code" });
      return;
    }
    if (tool.status !== "available") {
      res.status(400).json({ error: "Tool is not available" });
      return;
    }
    const totalAmount = tool.pricePerDay + tool.depositAmount;
    const [rental] = await db.insert(rentalsTable).values({
      toolId: tool.id,
      customerId: body.customerId,
      shopId: tool.shopId,
      workerId: (req as any).user.userId,
      rentalPrice: tool.pricePerDay,
      depositAmount: tool.depositAmount,
      totalAmount,
      paymentMethod: body.paymentMethod as any,
      dueDate: new Date(body.dueDate),
      status: "active",
    }).returning();

    await db.update(toolsTable).set({ status: "rented" }).where(eq(toolsTable.id, tool.id));

    await db.insert(paymentsTable).values({
      rentalId: rental.id,
      amount: totalAmount,
      method: body.paymentMethod as any,
      status: "completed",
      type: "rental",
    });

    const enriched = await enrichRental(rental);
    res.status(201).json(enriched);
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(400).json({ error: "Noto'g'ri so'rov. Qayta urining." });
  }
});

// Return rental by QR
router.post("/return-by-qr", authenticate, async (req, res) => {
  try {
    const body = ReturnRentalByQrBody.parse(req.body);
    const [tool] = await db.select().from(toolsTable).where(eq(toolsTable.qrCode, body.qrCode));
    if (!tool) {
      res.status(404).json({ error: "Tool not found for this QR code" });
      return;
    }
    const [activeRental] = await db.select().from(rentalsTable)
      .where(and(eq(rentalsTable.toolId, tool.id), eq(rentalsTable.status, "active")));
    if (!activeRental) {
      res.status(404).json({ error: "No active rental for this tool" });
      return;
    }
    const damageCost = body.damageCost || 0;
    const [returned] = await db.update(rentalsTable).set({
      status: "returned",
      returnedAt: new Date(),
      damageNote: body.damageNote,
      damageCost,
    }).where(eq(rentalsTable.id, activeRental.id)).returning();

    await db.update(toolsTable).set({ status: "available" }).where(eq(toolsTable.id, tool.id));

    if (damageCost > 0) {
      await db.insert(paymentsTable).values({
        rentalId: activeRental.id,
        amount: damageCost,
        method: "cash" as any,
        status: "completed",
        type: "damage_deduction",
      });
    }
    const refundAmount = activeRental.depositAmount - damageCost;
    if (refundAmount > 0) {
      await db.insert(paymentsTable).values({
        rentalId: activeRental.id,
        amount: refundAmount,
        method: "cash" as any,
        status: "completed",
        type: "deposit_refund",
      });
    }

    const enriched = await enrichRental(returned);
    res.json(enriched);
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(400).json({ error: "Noto'g'ri so'rov. Qayta urining." });
  }
});

// Get rental by ID
router.get("/:id", authenticate, async (req, res) => {
  try {
    const [rental] = await db.select().from(rentalsTable).where(eq(rentalsTable.id, Number(req.params.id)));
    if (!rental) {
      res.status(404).json({ error: "Rental not found" });
      return;
    }
    const enriched = await enrichRental(rental);
    res.json(enriched);
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

// ─── Do'kon egasi qaytarishni tasdiqlash + depozitni mijozga qaytarish ────────
router.post("/:id/confirm-return", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const rentalId = Number(req.params.id);

    const [rental] = await db.select().from(rentalsTable).where(eq(rentalsTable.id, rentalId));
    if (!rental) {
      res.status(404).json({ error: "Ijara topilmadi" });
      return;
    }

    // Faqat do'kon egasi yoki super_admin tasdiqlashi mumkin
    if (user.role !== "super_admin") {
      const shopCheck = await db.execute(sql`SELECT id FROM shops WHERE id = ${rental.shopId} AND owner_id = ${user.userId} LIMIT 1`);
      if (!shopCheck.rows.length && user.role !== "super_admin") {
        res.status(403).json({ error: "Faqat do'kon egasi tasdiqlashi mumkin" });
        return;
      }
    }

    if (rental.status !== "returned") {
      res.status(400).json({ error: "Ijara qaytarilgan holatda emas" });
      return;
    }

    // Depozitni mijoz hamyoniga qaytarish
    const depositAmount = Number(rental.depositAmount) || 0;
    const damageCost = Number(rental.damageCost) || 0;
    const refundAmount = Math.max(0, depositAmount - damageCost);

    if (depositAmount > 0) {
      // Mijoz hamyonini olish yoki yaratish
      const custWalletRows = await db.execute(sql`SELECT * FROM wallets WHERE user_id = ${rental.customerId} LIMIT 1`);
      let custWallet = custWalletRows.rows[0] as any;
      if (!custWallet) {
        const created = await db.execute(sql`INSERT INTO wallets (user_id, balance, escrow_balance, currency) VALUES (${rental.customerId}, 0, 0, 'UZS') RETURNING *`);
        custWallet = created.rows[0];
      }

      const balBefore = Number(custWallet.balance);
      const escrowBefore = Number(custWallet.escrow_balance);

      if (refundAmount > 0) {
        const newBalance = balBefore + refundAmount;
        const newEscrow = Math.max(0, escrowBefore - depositAmount);
        await db.execute(sql`UPDATE wallets SET balance = ${newBalance}, escrow_balance = ${newEscrow}, updated_at = NOW() WHERE id = ${custWallet.id}`);
        await db.execute(sql`
          INSERT INTO wallet_transactions (wallet_id, user_id, rental_id, amount, type, provider, status, description, balance_before, balance_after)
          VALUES (${custWallet.id}, ${rental.customerId}, ${rentalId}, ${refundAmount}, 'deposit_release', 'system', 'completed', 'Ijara depoziti qaytarildi', ${balBefore}, ${newBalance})
        `);
      }
      if (damageCost > 0) {
        const newEscrow2 = Math.max(0, escrowBefore - depositAmount);
        await db.execute(sql`UPDATE wallets SET escrow_balance = ${newEscrow2}, updated_at = NOW() WHERE id = ${custWallet.id}`);
        await db.execute(sql`
          INSERT INTO wallet_transactions (wallet_id, user_id, rental_id, amount, type, provider, status, description, balance_before, balance_after)
          VALUES (${custWallet.id}, ${rental.customerId}, ${rentalId}, ${damageCost}, 'deposit_deduct', 'system', 'completed', 'Zarar uchun ushlab qolindi', ${balBefore}, ${balBefore})
        `);
      }
    }

    // Ijarani completed holatiga o'tkazish
    const [completed] = await db.update(rentalsTable).set({
      status: "completed",
    } as any).where(eq(rentalsTable.id, rentalId)).returning();

    const enriched = await enrichRental(completed);
    res.json({ ...enriched, depositRefunded: refundAmount, depositDeducted: damageCost });
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
  }
});

// Return rental by ID
router.post("/:id/return", authenticate, async (req, res) => {
  try {
    const body = ReturnRentalBody.parse(req.body);
    const [rental] = await db.select().from(rentalsTable).where(eq(rentalsTable.id, Number(req.params.id)));
    if (!rental) {
      res.status(404).json({ error: "Rental not found" });
      return;
    }
    if (rental.status !== "active") {
      res.status(400).json({ error: "Rental is not active" });
      return;
    }
    const damageCost = body.damageCost || 0;
    const [returned] = await db.update(rentalsTable).set({
      status: "returned",
      returnedAt: new Date(),
      damageNote: body.damageNote,
      damageCost,
    }).where(eq(rentalsTable.id, Number(req.params.id))).returning();

    await db.update(toolsTable).set({ status: "available" }).where(eq(toolsTable.id, rental.toolId));

    const enriched = await enrichRental(returned);
    res.json(enriched);
  } catch (err: any) {
    console.error('[Route Error]', err.message); res.status(400).json({ error: "Noto'g'ri so'rov. Qayta urining." });
  }
});

export default router;
