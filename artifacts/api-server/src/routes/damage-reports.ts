import { Router } from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate } from "../lib/auth.js";

const router = Router();

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => cb(null, `dmg_${crypto.randomBytes(12).toString("hex")}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// GET /api/damage-reports/shop/:shopId
router.get("/shop/:shopId", authenticate, async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT dr.*, u.name as customer_name, t.name as tool_name
      FROM damage_reports dr
      LEFT JOIN users u ON u.id = dr.customer_id
      LEFT JOIN tools t ON t.id = dr.tool_id
      WHERE dr.shop_id = ${Number(req.params.shopId)}
      ORDER BY dr.created_at DESC
    `);
    res.json({ reports: rows.rows });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// GET /api/damage-reports/rental/:rentalId
router.get("/rental/:rentalId", authenticate, async (req, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM damage_reports WHERE rental_id = ${Number(req.params.rentalId)}`);
    res.json({ reports: rows.rows });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// POST /api/damage-reports
router.post("/", authenticate, upload.single("photo"), async (req, res) => {
  try {
    const user = (req as any).user;
    const { rentalId, toolId, shopId, description, severity, estimatedCost } = req.body;
    if (!rentalId || !toolId || !shopId || !description) {
      res.status(400).json({ error: "rentalId, toolId, shopId, description kerak" }); return;
    }
    const photoUrl = req.file ? `/api/documents/file/${req.file.filename}` : null;
    const r = await db.execute(sql`
      INSERT INTO damage_reports (rental_id, tool_id, customer_id, shop_id, description, photo_url, severity, estimated_cost)
      VALUES (${Number(rentalId)}, ${Number(toolId)}, ${user.userId}, ${Number(shopId)},
              ${description}, ${photoUrl}, ${severity || "minor"}, ${Number(estimatedCost) || 0})
      RETURNING *
    `);

    await db.execute(sql`
      INSERT INTO notifications (user_id, title, body, type, related_id, related_type)
      SELECT s.owner_id, 'Shikast xabari!', ${'Mijoz shikast haqida xabar yubordi: ' + description}, 'warning', ${(r.rows[0] as any).id}, 'damage_report'
      FROM shops s WHERE s.id = ${Number(shopId)} LIMIT 1
    `);
    res.json({ success: true, report: r.rows[0] });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// PATCH /api/damage-reports/:id/resolve
router.patch("/:id/resolve", authenticate, async (req, res) => {
  try {
    const { estimatedCost } = req.body;
    await db.execute(sql`
      UPDATE damage_reports SET status = 'resolved', estimated_cost = ${Number(estimatedCost) || 0}, resolved_at = NOW()
      WHERE id = ${Number(req.params.id)}
    `);
    res.json({ success: true });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

export default router;
