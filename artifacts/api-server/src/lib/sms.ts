import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider?: string;
}

export interface SendSmsOptions {
  shopId?: number | null;
  rentalId?: number | null;
  templateType?: string;
  lang?: string;
}

// ─── Eskiz.uz ─────────────────────────────────────────────────────────────────
async function getEskizToken(email: string, password: string): Promise<string | null> {
  try {
    const res = await fetch("https://notify.eskiz.uz/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json() as any;
    return data?.data?.token ?? null;
  } catch { return null; }
}

async function sendViaEskiz(phone: string, message: string, senderId: string, token: string): Promise<SmsResult> {
  try {
    const cleanPhone = phone.replace(/\D/g, "");
    const res = await fetch("https://notify.eskiz.uz/api/message/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mobile_phone: cleanPhone, message, from: senderId, callback_url: "" }),
    });
    const data = await res.json() as any;
    if (data?.status === "waiting" || data?.id) {
      return { success: true, messageId: String(data.id || data.message_id || ""), provider: "eskiz" };
    }
    return { success: false, error: data?.message || "Eskiz xatolik", provider: "eskiz" };
  } catch (err: any) {
    return { success: false, error: err.message, provider: "eskiz" };
  }
}

// ─── Playmobile.uz ────────────────────────────────────────────────────────────
async function sendViaPlaymobile(phone: string, message: string, email: string, password: string, senderId: string): Promise<SmsResult> {
  try {
    const cleanPhone = phone.replace(/\D/g, "");
    const payload = {
      messages: [{ recipient: cleanPhone, "message-id": `msg_${Date.now()}`, sms: { originator: senderId || "GetHelp", content: { text: message } } }]
    };
    const credentials = Buffer.from(`${email}:${password}`).toString("base64");
    const res = await fetch("https://send.smsxabar.uz/broker-api/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${credentials}` },
      body: JSON.stringify(payload),
    });
    const data = await res.json() as any;
    if (res.ok || data?.status === 0) {
      return { success: true, messageId: String(data?.message_id || Date.now()), provider: "playmobile" };
    }
    return { success: false, error: data?.message || `HTTP ${res.status}`, provider: "playmobile" };
  } catch (err: any) {
    return { success: false, error: err.message, provider: "playmobile" };
  }
}

// ─── SMSC.ru ──────────────────────────────────────────────────────────────────
async function sendViaSmsc(phone: string, message: string, login: string, password: string): Promise<SmsResult> {
  try {
    const cleanPhone = phone.replace(/\D/g, "");
    const params = new URLSearchParams({
      login, psw: password,
      phones: cleanPhone,
      mes: message,
      fmt: "3",
      charset: "utf-8",
    });
    const res = await fetch(`https://smsc.ru/sys/send.php?${params}`);
    const data = await res.json() as any;
    if (data?.id) {
      return { success: true, messageId: String(data.id), provider: "smsc" };
    }
    return { success: false, error: data?.error || "SMSC.ru xatolik", provider: "smsc" };
  } catch (err: any) {
    return { success: false, error: err.message, provider: "smsc" };
  }
}

// ─── SMS.ru ───────────────────────────────────────────────────────────────────
async function sendViaSmsru(phone: string, message: string, apiKey: string): Promise<SmsResult> {
  try {
    const cleanPhone = phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("7") ? `+${cleanPhone}` : cleanPhone.startsWith("998") ? `+${cleanPhone}` : cleanPhone;
    const params = new URLSearchParams({
      api_id: apiKey,
      to: formattedPhone,
      msg: message,
      json: "1",
    });
    const res = await fetch(`https://sms.ru/sms/send?${params}`);
    const data = await res.json() as any;
    const smsData = data?.sms?.[formattedPhone];
    if (data?.status === "OK" && smsData?.status_code === 100) {
      return { success: true, messageId: String(smsData?.sms_id || ""), provider: "smsru" };
    }
    return { success: false, error: smsData?.status_text || "SMS.ru xatolik", provider: "smsru" };
  } catch (err: any) {
    return { success: false, error: err.message, provider: "smsru" };
  }
}

