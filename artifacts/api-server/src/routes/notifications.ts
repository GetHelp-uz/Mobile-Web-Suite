import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate } from "../lib/auth.js";

const router = Router();

// POST /api/notifications/register-token
router.post("/register-token", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { token, platform } = req.body;
    if (!token) { res.status(400).json({ error: "token kerak" }); return; }

    await db.execute(sql`
      INSERT INTO push_tokens (user_id, token, platform)
      VALUES (${user.userId}, ${token}, ${platform || 'expo'})
      ON CONFLICT (token) DO UPDATE SET user_id = ${user.userId}, is_active = TRUE
    `);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/notifications/send — push yuborish
router.post("/send", authenticate, async (req, res) => {
  try {
    const { userIds, title, body, data } = req.body;
    if (!userIds?.length || !title || !body) {
      res.status(400).json({ error: "userIds, title, body kerak" }); return;
    }

    const tokens = await db.execute(sql`
      SELECT token FROM push_tokens WHERE user_id = ANY(${userIds}::int[]) AND is_active = TRUE
    `);

    if (!tokens.rows.length) { res.json({ sent: 0, message: "Token topilmadi" }); return; }

    // Expo Push API
    const messages = tokens.rows.map((t: any) => ({
      to: t.token,
      title,
      body,
      data: data || {},
      sound: "default",
    }));

    const expoPushResp = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });

    const expResult = await expoPushResp.json();
    res.json({ sent: messages.length, result: expResult });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/notifications/broadcast — barcha aktiv foydalanuvchilarga
router.post("/broadcast", authenticate, async (req, res) => {
  try {
    const { title, body, role } = req.body;
    let query = sql`SELECT pt.token FROM push_tokens pt LEFT JOIN users u ON u.id = pt.user_id WHERE pt.is_active = TRUE`;
    if (role) query = sql`SELECT pt.token FROM push_tokens pt LEFT JOIN users u ON u.id = pt.user_id WHERE pt.is_active = TRUE AND u.role = ${role}`;

    const tokens = await db.execute(query);
    if (!tokens.rows.length) { res.json({ sent: 0 }); return; }

    const messages = tokens.rows.map((t: any) => ({
      to: t.token, title, body, sound: "default"
    }));

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });

    res.json({ sent: messages.length });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
