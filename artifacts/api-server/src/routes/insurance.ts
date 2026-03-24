import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate, requireRole } from "../lib/auth.js";

const router = Router();

// GET /api/insurance/policies — barcha sug'urta rejalari
router.get("/policies", async (_req, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM insurance_policies WHERE is_active = TRUE ORDER BY daily_rate ASC`);
    res.json({ policies: rows.rows });
  } catch (err: any) { console.error('[Insurance]', err.message); res.status(500).json({ error: 'Server xatosi' }); }
});

// GET /api/insurance/my-claims — foydalanuvchi da'volari
router.get("/my-claims", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const rows = await db.execute(sql`
      SELECT ic.*, ip.name as policy_name, r.started_at, t.name as tool_name
      FROM insurance_claims ic
      LEFT JOIN insurance_policies ip ON ip.id = ic.policy_id
      LEFT JOIN rentals r ON r.id = ic.rental_id
      LEFT JOIN tools t ON t.id = r.tool_id
      WHERE ic.user_id = ${user.userId}
      ORDER BY ic.created_at DESC
    `);
    res.json({ claims: rows.rows });
  } catch (err: any) { console.error('[Insurance]', err.message); res.status(500).json({ error: 'Server xatosi' }); }
});

// POST /api/insurance/claims — yangi da'vo yaratish
router.post("/claims", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { rentalId, policyId, claimAmount, description, evidenceUrls } = req.body;
    if (!rentalId || !claimAmount || !description) {
      res.status(400).json({ error: "rentalId, claimAmount, description majburiy" });
      return;
    }
    const rental = await db.execute(sql`SELECT * FROM rentals WHERE id = ${Number(rentalId)} AND user_id = ${user.userId} LIMIT 1`);
    if (!rental.rows.length) { res.status(404).json({ error: "Ijara topilmadi" }); return; }
    const r = rental.rows[0] as any;

    const claim = await db.execute(sql`
      INSERT INTO insurance_claims (rental_id, policy_id, user_id, shop_id, claim_amount, description, evidence_urls)
      VALUES (${rentalId}, ${policyId || null}, ${user.userId}, ${r.shop_id}, ${Number(claimAmount)}, ${description}, ${evidenceUrls || null})
      RETURNING *
    `);
    res.status(201).json({ claim: claim.rows[0] });
  } catch (err: any) { console.error('[Insurance]', err.message); res.status(500).json({ error: 'Server xatosi' }); }
});

// GET /api/insurance/shop-claims — do'kon da'volari (shop_owner)
router.get("/shop-claims", authenticate, requireRole("shop_owner", "super_admin"), async (req, res) => {
  try {
    const user = (req as any).user;
    let shopFilter = sql`1=1`;
    if (user.role === "shop_owner") {
      const shop = await db.execute(sql`SELECT id FROM shops WHERE owner_id = ${user.userId} LIMIT 1`);
      if (!shop.rows.length) { res.json({ claims: [] }); return; }
      shopFilter = sql`ic.shop_id = ${(shop.rows[0] as any).id}`;
    }
    const rows = await db.execute(sql`
      SELECT ic.*, ip.name as policy_name, u.name as user_name, u.phone as user_phone, t.name as tool_name
      FROM insurance_claims ic
      LEFT JOIN insurance_policies ip ON ip.id = ic.policy_id
      LEFT JOIN users u ON u.id = ic.user_id
      LEFT JOIN rentals r ON r.id = ic.rental_id
      LEFT JOIN tools t ON t.id = r.tool_id
      WHERE ${shopFilter}
      ORDER BY ic.created_at DESC
    `);
    res.json({ claims: rows.rows });
  } catch (err: any) { console.error('[Insurance]', err.message); res.status(500).json({ error: 'Server xatosi' }); }
});

// PATCH /api/insurance/claims/:id — da'voni ko'rib chiqish (admin/shop)
router.patch("/claims/:id", authenticate, requireRole("super_admin", "shop_owner"), async (req, res) => {
  try {
    const user = (req as any).user;
    const { status, approvedAmount } = req.body;
    if (!["approved", "rejected", "paid"].includes(status)) {
      res.status(400).json({ error: "Status: approved | rejected | paid" });
      return;
    }
    await db.execute(sql`
      UPDATE insurance_claims
      SET status = ${status}, approved_amount = ${approvedAmount || null}, reviewed_by = ${user.userId}, reviewed_at = NOW()
      WHERE id = ${Number(req.params.id)}
    `);
    res.json({ success: true });
  } catch (err: any) { console.error('[Insurance]', err.message); res.status(500).json({ error: 'Server xatosi' }); }
});

// Admin: CRUD policies
router.post("/policies", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const { name, description, coveragePercent, dailyRate, maxCoverage } = req.body;
    if (!name || !dailyRate) { res.status(400).json({ error: "name, dailyRate majburiy" }); return; }
    const r = await db.execute(sql`
      INSERT INTO insurance_policies (name, description, coverage_percent, daily_rate, max_coverage)
      VALUES (${name}, ${description || null}, ${coveragePercent || 80}, ${Number(dailyRate)}, ${maxCoverage || 5000000})
      RETURNING *
    `);
    res.status(201).json({ policy: r.rows[0] });
  } catch (err: any) { console.error('[Insurance]', err.message); res.status(500).json({ error: 'Server xatosi' }); }
});

export default router;
