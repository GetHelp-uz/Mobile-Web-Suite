import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate } from "../lib/auth.js";

const router = Router();

// GET /api/chat/rooms — foydalanuvchining barcha chat xonalari
router.get("/rooms", authenticate, async (req, res) => {
  try {
    const u = (req as any).user;
    let query;
    if (u.role === "customer") {
      query = sql`
        SELECT r.*, s.name as shop_name, s.image_url as shop_image,
               u.name as other_name, r.shop_unread as unread_count
        FROM chat_rooms r
        JOIN shops s ON s.id = r.shop_id
        JOIN users u ON u.id = s.owner_id
        WHERE r.customer_id = ${u.userId}
        ORDER BY r.last_message_at DESC NULLS LAST
      `;
    } else if (u.role === "shop_owner") {
      query = sql`
        SELECT r.*, s.name as shop_name,
               cu.name as customer_name, cu.phone as customer_phone,
               r.shop_unread as unread_count
        FROM chat_rooms r
        JOIN shops s ON s.id = r.shop_id
        JOIN users cu ON cu.id = r.customer_id
        WHERE s.owner_id = ${u.userId}
        ORDER BY r.last_message_at DESC NULLS LAST
      `;
    } else {
      res.json({ rooms: [] }); return;
    }
    const rows = await db.execute(query);
    res.json({ rooms: rows.rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/chat/rooms/:shopId — do'kon bilan chat boshlash (yoki mavjud xona)
router.post("/rooms/:shopId", authenticate, async (req, res) => {
  try {
    const u = (req as any).user;
    const shopId = Number(req.params.shopId);
    const customerId = u.role === "customer" ? u.userId : req.body.customerId;
    if (!customerId) { res.status(400).json({ error: "customerId kerak" }); return; }

    // Mavjud xona tekshirish
    let room = await db.execute(sql`
      SELECT r.*, s.name as shop_name, s.image_url as shop_image
      FROM chat_rooms r JOIN shops s ON s.id = r.shop_id
      WHERE r.shop_id = ${shopId} AND r.customer_id = ${customerId} LIMIT 1
    `);
    if (!room.rows.length) {
      room = await db.execute(sql`
        INSERT INTO chat_rooms (shop_id, customer_id)
        VALUES (${shopId}, ${customerId})
        RETURNING *
      `);
    }
    res.json({ room: room.rows[0] });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/chat/rooms/:id/messages?limit=50&before=
router.get("/rooms/:id/messages", authenticate, async (req, res) => {
  try {
    const { limit = "50", before } = req.query;
    let cond = sql`m.room_id = ${Number(req.params.id)}`;
    if (before) cond = sql`${cond} AND m.id < ${Number(before)}`;
    const rows = await db.execute(sql`
      SELECT m.*, u.name as sender_name, u.role as sender_role_name
      FROM chat_messages m
      JOIN users u ON u.id = m.sender_id
      WHERE ${cond}
      ORDER BY m.created_at DESC LIMIT ${Number(limit)}
    `);
    res.json({ messages: rows.rows.reverse() });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/chat/rooms/:id/messages/new?after=  — yangi xabarlarni tekshirish (polling)
router.get("/rooms/:id/messages/new", authenticate, async (req, res) => {
  try {
    const { after } = req.query;
    if (!after) { res.json({ messages: [] }); return; }
    const rows = await db.execute(sql`
      SELECT m.*, u.name as sender_name
      FROM chat_messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.room_id = ${Number(req.params.id)} AND m.id > ${Number(after)}
      ORDER BY m.created_at ASC
    `);
    res.json({ messages: rows.rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/chat/rooms/:id/messages — xabar yuborish
router.post("/rooms/:id/messages", authenticate, async (req, res) => {
  try {
    const u = (req as any).user;
    const { message } = req.body;
    if (!message?.trim()) { res.status(400).json({ error: "Xabar bo'sh bo'lishi mumkin emas" }); return; }

    const room = await db.execute(sql`SELECT * FROM chat_rooms WHERE id = ${Number(req.params.id)} LIMIT 1`);
    if (!room.rows.length) { res.status(404).json({ error: "Xona topilmadi" }); return; }
    const r = room.rows[0] as any;

    const msg = await db.execute(sql`
      INSERT INTO chat_messages (room_id, sender_id, sender_role, message)
      VALUES (${Number(req.params.id)}, ${u.userId}, ${u.role}, ${message.trim()})
      RETURNING *
    `);

    // Xona yangilash va o'qilmagan hisoblash
    if (u.role === "customer") {
      await db.execute(sql`
        UPDATE chat_rooms SET last_message = ${message.trim()}, last_message_at = NOW(),
          shop_unread = shop_unread + 1
        WHERE id = ${Number(req.params.id)}
      `);
      // Do'kon egasiga bildirishnoma
      const shop = await db.execute(sql`SELECT owner_id, name FROM shops WHERE id = ${r.shop_id} LIMIT 1`);
      if (shop.rows.length) {
        const owner = shop.rows[0] as any;
        await db.execute(sql`
          INSERT INTO notifications (user_id, title, body, type, related_id, related_type)
          VALUES (${owner.owner_id}, 'Yangi xabar', ${`Mijozdan xabar: ${message.trim().substring(0, 50)}`},
                  'message', ${Number(req.params.id)}, 'chat_room')
        `);
      }
    } else {
      await db.execute(sql`
        UPDATE chat_rooms SET last_message = ${message.trim()}, last_message_at = NOW(),
          customer_unread = customer_unread + 1
        WHERE id = ${Number(req.params.id)}
      `);
      // Mijozga bildirishnoma
      await db.execute(sql`
        INSERT INTO notifications (user_id, title, body, type, related_id, related_type)
        VALUES (${r.customer_id}, 'Yangi xabar', ${`Do'kondan javob: ${message.trim().substring(0, 50)}`},
                'message', ${Number(req.params.id)}, 'chat_room')
      `);
    }

    const fullMsg = await db.execute(sql`
      SELECT m.*, u.name as sender_name FROM chat_messages m
      JOIN users u ON u.id = m.sender_id WHERE m.id = ${(msg.rows[0] as any).id}
    `);
    res.json({ success: true, message: fullMsg.rows[0] });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/chat/rooms/:id/read — xabarlarni o'qildi deb belgilash
router.patch("/rooms/:id/read", authenticate, async (req, res) => {
  try {
    const u = (req as any).user;
    if (u.role === "customer") {
      await db.execute(sql`UPDATE chat_rooms SET customer_unread = 0 WHERE id = ${Number(req.params.id)}`);
      await db.execute(sql`UPDATE chat_messages SET is_read = TRUE WHERE room_id = ${Number(req.params.id)} AND sender_role != 'customer'`);
    } else {
      await db.execute(sql`UPDATE chat_rooms SET shop_unread = 0 WHERE id = ${Number(req.params.id)}`);
      await db.execute(sql`UPDATE chat_messages SET is_read = TRUE WHERE room_id = ${Number(req.params.id)} AND sender_role = 'customer'`);
    }
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/chat/unread — jami o'qilmagan xabarlar soni
router.get("/unread", authenticate, async (req, res) => {
  try {
    const u = (req as any).user;
    let count;
    if (u.role === "customer") {
      count = await db.execute(sql`SELECT COALESCE(SUM(customer_unread), 0) as total FROM chat_rooms WHERE customer_id = ${u.userId}`);
    } else if (u.role === "shop_owner") {
      count = await db.execute(sql`
        SELECT COALESCE(SUM(r.shop_unread), 0) as total FROM chat_rooms r
        JOIN shops s ON s.id = r.shop_id WHERE s.owner_id = ${u.userId}
      `);
    } else {
      res.json({ total: 0 }); return;
    }
    res.json({ total: Number((count.rows[0] as any)?.total || 0) });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
