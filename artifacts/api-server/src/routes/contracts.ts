import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate } from "../lib/auth.js";
import crypto from "crypto";

const router = Router();

function generateContractNumber(): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `TR-${y}${m}${d}-${rand}`;
}

function formatCurrency(n: number): string {
  return n.toLocaleString("uz-UZ") + " so'm";
}

// GET /api/contracts/rental/:rentalId
router.get("/rental/:rentalId", authenticate, async (req, res) => {
  try {
    const rentalId = Number(req.params.rentalId);
    let contract = await db.execute(sql`SELECT * FROM contracts WHERE rental_id = ${rentalId} LIMIT 1`);

    if (!contract.rows.length) {
      // Yangi shartnoma yaratish
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
      const content = generateContractHTML(ren, num);

      const ins = await db.execute(sql`
        INSERT INTO contracts (rental_id, contract_number, customer_id, shop_id, content)
        VALUES (${rentalId}, ${num}, ${ren.customer_id}, ${ren.shop_id}, ${content})
        RETURNING *
      `);
      contract = ins;
    }

    res.json({ contract: contract.rows[0] });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

function generateContractHTML(ren: any, num: string): string {
  const today = new Date().toLocaleDateString("uz-UZ");
  const startDate = new Date(ren.started_at).toLocaleDateString("uz-UZ");
  const dueDate = new Date(ren.due_date).toLocaleDateString("uz-UZ");

  return `<!DOCTYPE html>
<html lang="uz">
<head>
<meta charset="UTF-8">
<title>Ijara shartnomasi ${num}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #222; }
  h1 { text-align: center; font-size: 22px; margin-bottom: 4px; }
  .subtitle { text-align: center; color: #666; margin-bottom: 30px; }
  .contract-num { text-align: center; font-weight: bold; font-size: 18px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  td { padding: 8px 12px; border: 1px solid #ddd; }
  td:first-child { font-weight: bold; background: #f5f5f5; width: 35%; }
  .section { margin: 24px 0; }
  .section h2 { font-size: 16px; border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 12px; }
  .amount-box { background: #f0f4ff; border: 2px solid #4444ff; border-radius: 8px; padding: 16px; margin: 16px 0; }
  .amount-box .total { font-size: 24px; font-weight: bold; color: #2222cc; }
  .sign-area { display: flex; justify-content: space-between; margin-top: 60px; }
  .sign-box { width: 45%; text-align: center; }
  .sign-line { border-top: 1px solid #666; margin-top: 50px; padding-top: 6px; font-size: 13px; }
  .footer { margin-top: 40px; text-align: center; color: #888; font-size: 12px; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
  <h1>ASBOB IJARA SHARTNOMASI</h1>
  <div class="subtitle">ToolRent — Qurilish asboblari ijarasi platformasi</div>
  <div class="contract-num">Shartnoma: ${num}</div>
  <div style="text-align:right; margin-bottom:20px;">Sana: ${today}</div>

  <div class="section">
    <h2>Taraflar</h2>
    <table>
      <tr><td>Do'kon</td><td><strong>${ren.shop_name || ""}</strong><br>${ren.shop_address || ""}<br>Tel: ${ren.shop_phone || ""}</td></tr>
      <tr><td>Mijoz</td><td><strong>${ren.customer_name || ""}</strong><br>Tel: ${ren.customer_phone || ""}</td></tr>
      ${ren.worker_name ? `<tr><td>Xodim</td><td>${ren.worker_name}</td></tr>` : ""}
    </table>
  </div>

  <div class="section">
    <h2>Ijara ob'ekti</h2>
    <table>
      <tr><td>Asbob</td><td><strong>${ren.tool_name || ""}</strong></td></tr>
      <tr><td>Ijara boshlandi</td><td>${startDate}</td></tr>
      <tr><td>Qaytarish sanasi</td><td>${dueDate}</td></tr>
      <tr><td>To'lov usuli</td><td>${(ren.payment_method || "").toUpperCase()}</td></tr>
    </table>
  </div>

  <div class="amount-box section">
    <h2 style="margin:0 0 8px">To'lov tafsiloti</h2>
    <table style="border:none">
      <tr><td style="border:none;background:none;font-weight:bold">Ijara narxi:</td><td style="border:none;background:none">${formatCurrency(ren.rental_price || 0)}</td></tr>
      <tr><td style="border:none;background:none;font-weight:bold">Depozit:</td><td style="border:none;background:none">${formatCurrency(ren.deposit_amount || 0)}</td></tr>
    </table>
    <div style="margin-top:10px">Jami: <span class="total">${formatCurrency(ren.total_amount || 0)}</span></div>
  </div>

  <div class="section">
    <h2>Shartlar</h2>
    <ol>
      <li>Mijoz asbobni belgilangan muddatda qaytarish majburiyatini oladi.</li>
      <li>Asbob shikastlansa, zararni qoplash majburiyati mijozga yuklatiladi.</li>
      <li>Kechikish uchun qo'shimcha to'lov olinadi.</li>
      <li>Depozit asbob sog'lom qaytarilgandan so'ng qaytariladi.</li>
      <li>Ushbu shartnoma O'zbekiston Respublikasi qonunlari asosida tuzilgan.</li>
    </ol>
  </div>

  <div class="sign-area">
    <div class="sign-box">
      <p><strong>Do'kon vakili</strong></p>
      <div class="sign-line">Imzo: _________________</div>
    </div>
    <div class="sign-box">
      <p><strong>Mijoz</strong></p>
      <div class="sign-line">Imzo: _________________</div>
    </div>
  </div>

  <div class="footer">
    ToolRent Platforma — toolrent.uz | ${today}
  </div>
</body>
</html>`;
}

export default router;
