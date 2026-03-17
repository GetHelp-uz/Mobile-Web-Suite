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

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = crypto.randomBytes(16).toString("hex");
    cb(null, `${name}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".pdf", ".heic", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Faqat rasm va PDF fayllar qabul qilinadi"));
  },
});

// POST /api/documents/upload
router.post("/upload", authenticate, upload.single("file"), async (req, res) => {
  try {
    const user = (req as any).user;
    if (!req.file) { res.status(400).json({ error: "Fayl yuborilmadi" }); return; }

    const { rentalId, bookingId, documentType } = req.body;
    const fileUrl = `/api/documents/file/${req.file.filename}`;

    const r = await db.execute(sql`
      INSERT INTO customer_documents (user_id, rental_id, booking_id, document_type, file_url, original_name, status)
      VALUES (${user.userId}, ${rentalId ? Number(rentalId) : null}, ${bookingId ? Number(bookingId) : null},
              ${documentType || "passport"}, ${fileUrl}, ${req.file.originalname}, 'pending')
      RETURNING *
    `);

    await db.execute(sql`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
      VALUES (${user.userId}, 'document_upload', 'customer_documents', ${(r.rows[0] as any).id},
              ${JSON.stringify({ documentType, fileName: req.file.originalname })}::jsonb)
    `);

    res.json({ success: true, document: r.rows[0] });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// GET /api/documents/file/:filename — faylni ko'rsatish
router.get("/file/:filename", (req, res) => {
  const filePath = path.join(uploadsDir, path.basename(req.params.filename));
  if (!fs.existsSync(filePath)) { res.status(404).json({ error: "Fayl topilmadi" }); return; }
  res.sendFile(filePath);
});

// GET /api/documents/my — o'z hujjatlarim
router.get("/my", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const rows = await db.execute(sql`
      SELECT * FROM customer_documents WHERE user_id = ${user.userId} ORDER BY created_at DESC
    `);
    res.json({ documents: rows.rows });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// GET /api/documents/shop/:shopId — do'kon uchun hujjatlar
router.get("/shop/:shopId", authenticate, async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT d.*, u.name as customer_name, u.phone as customer_phone,
             t.name as tool_name
      FROM customer_documents d
      LEFT JOIN users u ON u.id = d.user_id
      LEFT JOIN rentals r ON r.id = d.rental_id
      LEFT JOIN tools t ON t.id = r.tool_id
      WHERE r.shop_id = ${Number(req.params.shopId)}
         OR d.rental_id IN (SELECT id FROM rentals WHERE shop_id = ${Number(req.params.shopId)})
      ORDER BY d.created_at DESC
    `);
    res.json({ documents: rows.rows });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// GET /api/documents/rental/:rentalId
router.get("/rental/:rentalId", authenticate, async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT d.*, u.name as customer_name
      FROM customer_documents d
      LEFT JOIN users u ON u.id = d.user_id
      WHERE d.rental_id = ${Number(req.params.rentalId)}
      ORDER BY d.created_at DESC
    `);
    res.json({ documents: rows.rows });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

// PATCH /api/documents/:id/review — tasdiqlash/rad etish
router.patch("/:id/review", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { status, reviewNote } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      res.status(400).json({ error: "Status: approved yoki rejected" }); return;
    }
    const r = await db.execute(sql`
      UPDATE customer_documents
      SET status = ${status}, reviewed_by = ${user.userId}, review_note = ${reviewNote || null}, reviewed_at = NOW()
      WHERE id = ${Number(req.params.id)}
      RETURNING *
    `);

    const doc = r.rows[0] as any;
    if (status === "approved" && doc.rental_id) {
      await db.execute(sql`UPDATE rentals SET identification_type = 'document' WHERE id = ${doc.rental_id}`);
    }

    await db.execute(sql`
      INSERT INTO notifications (user_id, title, body, type, related_id, related_type)
      VALUES (${doc.user_id}, ${status === "approved" ? "Hujjat tasdiqlandi" : "Hujjat rad etildi"},
              ${status === "approved" ? "Sizning hujjatingiz muvaffaqiyatli tasdiqlandi" : `Hujjat rad etildi: ${reviewNote || ""}`},
              ${status === "approved" ? "success" : "error"}, ${doc.id}, 'document')
    `);
    res.json({ success: true, document: r.rows[0] });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

export default router;
