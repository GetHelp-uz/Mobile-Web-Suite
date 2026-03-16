import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate } from "../lib/auth.js";

const router = Router();

function toCSV(rows: any[], headers: { key: string; label: string }[]): string {
  const BOM = "\uFEFF";
  const head = headers.map(h => `"${h.label}"`).join(",");
  const body = rows.map(row =>
    headers.map(h => {
      const val = row[h.key] ?? "";
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(",")
  ).join("\n");
  return BOM + head + "\n" + body;
}

// GET /api/export/rentals?shopId=&from=&to=
router.get("/rentals", authenticate, async (req, res) => {
  try {
    const { shopId, from, to } = req.query;
    let cond = sql`1=1`;
    if (shopId) cond = sql`${cond} AND r.shop_id = ${Number(shopId)}`;
    if (from) cond = sql`${cond} AND r.started_at >= ${new Date(from as string)}`;
    if (to) cond = sql`${cond} AND r.started_at <= ${new Date(to as string)}`;

    const rows = await db.execute(sql`
      SELECT r.id, t.name as asbob, u.name as mijoz, u.phone as telefon,
             r.rental_price as ijara_narxi, r.deposit_amount as depozit,
             r.total_amount as jami, r.payment_method as tolav_usuli,
             r.status as holat, r.identification_type as tasdiq_turi,
             r.started_at as boshlandi, r.due_date as qaytarish_sanasi,
             r.returned_at as qaytarildi, r.late_fee as kechikish_jarimasi
      FROM rentals r
      LEFT JOIN tools t ON t.id = r.tool_id
      LEFT JOIN users u ON u.id = r.customer_id
      WHERE ${cond}
      ORDER BY r.started_at DESC
    `);

    const csv = toCSV(rows.rows, [
      { key: "id", label: "№" },
      { key: "asbob", label: "Asbob" },
      { key: "mijoz", label: "Mijoz" },
      { key: "telefon", label: "Telefon" },
      { key: "ijara_narxi", label: "Ijara narxi" },
      { key: "depozit", label: "Depozit" },
      { key: "jami", label: "Jami to'lov" },
      { key: "tolav_usuli", label: "To'lov usuli" },
      { key: "tasdiq_turi", label: "Tasdiq turi" },
      { key: "holat", label: "Holat" },
      { key: "boshlandi", label: "Boshlandi" },
      { key: "qaytarish_sanasi", label: "Qaytarish sanasi" },
      { key: "qaytarildi", label: "Qaytarildi" },
      { key: "kechikish_jarimasi", label: "Kechikish jarimasi" },
    ]);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="ijaralar_${new Date().toISOString().split("T")[0]}.csv"`);
    res.send(csv);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/export/tools?shopId=
router.get("/tools", authenticate, async (req, res) => {
  try {
    const { shopId } = req.query;
    let cond = sql`1=1`;
    if (shopId) cond = sql`t.shop_id = ${Number(shopId)}`;

    const rows = await db.execute(sql`
      SELECT t.id, t.name as nomi, t.category as kategoriya,
             t.price_per_day as kunlik_narx, t.price_per_hour as soatlik_narx,
             t.deposit_amount as depozit, t.status as holat,
             COUNT(r.id)::int as ijara_soni,
             COALESCE(SUM(r.total_amount), 0)::real as jami_daromad
      FROM tools t
      LEFT JOIN rentals r ON r.tool_id = t.id
      WHERE ${cond}
      GROUP BY t.id ORDER BY jami_daromad DESC
    `);

    const csv = toCSV(rows.rows, [
      { key: "id", label: "№" },
      { key: "nomi", label: "Nomi" },
      { key: "kategoriya", label: "Kategoriya" },
      { key: "kunlik_narx", label: "Kunlik narx" },
      { key: "soatlik_narx", label: "Soatlik narx" },
      { key: "depozit", label: "Depozit" },
      { key: "holat", label: "Holat" },
      { key: "ijara_soni", label: "Ijara soni" },
      { key: "jami_daromad", label: "Jami daromad" },
    ]);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="asboblar_${new Date().toISOString().split("T")[0]}.csv"`);
    res.send(csv);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
