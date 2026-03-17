import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate } from "../lib/auth.js";

const router = Router();

// GET /api/projects
router.get("/", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const shopId = req.query.shopId ? Number(req.query.shopId) : undefined;

    let cond = sql`1=1`;
    if (user.role === "customer") cond = sql`${cond} AND p.customer_id = ${user.userId}`;
    else if (shopId) cond = sql`${cond} AND p.shop_id = ${shopId}`;

    const rows = await db.execute(sql`
      SELECT p.*, u.name as customer_name, u.phone as customer_phone,
             s.name as shop_name,
             COUNT(pr.id)::int as rental_count,
             COALESCE(SUM(r.total_amount), 0)::real as actual_total
      FROM projects p
      LEFT JOIN users u ON u.id = p.customer_id
      LEFT JOIN shops s ON s.id = p.shop_id
      LEFT JOIN project_rentals pr ON pr.project_id = p.id
      LEFT JOIN rentals r ON r.id = pr.rental_id
      WHERE ${cond}
      GROUP BY p.id, u.name, u.phone, s.name
      ORDER BY p.created_at DESC
    `);
    res.json({ projects: rows.rows });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// GET /api/projects/:id
router.get("/:id", authenticate, async (req, res) => {
  try {
    const project = await db.execute(sql`
      SELECT p.*, u.name as customer_name, s.name as shop_name
      FROM projects p
      LEFT JOIN users u ON u.id = p.customer_id
      LEFT JOIN shops s ON s.id = p.shop_id
      WHERE p.id = ${Number(req.params.id)} LIMIT 1
    `);
    if (!project.rows.length) { res.status(404).json({ error: "Loyiha topilmadi" }); return; }

    const rentals = await db.execute(sql`
      SELECT r.*, t.name as tool_name, t.price_per_day
      FROM project_rentals pr
      LEFT JOIN rentals r ON r.id = pr.rental_id
      LEFT JOIN tools t ON t.id = r.tool_id
      WHERE pr.project_id = ${Number(req.params.id)}
      ORDER BY r.started_at DESC
    `);

    res.json({ project: project.rows[0], rentals: rentals.rows });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// POST /api/projects
router.post("/", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { name, shopId, description, location } = req.body;
    if (!name || !shopId) { res.status(400).json({ error: "name va shopId kerak" }); return; }

    const customerId = user.role === "customer" ? user.userId : (req.body.customerId || user.userId);

    const r = await db.execute(sql`
      INSERT INTO projects (name, customer_id, shop_id, description, location)
      VALUES (${name}, ${customerId}, ${shopId}, ${description || null}, ${location || null})
      RETURNING *
    `);
    res.json({ success: true, project: r.rows[0] });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// POST /api/projects/:id/add-rental
router.post("/:id/add-rental", authenticate, async (req, res) => {
  try {
    const { rentalId } = req.body;
    if (!rentalId) { res.status(400).json({ error: "rentalId kerak" }); return; }

    // Loyiha narxini yangilash
    const rental = await db.execute(sql`SELECT total_amount FROM rentals WHERE id = ${rentalId} LIMIT 1`);
    const amount = (rental.rows[0] as any)?.total_amount || 0;

    const existing = await db.execute(sql`SELECT id FROM project_rentals WHERE project_id = ${Number(req.params.id)} AND rental_id = ${rentalId} LIMIT 1`);
    if (!existing.rows.length) {
      await db.execute(sql`INSERT INTO project_rentals (project_id, rental_id) VALUES (${Number(req.params.id)}, ${rentalId})`);
      await db.execute(sql`UPDATE projects SET total_amount = total_amount + ${amount} WHERE id = ${Number(req.params.id)}`);
    }
    res.json({ success: true });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// PATCH /api/projects/:id
router.patch("/:id", authenticate, async (req, res) => {
  try {
    const { name, description, location, status } = req.body;
    const r = await db.execute(sql`
      UPDATE projects
      SET name = COALESCE(${name || null}, name),
          description = COALESCE(${description || null}, description),
          location = COALESCE(${location || null}, location),
          status = COALESCE(${status || null}, status),
          completed_at = CASE WHEN ${status || null} = 'completed' THEN NOW() ELSE completed_at END
      WHERE id = ${Number(req.params.id)}
      RETURNING *
    `);
    res.json({ success: true, project: r.rows[0] });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

export default router;
