import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate, requireRole } from "../lib/auth.js";

const router = Router();

const SYSTEM_PROMPT = `Sen GetHelp.uz platforma administratori uchun AI yordamchisisiz. 
GetHelp.uz - Uzbekiston uchun qurilish asboblari ijarasi platformasi.

Platformadagi rollar: super_admin, shop_owner, worker, customer
To'lov tizimlari: Click, Payme, Paynet, Naqd pul
Barcha javoblarni O'zbek tilida ber.

Siz quyidagi sohalarda yordam bera olasiz:
- Platform boshqaruvi va optimallashtirish
- Foydalanuvchilar va do'konlar boshqaruvi
- Daromad tahlili va komissiya hisoblash
- Ijara va to'lov masalalari
- Xavfsizlik va audit
- SMS va bildirishnomalar
- Tarif rejalari va plaginylar

Konkret va foydali javoblar ber. Agar ma'lumot uchun DB so'rovi kerak bo'lsa, bu imkoniyat yo'qligini ayt.`;

router.post("/admin-chat", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== "string" || message.length > 2000) {
      res.status(400).json({ error: "Xabar noto'g'ri formatda" });
      return;
    }

    const baseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

    if (!baseUrl || !apiKey) {
      res.status(503).json({ error: "AI xizmati sozlanmagan" });
      return;
    }

    // Fetch some platform stats for context
    let statsContext = "";
    try {
      const [usersRes, rentalsRes, shopsRes] = await Promise.all([
        db.execute(sql`SELECT COUNT(*) as cnt, role FROM users GROUP BY role`),
        db.execute(sql`SELECT COUNT(*) as cnt, status FROM rentals GROUP BY status`),
        db.execute(sql`SELECT COUNT(*) as cnt FROM shops`),
      ]);
      const userStats = usersRes.rows.map((r: any) => `${r.role}: ${r.cnt}`).join(", ");
      const rentalStats = rentalsRes.rows.map((r: any) => `${r.status}: ${r.cnt}`).join(", ");
      statsContext = `\n\nJoriy platform statistikasi: Foydalanuvchilar (${userStats}), Ijaralar (${rentalStats}), Do'konlar: ${(shopsRes.rows[0] as any)?.cnt || 0}`;
    } catch {
      // ignore stats error
    }

    const msgs = [
      { role: "system", content: SYSTEM_PROMPT + statsContext },
      ...history.slice(-6).map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: msgs,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[AI Admin Chat] OpenAI error:", errText);
      throw new Error("AI xizmati javob bermadi");
    }

    const data = await response.json() as any;
    const reply = data.choices?.[0]?.message?.content || "Javob olinmadi";

    res.json({ reply });
  } catch (err: any) {
    console.error("[AI Admin Chat] Error:", err.message);
    res.status(500).json({ error: err.message || "AI xizmati muammosi" });
  }
});

export default router;
