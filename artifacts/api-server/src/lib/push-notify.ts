import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export type NotifType =
  | "rental_start"
  | "rental_return"
  | "payment"
  | "deposit_return"
  | "overdue"
  | "general";

export interface PushPayload {
  userId: number;
  title: string;
  body: string;
  type: NotifType;
  rentalId?: number;
  soundType?: string;
}

export async function sendInAppNotification(payload: PushPayload) {
  try {
    await db.execute(sql`
      INSERT INTO notifications (user_id, title, body, type, related_id, related_type, sound_type, is_read, created_at)
      VALUES (
        ${payload.userId},
        ${payload.title},
        ${payload.body},
        ${payload.type},
        ${payload.rentalId ?? null},
        ${"rental"},
        ${payload.soundType ?? "general"},
        false,
        NOW()
      )
    `);
  } catch (err: any) {
    console.error("[Push Notify] DB error:", err.message);
  }
}

export async function sendRentalStartNotifications(rentalId: number) {
  try {
    const row = await db.execute(sql`
      SELECT r.id, r.customer_id, r.shop_id,
             t.name as tool_name,
             u.name as customer_name,
             s.owner_id
      FROM rentals r
      JOIN tools t ON t.id = r.tool_id
      JOIN users u ON u.id = r.customer_id
      JOIN shops s ON s.id = r.shop_id
      WHERE r.id = ${rentalId} LIMIT 1
    `);
    if (!row.rows.length) return;
    const r = row.rows[0] as any;

    await sendInAppNotification({
      userId: r.customer_id,
      title: "Ijara boshlandi",
      body: `"${r.tool_name}" asbobini ijaraga oldingiz`,
      type: "rental_start",
      rentalId,
      soundType: "rental_start",
    });

    if (r.owner_id) {
      await sendInAppNotification({
        userId: r.owner_id,
        title: "Yangi ijara",
        body: `${r.customer_name} "${r.tool_name}" asbobini ijaraga oldi`,
        type: "rental_start",
        rentalId,
        soundType: "rental_start",
      });
    }
  } catch (err: any) {
    console.error("[Push Notify] rental_start error:", err.message);
  }
}

export async function sendRentalReturnNotifications(rentalId: number, depositAmount = 0) {
  try {
    const row = await db.execute(sql`
      SELECT r.id, r.customer_id, r.shop_id, r.deposit_amount,
             t.name as tool_name,
             u.name as customer_name,
             s.owner_id
      FROM rentals r
      JOIN tools t ON t.id = r.tool_id
      JOIN users u ON u.id = r.customer_id
      JOIN shops s ON s.id = r.shop_id
      WHERE r.id = ${rentalId} LIMIT 1
    `);
    if (!row.rows.length) return;
    const r = row.rows[0] as any;
    const dep = depositAmount || Number(r.deposit_amount) || 0;

    await sendInAppNotification({
      userId: r.customer_id,
      title: "Ijara yakunlandi",
      body: dep > 0
        ? `"${r.tool_name}" qaytarildi. ${dep.toLocaleString()} so'm depozit hamyoningizga o'tkazildi`
        : `"${r.tool_name}" asbobini muvaffaqiyatli qaytardingiz`,
      type: "rental_return",
      rentalId,
      soundType: "rental_return",
    });

    if (r.owner_id) {
      await sendInAppNotification({
        userId: r.owner_id,
        title: "Asbob qaytarildi",
        body: `${r.customer_name} "${r.tool_name}" asbobini qaytardi`,
        type: "rental_return",
        rentalId,
        soundType: "rental_return",
      });
    }
  } catch (err: any) {
    console.error("[Push Notify] rental_return error:", err.message);
  }
}

export async function sendDepositNotification(customerId: number, amount: number, rentalId: number) {
  try {
    await sendInAppNotification({
      userId: customerId,
      title: "Depozit qaytarildi",
      body: `${amount.toLocaleString()} so'm depozit hamyoningizga muvaffaqiyatli o'tkazildi`,
      type: "deposit_return",
      rentalId,
      soundType: "payment",
    });
  } catch (err: any) {
    console.error("[Push Notify] deposit_return error:", err.message);
  }
}
