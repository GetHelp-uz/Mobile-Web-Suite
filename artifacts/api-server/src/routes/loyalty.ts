import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate } from "../lib/auth.js";

const router = Router();

const LEVELS = [
  { name: "bronze",   minPoints: 0,    color: "#CD7F32", multiplier: 1 },
  { name: "silver",   minPoints: 500,  color: "#C0C0C0", multiplier: 1.5 },
  { name: "gold",     minPoints: 2000, color: "#FFD700", multiplier: 2 },
  { name: "platinum", minPoints: 5000, color: "#E5E4E2", multiplier: 3 },
];

function getLevel(points: number) {
  let level = LEVELS[0];
  for (const l of LEVELS) {
    if (points >= l.minPoints) level = l;
  }
  return level;
}

export async function awardPoints(userId: number, amount: number, rentalId?: number, description?: string) {
  const pointsEarned = Math.floor(amount / 10000); // 1 ball = 10,000 so'm
  if (pointsEarned <= 0) return;

  const existing = await db.execute(sql`SELECT * FROM loyalty_points WHERE user_id = ${userId} LIMIT 1`);
  if (!existing.rows.length) {
    await db.execute(sql`INSERT INTO loyalty_points (user_id, total_points, lifetime_points) VALUES (${userId}, 0, 0)`);
  }

  const curr = await db.execute(sql`SELECT total_points, lifetime_points FROM loyalty_points WHERE user_id = ${userId} LIMIT 1`);
  const c = curr.rows[0] as any;
  const newTotal = (c.total_points || 0) + pointsEarned;
  const newLifetime = (c.lifetime_points || 0) + pointsEarned;
  const level = getLevel(newLifetime);

  await db.execute(sql`
    UPDATE loyalty_points SET total_points = ${newTotal}, lifetime_points = ${newLifetime}, level = ${level.name}, updated_at = NOW()
    WHERE user_id = ${userId}
  `);
  await db.execute(sql`
    INSERT INTO loyalty_transactions (user_id, rental_id, points, type, description)
    VALUES (${userId}, ${rentalId || null}, ${pointsEarned}, 'earn', ${description || 'Ijara uchun bonus ball'})
  `);
  return pointsEarned;
}

// GET /api/loyalty/my
router.get("/my", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    let lp = await db.execute(sql`SELECT * FROM loyalty_points WHERE user_id = ${user.userId} LIMIT 1`);
    if (!lp.rows.length) {
      await db.execute(sql`INSERT INTO loyalty_points (user_id, total_points, lifetime_points) VALUES (${user.userId}, 0, 0)`);
      lp = await db.execute(sql`SELECT * FROM loyalty_points WHERE user_id = ${user.userId} LIMIT 1`);
    }
    const p = lp.rows[0] as any;
    const level = getLevel(p.lifetime_points || 0);
    const nextLevel = LEVELS.find(l => l.minPoints > (p.lifetime_points || 0)) || null;

    const txns = await db.execute(sql`
      SELECT * FROM loyalty_transactions WHERE user_id = ${user.userId} ORDER BY created_at DESC LIMIT 20
    `);
    res.json({
      points: p,
      level,
      nextLevel,
      transactions: txns.rows,
      pointsToNext: nextLevel ? nextLevel.minPoints - (p.lifetime_points || 0) : 0,
    });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// POST /api/loyalty/redeem — ballarni chegirmaga almashtirish
router.post("/redeem", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { points, rentalId } = req.body;
    if (!points || points < 50) { res.status(400).json({ error: "Kamida 50 ball kerak" }); return; }

    const lp = await db.execute(sql`SELECT total_points FROM loyalty_points WHERE user_id = ${user.userId} LIMIT 1`);
    const curr = (lp.rows[0] as any)?.total_points || 0;
    if (curr < points) { res.status(400).json({ error: `Yetarli ball yo'q (${curr} ball mavjud)` }); return; }

    const discountAmount = points * 100; // 1 ball = 100 so'm chegirma
    await db.execute(sql`UPDATE loyalty_points SET total_points = total_points - ${points} WHERE user_id = ${user.userId}`);
    await db.execute(sql`
      INSERT INTO loyalty_transactions (user_id, rental_id, points, type, description)
      VALUES (${user.userId}, ${rentalId || null}, ${-points}, 'redeem', 'Ball chegirmaga almashtirildi')
    `);
    res.json({ success: true, discountAmount, pointsUsed: points });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// GET /api/loyalty/leaderboard
router.get("/leaderboard", async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT lp.*, u.name FROM loyalty_points lp LEFT JOIN users u ON u.id = lp.user_id
      ORDER BY lp.lifetime_points DESC LIMIT 20
    `);
    res.json({ leaderboard: rows.rows });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

export default router;
