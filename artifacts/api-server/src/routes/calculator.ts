import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

// Loyiha turlari uchun tavsiya etilgan asboblar sxemasi
const PROJECT_TEMPLATES: Record<string, { tools: string[]; multipliers: Record<string, number> }> = {
  apartment_repair: {
    tools: ["perforator", "bolg'a burg'u", "parketchi", "bo'yoq purkagich", "scaffolding", "shtukaturka mashina"],
    multipliers: { perforator: 0.5, "bolg'a burg'u": 0.3, parketchi: 0.2, "bo'yoq purkagich": 0.1, scaffolding: 0.3, "shtukaturka mashina": 0.2 }
  },
  house_construction: {
    tools: ["beton aralashtirgich", "kran", "qoziq qoqgich", "beton nasos", "scaffolding", "perforator", "burg'ulash mashina"],
    multipliers: { "beton aralashtirgich": 1.0, kran: 0.5, "qoziq qoqgich": 0.3, "beton nasos": 0.5, scaffolding: 1.0, perforator: 0.5, "burg'ulash mashina": 0.3 }
  },
  road_work: {
    tools: ["asfalt yotqizgich", "vibroplita", "ekskavator", "buldozer", "asfalt freza"],
    multipliers: { "asfalt yotqizgich": 1.0, vibroplita: 0.5, ekskavator: 0.8, buldozer: 0.5, "asfalt freza": 0.3 }
  },
  landscaping: {
    tools: ["o'tchi", "ekskavator kichik", "agregat", "suv nasosi"],
    multipliers: { "o'tchi": 0.5, "ekskavator kichik": 0.3, agegat: 0.2, "suv nasosi": 0.1 }
  },
  plumbing: {
    tools: ["quvur kesish", "payvandlash", "gidravlik press"],
    multipliers: { "quvur kesish": 0.3, payvandlash: 0.5, "gidravlik press": 0.2 }
  }
};

// POST /api/calculator/estimate — loyiha hisob-kitobi
router.post("/estimate", async (req, res) => {
  try {
    const { projectType, areaM2, durationDays, region } = req.body;
    if (!projectType || !areaM2 || !durationDays) {
      res.status(400).json({ error: "projectType, areaM2, durationDays majburiy" });
      return;
    }

    const template = PROJECT_TEMPLATES[projectType];
    if (!template) {
      res.status(400).json({ error: "Loyiha turi noto'g'ri", validTypes: Object.keys(PROJECT_TEMPLATES) });
      return;
    }

    const area = Number(areaM2);
    const days = Number(durationDays);

    // Mavjud asboblardan moslarini qidirish
    const toolRows = await db.execute(sql`
      SELECT DISTINCT ON (t.category)
        t.id, t.name, t.category,
        COALESCE(t.price_per_day, 0) as daily_price,
        s.name as shop_name, s.region as shop_region
      FROM tools t
      LEFT JOIN shops s ON s.id = t.shop_id
      WHERE t.is_available = TRUE
      ${region ? sql`AND (s.region = ${region} OR s.region IS NULL)` : sql``}
      ORDER BY t.category, t.price_per_day ASC
      LIMIT 20
    `);

    // Hisob-kitob
    const baseRates: Record<string, number> = {
      apartment_repair: 50000,
      house_construction: 80000,
      road_work: 120000,
      landscaping: 30000,
      plumbing: 40000
    };
    const baseRatePerM2 = baseRates[projectType] || 50000;

    const estimatedTotal = area * baseRatePerM2 * (days / 30);

    const toolRecommendations = template.tools.map((toolName, idx) => {
      const foundTool = toolRows.rows.find((t: any) =>
        t.name?.toLowerCase().includes(toolName.toLowerCase()) ||
        t.category?.toLowerCase().includes(toolName.toLowerCase())
      ) as any;
      const qty = Math.max(1, Math.ceil(area * (template.multipliers[toolName] || 0.1) / 100));
      const dailyPrice = foundTool?.daily_price || (50000 + idx * 20000);
      return {
        toolName,
        toolId: foundTool?.id || null,
        shopName: foundTool?.shop_name || null,
        quantity: qty,
        dailyPrice,
        totalCost: qty * dailyPrice * days,
        available: !!foundTool
      };
    });

    const totalToolCost = toolRecommendations.reduce((sum, t) => sum + t.totalCost, 0);

    res.json({
      projectType,
      areaM2: area,
      durationDays: days,
      summary: {
        estimatedProjectCost: Math.round(estimatedTotal),
        toolRentalCost: Math.round(totalToolCost),
        savingsVsBuying: Math.round(totalToolCost * 4.5),
        costPerM2: Math.round(totalToolCost / area)
      },
      tools: toolRecommendations,
      tips: getTips(projectType)
    });
  } catch (err: any) { console.error('[Calculator]', err.message); res.status(500).json({ error: 'Server xatosi' }); }
});

// GET /api/calculator/project-types
router.get("/project-types", (_req, res) => {
  res.json({
    types: [
      { id: "apartment_repair", name: "Kvartira ta'mirlash", icon: "🏠" },
      { id: "house_construction", name: "Uy qurilishi", icon: "🏗️" },
      { id: "road_work", name: "Yo'l ishlari", icon: "🛣️" },
      { id: "landscaping", name: "Obodonlashtirish", icon: "🌳" },
      { id: "plumbing", name: "Santexnika", icon: "🔧" }
    ]
  });
});

function getTips(projectType: string): string[] {
  const tips: Record<string, string[]> = {
    apartment_repair: [
      "Avval elektr va santexnika ishlarini bajaring",
      "Perforator ishlatganda quloq himoyasini unutmang",
      "Bo'yoq purkashdan oldin barcha yuzalarni yopib oling"
    ],
    house_construction: [
      "Beton ishlari uchun havo haroratiga e'tibor bering",
      "Kranlar uchun maxsus ruxsatnoma kerak bo'lishi mumkin",
      "Scaffolding'ni har kuni tekshirib turing"
    ],
    road_work: [
      "Asfalt yotqizish uchun quruq ob-havo tanlang",
      "Vibroplita ishlatishdan oldin er ostidagi quvurlarni tekshiring",
      "Yo'l yopishdan oldin tegishli ruxsatnomalar oling"
    ],
    landscaping: [
      "Ekskavator ishlatishdan oldin yerga tekshiruv o'tkazing",
      "Suv nasosi uchun elektr manbaini belgilang",
      "Daraxt kesishda xavfsizlik masofasini saqlang"
    ],
    plumbing: [
      "Avval asosiy suv kranini o'chiring",
      "Payvandlash uchun havo almashtirishni ta'minlang",
      "Yangi quvurlarni bosim bilan sinab ko'ring"
    ]
  };
  return tips[projectType] || [];
}

export default router;
