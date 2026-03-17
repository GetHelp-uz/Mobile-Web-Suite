import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate } from "../lib/auth.js";

const router = Router();

// Loyiha turlari va mos kategoriyalar xaritasi
const PROJECT_CATEGORY_MAP: Record<string, { categories: string[]; tools: string[]; description: string }> = {
  "uy_qurish": {
    categories: ["Burg'ulash asboblari", "Mixlash asboblari", "Ko'tarish uskunalari", "Beton aralashtirgich"],
    tools: ["perforator", "elektr burg'u", "beton aralashtiruvchi", "kran", "avtokran"],
    description: "Uy qurish loyihasi uchun asosiy uskunalar"
  },
  "pol_tashlash": {
    categories: ["Kesish asboblari", "Burg'ulash asboblari", "Boshqa"],
    tools: ["bolgar", "mozaika arralash", "pol pardozlovchi", "vibro platforma"],
    description: "Pol yotqizish uchun asosiy asboblar"
  },
  "gidravlika": {
    categories: ["Burg'ulash asboblari", "Kesish asboblari", "Boshqa"],
    tools: ["perforator", "quvur kesirgich", "quvur buragich", "press"],
    description: "Quvur va suv ta'minoti ishlari uchun"
  },
  "elektrr": {
    categories: ["Burg'ulash asboblari", "Mixlash asboblari", "Boshqa"],
    tools: ["perforator", "elektr burg'u", "shkaf", "kabel tartar"],
    description: "Elektr montaj ishlari uchun"
  },
  "tomir": {
    categories: ["Beton aralashtirgich", "Elaklash uskunalari", "Ko'tarish uskunalari"],
    tools: ["beton aralashtiruvchi", "vibrator", "kran"],
    description: "Poydevor va beton ishlari uchun"
  },
  "devor": {
    categories: ["Burg'ulash asboblari", "Mixlash asboblari", "Kesish asboblari"],
    tools: ["perforator", "elektr bolg'a", "bolgar", "arralash"],
    description: "Devor qurilishi uchun asboblar"
  },
  "tomchi": {
    categories: ["Ko'tarish uskunalari", "Mixlash asboblari", "Boshqa"],
    tools: ["tomi yoʻq", "kran", "lestnitsa"],
    description: "Tom va krisha ishlari uchun"
  },
  "pardozlash": {
    categories: ["Qazish asboblari", "Kesish asboblari", "Boshqa"],
    tools: ["shpatel", "pol pardozlovchi", "gips", "bo'yash"],
    description: "Pardozlash va qoplash ishlari uchun"
  },
  "yiqitish": {
    categories: ["Burg'ulash asboblari", "Kesish asboblari", "Kompressor"],
    tools: ["gidravlik bolg'a", "elektr bolg'a", "perforator"],
    description: "Buzish va yiqitish ishlari uchun"
  },
  "default": {
    categories: ["Burg'ulash asboblari", "Mixlash asboblari", "Kesish asboblari"],
    tools: ["perforator", "elektr burg'u", "bolgar"],
    description: "Umumiy qurilish ishlari uchun"
  }
};

// Loyiha turini aniqlash
function detectProjectType(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("uy") || t.includes("bino") || t.includes("quril")) return "uy_qurish";
  if (t.includes("pol") || t.includes("mosai") || t.includes("plitka")) return "pol_tashlash";
  if (t.includes("suv") || t.includes("quvur") || t.includes("santex") || t.includes("gidrav")) return "gidravlika";
  if (t.includes("elektr") || t.includes("chiziq") || t.includes("kabel")) return "elektrr";
  if (t.includes("tomir") || t.includes("poydevor") || t.includes("beton") || t.includes("tsement")) return "tomir";
  if (t.includes("devor") || t.includes("g'isht") || t.includes("blok")) return "devor";
  if (t.includes("tom") || t.includes("krish") || t.includes("yuqori")) return "tomchi";
  if (t.includes("pardoz") || t.includes("bo'ya") || t.includes("gips") || t.includes("suvaq")) return "pardozlash";
  if (t.includes("buz") || t.includes("yiqit") || t.includes("demolit")) return "yiqitish";
  return "default";
}

