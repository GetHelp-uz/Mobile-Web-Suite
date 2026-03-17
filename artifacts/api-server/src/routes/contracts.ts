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

    // Ijara + barcha ma'lumotlar
    const rentalRow = await db.execute(sql`
      SELECT r.*,
             u.name as customer_name, u.phone as customer_phone,
             u.passport_id as customer_passport,
             t.name as tool_name, t.category as tool_category, t.qr_code as tool_qr,
             t.price_per_day, t.deposit_amount as tool_deposit,
             s.name as shop_name, s.address as shop_address, s.phone as shop_phone,
             s.owner_signature_data as owner_sig,
             su.name as owner_name,
             c.contract_number, c.signature_data as customer_sig, c.signed_at
      FROM rentals r
      JOIN users u ON u.id = r.customer_id
      JOIN tools t ON t.id = r.tool_id
      JOIN shops s ON s.id = r.shop_id
      JOIN users su ON su.id = s.owner_id
      LEFT JOIN contracts c ON c.rental_id = r.id
      WHERE r.id = ${rentalId} LIMIT 1
    `);
    if (!rentalRow.rows.length) { res.status(404).json({ error: "Ijara topilmadi" }); return; }
    const r = rentalRow.rows[0] as any;

    // Shartnoma raqami
    const contractNum = r.contract_number || generateContractNumber();
    const today = fmtDate(new Date());

    const doc = new PDFDocument({ size: "A4", margin: 55, info: { Title: `Shartnoma #${contractNum}` } });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="shartnoma_${contractNum}.pdf"`);
    doc.pipe(res);

    // ─── SARLAVHA ─────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 85).fill("#1A6FDB");
    doc.fillColor("white").fontSize(18).font("Helvetica-Bold")
      .text("QURILISH ASBOB-USKUNALARINI IJARAGA BERISH SHARTNOMASI", 55, 18, { align: "center", width: doc.page.width - 110 });
    doc.fontSize(10).font("Helvetica")
      .text(`GetHelp.uz Platformasi  •  Shartnoma: ${contractNum}  •  Sana: ${today}`, 55, 58, { align: "center", width: doc.page.width - 110 });

    doc.fillColor("#1e293b");

    // ─── 1. TOMONLAR ──────────────────────────────────────────────────────
    doc.y = 100;
    doc.fillColor("#1A6FDB").fontSize(12).font("Helvetica-Bold").text("1. SHARTNOMA TOMONLARI");
    doc.moveDown(0.5);

    const col1x = 55, col2x = 305;
    const partiesY = doc.y;
    const boxH = 95;

    // Sol quti — Ijara beruvchi
    doc.rect(col1x, partiesY, 235, boxH).fill("#f8fafc").stroke("#e2e8f0");
    doc.fillColor("#1A6FDB").fontSize(9).font("Helvetica-Bold").text("IJARA BERUVCHI:", col1x + 10, partiesY + 8);
    doc.fillColor("#1e293b").fontSize(10).font("Helvetica-Bold").text(r.shop_name, col1x + 10, partiesY + 22);
    doc.fontSize(9).font("Helvetica").fillColor("#475569")
      .text(`Manzil: ${r.shop_address || "—"}`, col1x + 10, partiesY + 37)
      .text(`Telefon: ${r.shop_phone || "—"}`, col1x + 10, partiesY + 50)
      .text(`Mas'ul: ${r.owner_name}`, col1x + 10, partiesY + 63);

    // O'ng quti — Ijara oluvchi
    doc.rect(col2x, partiesY, 235, boxH).fill("#f8fafc").stroke("#e2e8f0");
    doc.fillColor("#1A6FDB").fontSize(9).font("Helvetica-Bold").text("IJARA OLUVCHI (MIJOZ):", col2x + 10, partiesY + 8);
    doc.fillColor("#1e293b").fontSize(10).font("Helvetica-Bold").text(r.customer_name, col2x + 10, partiesY + 22);
    doc.fontSize(9).font("Helvetica").fillColor("#475569")
      .text(`Telefon: ${r.customer_phone}`, col2x + 10, partiesY + 37)
      .text(`Pasport/ID: ${r.customer_passport || "—"}`, col2x + 10, partiesY + 50);

    doc.y = partiesY + boxH + 18;
    doc.moveTo(55, doc.y).lineTo(540, doc.y).strokeColor("#e2e8f0").lineWidth(1).stroke();
    doc.moveDown(0.8);

    // ─── 2. IJARA PREDMETI ────────────────────────────────────────────────
    doc.fillColor("#1A6FDB").fontSize(12).font("Helvetica-Bold").text("2. SHARTNOMA PREDMETI");
    doc.moveDown(0.4);
    doc.fontSize(10).font("Helvetica").fillColor("#334155")
      .text("Ijara beruvchi quyidagi qurilish asbob-uskunasini vaqtinchalik foydalanish uchun mijozga ijaraga beradi:", { indent: 4 });
    doc.moveDown(0.5);

    const drawRow = (label: string, value: string, y: number, alt = false) => {
      doc.rect(55, y, 485, 22).fill(alt ? "#f1f5f9" : "#f8fafc");
      doc.rect(55, y, 170, 22).fill(alt ? "#e9eef5" : "#eef2f7");
      doc.moveTo(55, y).lineTo(540, y).strokeColor("#e2e8f0").stroke();
      doc.fillColor("#64748b").fontSize(9).font("Helvetica-Bold").text(label, 62, y + 6, { width: 160 });
      doc.fillColor("#1e293b").fontSize(9).font("Helvetica").text(value, 232, y + 6, { width: 300 });
      return y + 23;
    };

    let rowY = doc.y;
    rowY = drawRow("Uskuna nomi", r.tool_name, rowY);
    rowY = drawRow("Kategoriya", r.tool_category, rowY, true);
    rowY = drawRow("Uskuna ID / QR kod", r.tool_qr || `#${r.tool_id}`, rowY);
    rowY = drawRow("Ijara boshlanishi", fmtDate(r.start_date || r.started_at), rowY, true);
    rowY = drawRow("Ijara tugashi (muddat)", fmtDate(r.end_date || r.due_date), rowY);
    rowY = drawRow("Kunlik ijara narxi", fmt(Number(r.price_per_day || 0)), rowY, true);
    rowY = drawRow("Depozit (garov puli)", fmt(Number(r.deposit_amount || r.tool_deposit || 0)), rowY);
    rowY = drawRow("To'lov usuli", (r.payment_method || "naqd").toUpperCase(), rowY, true);
    rowY = drawRow("Jami to'lov", fmt(Number(r.total_price || r.rental_price || 0)), rowY);
    doc.moveTo(55, rowY).lineTo(540, rowY).strokeColor("#e2e8f0").stroke();

    doc.y = rowY + 16;
    doc.moveTo(55, doc.y).lineTo(540, doc.y).strokeColor("#e2e8f0").stroke();
    doc.moveDown(0.8);

    // ─── 3. MIJOZ MAJBURIYATLARI ──────────────────────────────────────────
    doc.fillColor("#1A6FDB").fontSize(12).font("Helvetica-Bold").text("3. MIJOZ MAJBURIYATLARI");
    doc.moveDown(0.4);
    const obligations = [
      "Uskunadan ehtiyotkorlik bilan foydalanaman.",
      "Uskunani buzmaslik, shikast yetkazmaslik majburiyatini olaman.",
      "Uskunani boshqa shaxslarga bermayman.",
      "Uskunani belgilangan muddatda qaytaraman.",
      "Uskuna yo'qolsa yoki shikastlansa zararni to'liq qoplayman.",
    ];
    obligations.forEach((t, i) => {
      doc.fillColor("#334155").fontSize(9).font("Helvetica").text(`${i + 1}. ${t}`, { indent: 12 });
      doc.moveDown(0.2);
    });

    doc.moveDown(0.4);
    doc.moveTo(55, doc.y).lineTo(540, doc.y).strokeColor("#e2e8f0").stroke();
    doc.moveDown(0.8);

    // ─── 4. DEPOZIT ───────────────────────────────────────────────────────
    doc.fillColor("#1A6FDB").fontSize(12).font("Helvetica-Bold").text("4. DEPOZIT (GAROV PULI)");
    doc.moveDown(0.4);
    doc.fillColor("#334155").fontSize(9).font("Helvetica")
      .text(`Uskuna uchun mijoz quyidagi miqdorda depozit qoldiradi: ${fmt(Number(r.deposit_amount || r.tool_deposit || 0))}`, { indent: 4 });
    doc.moveDown(0.2);
    doc.text("Uskuna sog' holatda qaytarilgandan so'ng depozit mijozga to'liq qaytariladi.", { indent: 4 });

    doc.moveDown(0.5);
    doc.moveTo(55, doc.y).lineTo(540, doc.y).strokeColor("#e2e8f0").stroke();
    doc.moveDown(0.8);

    // ─── 5. TO'LOV TARTIBI ────────────────────────────────────────────────
    doc.fillColor("#1A6FDB").fontSize(12).font("Helvetica-Bold").text("5. TO'LOV TARTIBI");
    doc.moveDown(0.4);
    doc.fillColor("#334155").fontSize(9).font("Helvetica")
      .text("Ijara to'lovi quyidagi usullardan biri orqali amalga oshiriladi: naqd pul, bank kartasi, mobil to'lov (Click, Payme, Paynet).", { indent: 4 });

    doc.moveDown(0.5);
    doc.moveTo(55, doc.y).lineTo(540, doc.y).strokeColor("#e2e8f0").stroke();
    doc.moveDown(0.8);

    // ─── 6. YAKUNIY QOIDALAR ──────────────────────────────────────────────
    doc.fillColor("#1A6FDB").fontSize(12).font("Helvetica-Bold").text("6. YAKUNIY QOIDALAR");
    doc.moveDown(0.4);
    const rules = [
      "Tomonlar ushbu shartnoma shartlari bilan tanishib chiqib, uni to'liq qabul qilganlar.",
      "Nizoli holatlar O'zbekiston Respublikasi qonunchiligi asosida hal etiladi.",
      "Ijara muddati kechiktirilsa qo'shimcha ijara to'lovi hisoblanadi.",
    ];
    rules.forEach((t, i) => {
      doc.fillColor("#334155").fontSize(9).font("Helvetica").text(`${i + 1}. ${t}`, { indent: 12 });
      doc.moveDown(0.2);
    });

    doc.moveDown(0.6);
    doc.moveTo(55, doc.y).lineTo(540, doc.y).strokeColor("#e2e8f0").stroke();
    doc.moveDown(1.2);

    // ─── 7. TOMONLAR IMZOSI ───────────────────────────────────────────────
    doc.fillColor("#1A6FDB").fontSize(12).font("Helvetica-Bold").text("7. TOMONLAR IMZOSI");
    doc.moveDown(1);

    const signBoxY = doc.y;
    const signBoxH = 90;

    // Sol — Ijara beruvchi
    doc.rect(55, signBoxY, 220, signBoxH).stroke("#cbd5e1");
    doc.fillColor("#475569").fontSize(9).font("Helvetica-Bold").text("Ijara beruvchi:", 65, signBoxY + 8);
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#1e293b").text(r.shop_name, 65, signBoxY + 22);
    doc.fontSize(9).font("Helvetica").fillColor("#64748b").text(`Mas'ul: ${r.owner_name}`, 65, signBoxY + 36);

    if (r.owner_sig && r.owner_sig.startsWith("data:image/png;base64,")) {
      try {
        const imgBuf = Buffer.from(r.owner_sig.split(",")[1], "base64");
        doc.image(imgBuf, 65, signBoxY + 50, { width: 120, height: 32 });
      } catch { doc.fillColor("#22c55e").fontSize(9).text("RAQAMLI IMZOLANGAN", 65, signBoxY + 55); }
    } else {
      doc.fillColor("#94a3b8").fontSize(9).text("Imzo: ___________________", 65, signBoxY + 60);
    }

    // O'ng — Ijara oluvchi
    doc.rect(320, signBoxY, 220, signBoxH).stroke("#cbd5e1");
    doc.fillColor("#475569").fontSize(9).font("Helvetica-Bold").text("Mijoz (Ijara oluvchi):", 330, signBoxY + 8);
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#1e293b").text(r.customer_name, 330, signBoxY + 22);
    if (r.customer_passport) {
      doc.fontSize(9).font("Helvetica").fillColor("#64748b").text(`Pasport: ${r.customer_passport}`, 330, signBoxY + 36);
    }

    if (r.customer_sig && r.customer_sig.startsWith("data:image/png;base64,")) {
      try {
        const imgBuf = Buffer.from(r.customer_sig.split(",")[1], "base64");
        doc.image(imgBuf, 330, signBoxY + 50, { width: 120, height: 32 });
      } catch { doc.fillColor("#22c55e").fontSize(9).text("RAQAMLI IMZOLANGAN", 330, signBoxY + 55); }
    } else if (r.contract_signed) {
      doc.fillColor("#22c55e").fontSize(9).text("RAQAMLI IMZOLANGAN", 330, signBoxY + 60);
    } else {
      doc.fillColor("#94a3b8").fontSize(9).text("Imzo: ___________________", 330, signBoxY + 60);
    }

    doc.y = signBoxY + signBoxH + 15;

    // Sana
    doc.fillColor("#64748b").fontSize(9).font("Helvetica")
      .text(`Sana: ${today}`, 55, doc.y);

    // ─── FOOTER ──────────────────────────────────────────────────────────
    const footerY = doc.page.height - 38;
    doc.rect(0, footerY, doc.page.width, 38).fill("#f1f5f9");
    doc.fillColor("#94a3b8").fontSize(7.5).font("Helvetica")
      .text(
        `GetHelp.uz Platformasi tomonidan yaratildi  •  ${today}  •  ${contractNum}`,
        55, footerY + 14, { align: "center", width: doc.page.width - 110 }
      );

    doc.end();
  } catch (err: any) {
    if (!res.headersSent) console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' });
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
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
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
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
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
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

export default router;
