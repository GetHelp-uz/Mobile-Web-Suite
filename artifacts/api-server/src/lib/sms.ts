import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ─── Eskiz.uz token olish ────────────────────────────────────────────────────
async function getEskizToken(email: string, password: string): Promise<string | null> {
  try {
    const res = await fetch("https://notify.eskiz.uz/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    return data?.data?.token ?? null;
  } catch {
    return null;
  }
}

// ─── Eskiz.uz orqali SMS yuborish ────────────────────────────────────────────
async function sendViaEskiz(
  phone: string,
  message: string,
  senderId: string,
  token: string
): Promise<SmsResult> {
  try {
    const cleanPhone = phone.replace(/\D/g, "");
    const res = await fetch("https://notify.eskiz.uz/api/message/sms/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        mobile_phone: cleanPhone,
        message,
        from: senderId,
        callback_url: "",
      }),
    });
    const data = await res.json();
    if (data?.status === "waiting" || data?.id) {
      return { success: true, messageId: String(data.id || data.message_id || "") };
    }
    return { success: false, error: data?.message || "Eskiz xatolik" };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Asosiy SMS yuborish funksiyasi ───────────────────────────────────────────
export async function sendSms(
  phone: string,
  message: string,
  shopId?: number | null,
  rentalId?: number | null
): Promise<SmsResult> {
  let result: SmsResult = { success: false, error: "SMS sozlamasi topilmadi" };

  try {
    // Shop sozlamasini yoki global sozlamani topamiz
    let settingsRow: any = null;
    if (shopId) {
      const shopResult = await db.execute(
        sql`SELECT * FROM sms_settings WHERE shop_id = ${shopId} AND is_active = true LIMIT 1`
      );
      settingsRow = shopResult.rows[0];
    }
    if (!settingsRow) {
      const globalResult = await db.execute(
        sql`SELECT * FROM sms_settings WHERE shop_id IS NULL AND is_active = true LIMIT 1`
      );
      settingsRow = globalResult.rows[0];
    }

    if (!settingsRow) {
      await logSms(phone, message, "failed", shopId, rentalId, "eskiz", undefined, "SMS sozlamasi topilmadi");
      return result;
    }

    const provider = settingsRow.provider || "eskiz";
    let token = settingsRow.token;

    // Token yangilash (eski yoki yo'q bo'lsa)
    if (provider === "eskiz" && settingsRow.email && settingsRow.password) {
      const needsRefresh =
        !token ||
        !settingsRow.token_expires_at ||
        new Date(settingsRow.token_expires_at) < new Date(Date.now() + 60 * 60 * 1000);

      if (needsRefresh) {
        token = await getEskizToken(settingsRow.email, settingsRow.password);
        if (token) {
          const expiresAt = new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString();
          await db.execute(
            sql`UPDATE sms_settings SET token = ${token}, token_expires_at = ${expiresAt} WHERE id = ${settingsRow.id}`
          );
        }
      }
    }

    if (!token) {
      await logSms(phone, message, "failed", shopId, rentalId, provider, undefined, "Token olinmadi");
      return { success: false, error: "SMS token olinmadi" };
    }

    if (provider === "eskiz") {
      result = await sendViaEskiz(phone, message, settingsRow.sender_id || "4546", token);
    } else {
      result = { success: false, error: `Noma'lum provider: ${provider}` };
    }
  } catch (err: any) {
    result = { success: false, error: err.message };
  }

  await logSms(
    phone,
    message,
    result.success ? "sent" : "failed",
    shopId,
    rentalId,
    "eskiz",
    result.messageId,
    result.error
  );

  return result;
}

async function logSms(
  phone: string,
  message: string,
  status: string,
  shopId?: number | null,
  rentalId?: number | null,
  provider = "eskiz",
  messageId?: string,
  error?: string
) {
  try {
    await db.execute(sql`
      INSERT INTO sms_logs (shop_id, rental_id, phone, message, status, provider, provider_message_id, error_message)
      VALUES (
        ${shopId ?? null},
        ${rentalId ?? null},
        ${phone},
        ${message},
        ${status},
        ${provider},
        ${messageId ?? null},
        ${error ?? null}
      )
    `);
  } catch {}
}

// ─── Muddati o'tgan ijaralar uchun SMS ────────────────────────────────────────
export async function sendOverdueSmsAlerts(): Promise<number> {
  let count = 0;
  try {
    // 1 kundan ko'proq muddati o'tgan faol ijaralarni topamiz (SMS yuborilmagan)
    const overdue = await db.execute(sql`
      SELECT
        r.id AS rental_id,
        r.shop_id,
        r.due_date,
        r.customer_id,
        u.phone AS customer_phone,
        u.name AS customer_name,
        t.name AS tool_name,
        s.name AS shop_name
      FROM rentals r
      JOIN users u ON u.id = r.customer_id
      JOIN tools t ON t.id = r.tool_id
      JOIN shops s ON s.id = r.shop_id
      WHERE r.status = 'active'
        AND r.due_date < NOW() - INTERVAL '1 day'
        AND r.id NOT IN (
          SELECT DISTINCT rental_id FROM sms_logs
          WHERE rental_id IS NOT NULL
            AND status = 'sent'
            AND sent_at > NOW() - INTERVAL '24 hours'
        )
    `);

    for (const row of overdue.rows as any[]) {
      if (!row.customer_phone) continue;

      // Shablon olish
      let templateMsg = `Hurmatli ${row.customer_name}, "${row.tool_name}" asbobining ijara muddati o'tib ketdi. Iltimos, do'konimizga qaytaring: ${row.shop_name}`;

      // Avval shop shablonini, keyin global shablonni qidiramiz
      const tmpl = await db.execute(sql`
        SELECT message FROM sms_templates
        WHERE type = 'overdue' AND is_active = true
          AND (shop_id = ${row.shop_id} OR shop_id IS NULL)
        ORDER BY shop_id DESC NULLS LAST
        LIMIT 1
      `);
      if (tmpl.rows[0]) {
        const t = tmpl.rows[0] as any;
        templateMsg = t.message
          .replace("{mijoz}", row.customer_name)
          .replace("{asbob}", row.tool_name)
          .replace("{dokon}", row.shop_name)
          .replace("{sana}", new Date(row.due_date).toLocaleDateString("uz-Cyrl"));
      }

      const smsResult = await sendSms(row.customer_phone, templateMsg, row.shop_id, row.rental_id);

      // Ijarani overdue qilib belgilaymiz
      if (smsResult.success) {
        await db.execute(sql`UPDATE rentals SET status = 'overdue' WHERE id = ${row.rental_id}`);
        count++;
      }
    }
  } catch (err: any) {
    console.error("Overdue SMS xatolik:", err.message);
  }
  return count;
}
