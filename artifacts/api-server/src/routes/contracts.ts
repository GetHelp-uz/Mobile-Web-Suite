import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate } from "../lib/auth.js";
import crypto from "crypto";
import PDFDocument from "pdfkit";

const router = Router();

function generateContractNumber(): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `TR-${y}${m}${d}-${rand}`;
}

function fmt(n: number) { return n.toLocaleString("uz-UZ") + " so'm"; }
function fmtDate(d: any) {
  if (!d) return "—";
  const dt = new Date(d);
  return `${dt.getDate().toString().padStart(2, "0")}.${(dt.getMonth() + 1).toString().padStart(2, "0")}.${dt.getFullYear()}`;
}

// GET /api/contracts/:rentalId/pdf — PDF yuklab olish
router.get("/:rentalId/pdf", authenticate, async (req, res) => {
  try {
    const rentalId = Number(req.params.rentalId);
    const rentalRow = await db.execute(sql`
      SELECT r.*,
             u.name as customer_name, u.phone as customer_phone,
             t.name as tool_name, t.category as tool_category,
             t.price_per_day, t.deposit_amount as tool_deposit,
             s.name as shop_name, s.address as shop_address, s.phone as shop_phone,
             su.name as owner_name
      FROM rentals r
      JOIN users u ON u.id = r.customer_id
      JOIN tools t ON t.id = r.tool_id
      JOIN shops s ON s.id = r.shop_id
      JOIN users su ON su.id = s.owner_id
      WHERE r.id = ${rentalId} LIMIT 1
    `);
    if (!rentalRow.rows.length) { res.status(404).json({ error: "Ijara topilmadi" }); return; }
    const r = rentalRow.rows[0] as any;
    const contractNum = generateContractNumber();

    const doc = new PDFDocument({ size: "A4", margin: 55, info: { Title: `Shartnoma #${rentalId}` } });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="shartnoma_${rentalId}.pdf"`);
    doc.pipe(res);

    // Sarlavha
    doc.rect(0, 0, doc.page.width, 80).fill("#f97316");
    doc.fillColor("white").fontSize(22).font("Helvetica-Bold")
      .text("ASBOB IJARA SHARTNOMASI", 55, 20, { align: "center" });
    doc.fontSize(11).font("Helvetica")
      .text(`ToolRent Platformasi • ${contractNum}`, 55, 50, { align: "center" });

    doc.fillColor("#1e293b").moveDown(3);

    // Info blok
    const infoY = 100;
    doc.fontSize(9).fillColor("#64748b").font("Helvetica")
      .text(`Tuzilgan sana: ${fmtDate(new Date())}`, 55, infoY)
      .text(`Shartnoma raqami: ${contractNum}`, 320, infoY);

    doc.moveTo(55, 125).lineTo(540, 125).strokeColor("#e2e8f0").stroke();

    // Tomonlar
    doc.y = 140;
    doc.fillColor("#f97316").fontSize(12).font("Helvetica-Bold").text("1. TOMONLAR");
    doc.moveDown(0.4);

    const col1x = 55, col2x = 300;
    const startY = doc.y;

    // Ijara beruvchi
    doc.fillColor("#1e293b").fontSize(10).font("Helvetica-Bold").text("Ijara beruvchi (Do'kon):", col1x, startY);
    doc.font("Helvetica").fillColor("#334155")
      .text(`${r.shop_name}`, col1x, doc.y + 3)
      .text(`Manzil: ${r.shop_address || "—"}`)
      .text(`Tel: ${r.shop_phone || "—"}`)
      .text(`Mas'ul: ${r.owner_name}`);

    // Ijara oluvchi
    doc.fillColor("#1e293b").fontSize(10).font("Helvetica-Bold").text("Ijara oluvchi (Mijoz):", col2x, startY);
    doc.font("Helvetica").fillColor("#334155")
      .text(`${r.customer_name}`, col2x, startY + 16)
      .text(`Tel: ${r.customer_phone}`, col2x);

    doc.moveDown(2.5);
    doc.moveTo(55, doc.y).lineTo(540, doc.y).strokeColor("#e2e8f0").stroke();
    doc.moveDown(0.8);

    // Asbob ma'lumotlari
    doc.fillColor("#f97316").fontSize(12).font("Helvetica-Bold").text("2. IJARA PREDMETI");
    doc.moveDown(0.5);

    const drawRow = (label: string, value: string, y: number) => {
      doc.rect(55, y, 485, 24).fill("#f8fafc");
      doc.rect(55, y, 160, 24).fill("#f1f5f9");
      doc.fillColor("#64748b").fontSize(9).font("Helvetica-Bold").text(label, 60, y + 7);
      doc.fillColor("#1e293b").font("Helvetica").text(value, 220, y + 7);
      return y + 25;
    };

    let rowY = doc.y;
    rowY = drawRow("Asbob nomi", r.tool_name, rowY);
    rowY = drawRow("Kategoriya", r.tool_category, rowY);
    rowY = drawRow("Boshlanish sanasi", fmtDate(r.start_date || r.started_at), rowY);
    rowY = drawRow("Tugash sanasi", fmtDate(r.end_date || r.due_date), rowY);
    rowY = drawRow("To'lov usuli", (r.payment_method || "naqd").toUpperCase(), rowY);
    rowY = drawRow("Kunlik narx", fmt(Number(r.price_per_day || 0)), rowY);
    rowY = drawRow("Depozit", fmt(Number(r.deposit_amount || r.tool_deposit || 0)), rowY);
    rowY = drawRow("Jami to'lov", fmt(Number(r.total_price || r.rental_price || 0)), rowY);

    doc.y = rowY + 15;
    doc.moveTo(55, doc.y).lineTo(540, doc.y).strokeColor("#e2e8f0").stroke();
    doc.moveDown(0.8);

    // Shartlar
    doc.fillColor("#f97316").fontSize(12).font("Helvetica-Bold").text("3. SHARTNOMA SHARTLARI");
    doc.moveDown(0.5);
    const terms = [
      "Ijara oluvchi asbobni belgilangan muddatda soz holda qaytarishi shart.",
      "Asbob shikastlanganda, ta'mirlash xarajatlari ijara oluvchi tomonidan qoplanadi.",
      "Asbobni uchinchi shaxslarga berish yoki ijaraga topshirish qat'iyan taqiqlanadi.",
      "Ijara muddati uzaytirilganda qo'shimcha kelishuv talab etiladi.",
      "Depozit asbob sog' va to'liq qaytarilganda to'liq qaytariladi.",
      "Nizoli holatlar O'zbekiston Respublikasi qonunchiligi asosida hal etiladi.",
    ];
    terms.forEach((t, i) => {
      doc.fillColor("#334155").fontSize(10).font("Helvetica")
        .text(`${i + 1}. ${t}`, { indent: 10 });
      doc.moveDown(0.3);
    });

    doc.moveDown(0.5);
    doc.moveTo(55, doc.y).lineTo(540, doc.y).strokeColor("#e2e8f0").stroke();
    doc.moveDown(1.5);

    // Imzolar
    doc.fillColor("#f97316").fontSize(12).font("Helvetica-Bold").text("4. TOMONLAR IMZOSI");
    doc.moveDown(1.5);

    const signY = doc.y;
    doc.rect(55, signY, 220, 70).stroke("#e2e8f0");
    doc.rect(320, signY, 220, 70).stroke("#e2e8f0");

    doc.fillColor("#334155").fontSize(10).font("Helvetica-Bold")
      .text("Ijara beruvchi:", 65, signY + 8)
      .text("Ijara oluvchi:", 330, signY + 8);
    doc.font("Helvetica").fillColor("#64748b")
      .text(r.shop_name, 65, signY + 25)
      .text(r.customer_name, 330, signY + 25);

    if (r.contract_signed) {
      doc.fillColor("#22c55e").fontSize(10)
        .text("RAQAMLI IMZOLANGAN", 65, signY + 45)
        .text("RAQAMLI IMZOLANGAN", 330, signY + 45);
    } else {
      doc.fillColor("#94a3b8").fontSize(9)
        .text("Imzo: _______________", 65, signY + 50)
        .text("Imzo: _______________", 330, signY + 50);
    }

    doc.y = signY + 85;
    doc.moveDown(1);

    // Footer
    doc.rect(0, doc.page.height - 40, doc.page.width, 40).fill("#f1f5f9");
    doc.fillColor("#94a3b8").fontSize(8).font("Helvetica")
      .text(
        `ToolRent Platformasi tomonidan yaratildi • ${fmtDate(new Date())} • Shartnoma #${rentalId}`,
        55, doc.page.height - 25, { align: "center" }
      );

    doc.end();
  } catch (err: any) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// GET /api/contracts/rental/:rentalId — eski endpoint (HTML)
router.get("/rental/:rentalId", authenticate, async (req, res) => {
  try {
    const rentalId = Number(req.params.rentalId);
    let contract = await db.execute(sql`SELECT * FROM contracts WHERE rental_id = ${rentalId} LIMIT 1`);

    if (!contract.rows.length) {
      const rental = await db.execute(sql`
        SELECT r.*, t.name as tool_name, t.price_per_day, t.description as tool_desc,
               u.name as customer_name, u.phone as customer_phone,
               s.name as shop_name, s.address as shop_address, s.phone as shop_phone,
               w.name as worker_name
        FROM rentals r
        LEFT JOIN tools t ON t.id = r.tool_id
        LEFT JOIN users u ON u.id = r.customer_id
        LEFT JOIN shops s ON s.id = r.shop_id
        LEFT JOIN users w ON w.id = r.worker_id
        WHERE r.id = ${rentalId} LIMIT 1
      `);
      if (!rental.rows.length) { res.status(404).json({ error: "Ijara topilmadi" }); return; }
      const ren = rental.rows[0] as any;
      const num = generateContractNumber();
      const ins = await db.execute(sql`
        INSERT INTO contracts (rental_id, contract_number, customer_id, shop_id, content)
        VALUES (${rentalId}, ${num}, ${ren.customer_id}, ${ren.shop_id}, ${num})
        RETURNING *
      `);
      contract = ins;
    }
    res.json({ contract: contract.rows[0] });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/contracts/:rentalId/sign — raqamli imzolash
router.post("/:rentalId/sign", authenticate, async (req, res) => {
  try {
    const { agreed, signatureData } = req.body;
    if (!agreed) { res.status(400).json({ error: "Shartlarga rozilik talab etiladi" }); return; }
    const user = (req as any).user;
    const ip = req.ip || req.socket.remoteAddress || "";

    await db.execute(sql`
      UPDATE rentals SET contract_signed = TRUE, contract_signed_at = NOW()
      WHERE id = ${Number(req.params.rentalId)}
    `);

    // Imzo ma'lumotini kontrakt jadvaliga saqlash
    if (signatureData) {
      await db.execute(sql`
        UPDATE contracts SET
          signed_at = NOW(),
          signature_data = ${signatureData},
          signature_ip = ${ip}
        WHERE rental_id = ${Number(req.params.rentalId)}
      `);
    }

    res.json({ success: true, message: "Shartnoma raqamli imzolandi", signedAt: new Date().toISOString() });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/contracts/rental/:rentalId/esign — imzo holatini tekshirish
router.get("/rental/:rentalId/esign", authenticate, async (req, res) => {
  try {
    const row = await db.execute(sql`
      SELECT signed_at, signature_ip,
             CASE WHEN signature_data IS NOT NULL THEN true ELSE false END as has_signature
      FROM contracts WHERE rental_id = ${Number(req.params.rentalId)} LIMIT 1
    `);
    if (!row.rows.length) { res.json({ signed: false }); return; }
    const r = row.rows[0] as any;
    res.json({ signed: !!r.signed_at, signedAt: r.signed_at, hasSignature: r.has_signature, ip: r.signature_ip });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