// POST /api/ai/recommend — AI tavsiya
router.post("/recommend", async (req, res) => {
  try {
    const { projectType, projectDescription, shopId, userId } = req.body;
    if (!projectType && !projectDescription) {
      res.status(400).json({ error: "projectType yoki projectDescription kerak" }); return;
    }

    const text = `${projectType || ""} ${projectDescription || ""}`.trim();
    const detectedType = detectProjectType(text);
    const mapping = PROJECT_CATEGORY_MAP[detectedType] || PROJECT_CATEGORY_MAP["default"];

    // Haqiqiy asboblarni qidirish
    let toolsQuery;
    if (shopId) {
      toolsQuery = await db.execute(sql`
        SELECT t.id, t.name, t.category, t.price_per_day, t.deposit_amount,
               t.status, t.image_url, t.description, t.barcode,
               s.name as shop_name, s.address as shop_address
        FROM tools t
        JOIN shops s ON s.id = t.shop_id
        WHERE t.shop_id = ${Number(shopId)} AND t.status = 'available'
          AND t.category = ANY(string_to_array(${mapping.categories.join('|')}, '|'))
        LIMIT 20
      `);
    } else {
      toolsQuery = await db.execute(sql`
        SELECT t.id, t.name, t.category, t.price_per_day, t.deposit_amount,
               t.status, t.image_url, t.description, t.barcode,
               s.name as shop_name, s.address as shop_address
        FROM tools t
        JOIN shops s ON s.id = t.shop_id
        WHERE t.status = 'available'
          AND t.category = ANY(string_to_array(${mapping.categories.join('|')}, '|'))
        ORDER BY t.price_per_day ASC
        LIMIT 20
      `);
    }

    // Agar mos asbob topilmasa — barcha mavjud asboblarni qaytarish
    let tools = toolsQuery.rows;
    if (tools.length === 0) {
      const fallback = shopId
        ? await db.execute(sql`SELECT t.*, s.name as shop_name FROM tools t JOIN shops s ON s.id = t.shop_id WHERE t.shop_id = ${Number(shopId)} AND t.status = 'available' LIMIT 10`)
        : await db.execute(sql`SELECT t.*, s.name as shop_name FROM tools t JOIN shops s ON s.id = t.shop_id WHERE t.status = 'available' ORDER BY RANDOM() LIMIT 10`);
      tools = fallback.rows;
    }

    // Log saqlash
    if (userId) {
      await db.execute(sql`
        INSERT INTO ai_recommendations (user_id, project_type, project_description, recommended_categories, shop_id)
        VALUES (${userId}, ${detectedType}, ${text}, ${JSON.stringify(mapping.categories)}::jsonb, ${shopId || null})
      `);
    }

    // AI "fikri" — satr yaratish
    const aiMessage = generateAIMessage(text, detectedType, mapping, tools.length);

    res.json({
      success: true,
      detectedType,
      aiMessage,
      recommendedCategories: mapping.categories,
      description: mapping.description,
      tools: tools,
    });
  } catch (err: any) { console.error('[Route Error]', err.message); res.status(500).json({ error: 'Server xatosi yuz berdi. Qayta urining.' }); }
});

function generateAIMessage(text: string, type: string, mapping: any, toolCount: number): string {
  const typeNames: Record<string, string> = {
    uy_qurish: "Uy qurish",
    pol_tashlash: "Pol yotqizish",
    gidravlika: "Santexnika/gidravlika",
    elektrr: "Elektr montaj",
    tomir: "Poydevor/beton",
    devor: "Devor qurilishi",
    tomchi: "Tom ishlari",
    pardozlash: "Pardozlash",
    yiqitish: "Buzish/yiqitish",
    default: "Umumiy qurilish"
  };

  const typeName = typeNames[type] || "Qurilish";
  return `Sizning loyihangiz: **${typeName}**. Bu ish uchun quyidagi kategoriyalar mos keladi: ${mapping.categories.join(", ")}. Sistemamizda ${toolCount} ta mos asbob topildi. Narxlarni va mavjudligini ko'rib, o'zingizga qulay asboblarni tanlang.`;
}

// GET /api/ai/categories — barcha kategoriyalar va loyihalar
router.get("/categories", async (req, res) => {
  const projectTypes = [
    { key: "uy_qurish", label: "Uy/Bino qurish", icon: "🏗️", description: "Yangi uy, ko'p qavatli bino, garaj" },
    { key: "pol_tashlash", label: "Pol yotqizish", icon: "⬛", description: "Plitka, laminat, parket, mozaika" },
    { key: "gidravlika", label: "Santexnika", icon: "🚿", description: "Suv quvurlari, vannaxona" },
    { key: "elektrr", label: "Elektr montaj", icon: "⚡", description: "Elektr tarmoq, rozetka, chiroq" },
    { key: "tomir", label: "Poydevor/Beton", icon: "🧱", description: "Tomir, beton quyish, poydevor" },
    { key: "devor", label: "Devor qurilishi", icon: "🧱", description: "G'isht, blok, devor ko'tarish" },
    { key: "tomchi", label: "Tom ishlari", icon: "🏠", description: "Krisha, tom yoqish, temir qoplash" },
    { key: "pardozlash", label: "Pardozlash", icon: "🎨", description: "Suvash, gips, bo'yash, dekor" },
    { key: "yiqitish", label: "Buzish/Yiqitish", icon: "💥", description: "Eski bino, devor buzish" },
  ];
  res.json({ projectTypes });
});

export default router;