// ─── Infobip ──────────────────────────────────────────────────────────────────
async function sendViaInfobip(phone: string, message: string, apiKey: string, senderId: string, baseUrl: string): Promise<SmsResult> {
  try {
    const cleanPhone = phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("+") ? cleanPhone : `+${cleanPhone}`;
    const res = await fetch(`https://${baseUrl}/sms/2/text/advanced`, {
      method: "POST",
      headers: {
        "Authorization": `App ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        messages: [{ from: senderId || "GetHelp", destinations: [{ to: formattedPhone }], text: message }],
      }),
    });
    const data = await res.json() as any;
    const msgId = data?.messages?.[0]?.messageId;
    if (msgId) {
      return { success: true, messageId: msgId, provider: "infobip" };
    }
    return { success: false, error: data?.requestError?.serviceException?.text || "Infobip xatolik", provider: "infobip" };
  } catch (err: any) {
    return { success: false, error: err.message, provider: "infobip" };
  }
}

// ─── Asosiy SMS yuborish ───────────────────────────────────────────────────────
export async function sendSms(
  phone: string,
  message: string,
  options: SendSmsOptions = {}
): Promise<SmsResult> {
  const { shopId, rentalId, templateType, lang = "uz" } = options;
  let result: SmsResult = { success: false, error: "SMS sozlamasi topilmadi" };
  let usedProvider = "unknown";

  try {
    let settingsRow: any = null;
    if (shopId) {
      const r = await db.execute(sql`SELECT * FROM sms_settings WHERE shop_id = ${shopId} AND is_active = true LIMIT 1`);
      settingsRow = r.rows[0];
    }
    if (!settingsRow) {
      const r = await db.execute(sql`SELECT * FROM sms_settings WHERE shop_id IS NULL AND is_active = true ORDER BY id LIMIT 1`);
      settingsRow = r.rows[0];
    }

    if (!settingsRow) {
      await logSms(phone, message, "failed", shopId, rentalId, "unknown", templateType, lang, undefined, "SMS sozlamasi topilmadi");
      return result;
    }

    const provider = settingsRow.provider || "eskiz";
    usedProvider = provider;
    let token = settingsRow.token;

    if (provider === "eskiz") {
      if (settingsRow.email && settingsRow.password) {
        const needsRefresh = !token || !settingsRow.token_expires_at ||
          new Date(settingsRow.token_expires_at) < new Date(Date.now() + 60 * 60 * 1000);
        if (needsRefresh) {
          token = await getEskizToken(settingsRow.email, settingsRow.password);
          if (token) {
            const expiresAt = new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString();
            await db.execute(sql`UPDATE sms_settings SET token = ${token}, token_expires_at = ${expiresAt} WHERE id = ${settingsRow.id}`);
          }
        }
      }
      if (!token) {
        await logSms(phone, message, "failed", shopId, rentalId, provider, templateType, lang, undefined, "Eskiz token olinmadi");
        return { success: false, error: "Eskiz token olinmadi" };
      }
      result = await sendViaEskiz(phone, message, settingsRow.sender_id || "4546", token);

    } else if (provider === "playmobile") {
      if (!settingsRow.email || !settingsRow.password) {
        result = { success: false, error: "Playmobile login/parol kiritilmagan" };
      } else {
        result = await sendViaPlaymobile(phone, message, settingsRow.email, settingsRow.password, settingsRow.sender_id || "GetHelp");
      }

    } else if (provider === "smsc") {
      if (!settingsRow.email || !settingsRow.password) {
        result = { success: false, error: "SMSC.ru login/parol kiritilmagan" };
      } else {
        result = await sendViaSmsc(phone, message, settingsRow.email, settingsRow.password);
      }

    } else if (provider === "smsru") {
      if (!settingsRow.api_key) {
        result = { success: false, error: "SMS.ru API kalit kiritilmagan" };
      } else {
        result = await sendViaSmsru(phone, message, settingsRow.api_key);
      }

    } else if (provider === "infobip") {
      if (!settingsRow.api_key) {
        result = { success: false, error: "Infobip API kalit kiritilmagan" };
      } else {
        const infobipBaseUrl = settingsRow.token || "api.infobip.com";
        result = await sendViaInfobip(phone, message, settingsRow.api_key, settingsRow.sender_id || "GetHelp", infobipBaseUrl);
      }

    } else {
      result = { success: false, error: `Noma'lum provayder: ${provider}` };
    }
  } catch (err: any) {
    result = { success: false, error: err.message };
  }

  await logSms(phone, message, result.success ? "sent" : "failed", shopId, rentalId, usedProvider, templateType, lang, result.messageId, result.error);
  return result;
}

// ─── Shablon bilan SMS yuborish ────────────────────────────────────────────────
export async function sendTemplateSms(
  phone: string,
  type: string,
  vars: Record<string, string>,
  options: SendSmsOptions = {}
): Promise<SmsResult> {
  const lang = options.lang || "uz";
  try {
    const tmpl = await db.execute(sql`
      SELECT message FROM sms_templates
      WHERE type = ${type} AND is_active = true AND lang = ${lang}
        AND (shop_id = ${options.shopId ?? null} OR shop_id IS NULL)
      ORDER BY shop_id DESC NULLS LAST
      LIMIT 1
    `);

    let message: string;
    if (tmpl.rows[0]) {
      message = (tmpl.rows[0] as any).message;
    } else {
      const fallback = await db.execute(sql`
        SELECT message FROM sms_templates
        WHERE type = ${type} AND is_active = true AND lang = 'uz'
        ORDER BY shop_id DESC NULLS LAST LIMIT 1
      `);
      if (fallback.rows[0]) {
        message = (fallback.rows[0] as any).message;
      } else {
        return { success: false, error: `Shablon topilmadi: ${type}/${lang}` };
      }
    }

    for (const [key, value] of Object.entries(vars)) {
      message = message.replace(new RegExp(`\\{${key}\\}`, "g"), value);
    }

    return await sendSms(phone, message, { ...options, templateType: type });
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function logSms(
  phone: string, message: string, status: string,
  shopId?: number | null, rentalId?: number | null,
  provider = "eskiz", templateType?: string, lang?: string,
  messageId?: string, error?: string
) {
  try {
    await db.execute(sql`
      INSERT INTO sms_logs (shop_id, rental_id, phone, message, status, provider, template_type, lang, provider_message_id, error_message)
      VALUES (${shopId ?? null}, ${rentalId ?? null}, ${phone}, ${message}, ${status}, ${provider}, ${templateType ?? null}, ${lang ?? "uz"}, ${messageId ?? null}, ${error ?? null})
    `);
  } catch {}
}

// ─── Muddati o'tgan ijaralar uchun SMS ────────────────────────────────────────
export async function sendOverdueSmsAlerts(): Promise<number> {
  let count = 0;
  try {
    const overdue = await db.execute(sql`
      SELECT r.id AS rental_id, r.shop_id, r.due_date,
        u.phone AS customer_phone, u.name AS customer_name, u.preferred_lang,
        t.name AS tool_name, s.name AS shop_name
      FROM rentals r
      JOIN users u ON u.id = r.customer_id
      JOIN tools t ON t.id = r.tool_id
      JOIN shops s ON s.id = r.shop_id
      WHERE r.status = 'active'
        AND r.due_date < NOW() - INTERVAL '1 day'
        AND r.id NOT IN (
          SELECT DISTINCT rental_id FROM sms_logs
          WHERE rental_id IS NOT NULL AND status = 'sent'
            AND template_type = 'overdue' AND sent_at > NOW() - INTERVAL '24 hours'
        )
    `);

    for (const row of overdue.rows as any[]) {
      if (!row.customer_phone) continue;
      const lang = row.preferred_lang || "uz";
      const dateStr = new Date(row.due_date).toLocaleDateString("uz-UZ");
      const smsResult = await sendTemplateSms(
        row.customer_phone, "overdue",
        { ism: row.customer_name, asbob: row.tool_name, dokon: row.shop_name, sana: dateStr },
        { shopId: row.shop_id, rentalId: row.rental_id, lang }
      );
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

// ─── 1 kun oldin eslatma SMS ───────────────────────────────────────────────────
export async function sendReminderSmsAlerts(): Promise<number> {
  let count = 0;
  try {
    const upcoming = await db.execute(sql`
      SELECT r.id AS rental_id, r.shop_id, r.due_date,
        u.phone AS customer_phone, u.name AS customer_name, u.preferred_lang,
        t.name AS tool_name, s.name AS shop_name
      FROM rentals r
      JOIN users u ON u.id = r.customer_id
      JOIN tools t ON t.id = r.tool_id
      JOIN shops s ON s.id = r.shop_id
      WHERE r.status = 'active'
        AND r.due_date BETWEEN NOW() AND NOW() + INTERVAL '26 hours'
        AND r.id NOT IN (
          SELECT DISTINCT rental_id FROM sms_logs
          WHERE rental_id IS NOT NULL AND status = 'sent'
            AND template_type = 'rental_reminder' AND sent_at > NOW() - INTERVAL '24 hours'
        )
    `);

    for (const row of upcoming.rows as any[]) {
      if (!row.customer_phone) continue;
      const lang = row.preferred_lang || "uz";
      const dateStr = new Date(row.due_date).toLocaleDateString("uz-UZ");
      const smsResult = await sendTemplateSms(
        row.customer_phone, "rental_reminder",
        { ism: row.customer_name, asbob: row.tool_name, dokon: row.shop_name, sana: dateStr },
        { shopId: row.shop_id, rentalId: row.rental_id, lang }
      );
      if (smsResult.success) count++;
    }
  } catch (err: any) {
    console.error("Reminder SMS xatolik:", err.message);
  }
  return count;
}
