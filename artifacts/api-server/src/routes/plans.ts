import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate, requireRole } from "../lib/auth.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM subscription_plans ORDER BY price ASC`);
    res.json({ plans: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const { name, nameUz, price, maxTools, maxWorkers, features } = req.body;
    if (!nameUz && !name) {
      res.status(400).json({ error: "Ism kiritilishi shart" });
      return;
    }
    const finalName = name || nameUz;
    const finalNameUz = nameUz || name;
    const featuresJson = JSON.stringify(features || []);
    const result = await db.execute(sql`
      INSERT INTO subscription_plans (name, name_uz, price, max_tools, max_workers, features)
      VALUES (
        ${finalName},
        ${finalNameUz},
        ${Number(price) || 0},
        ${Number(maxTools) || 30},
        ${Number(maxWorkers) || 3},
        ${featuresJson}::jsonb
      )
      RETURNING *
    `);
    res.status(201).json({ plan: result.rows[0] });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.patch("/:id", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, nameUz, price, maxTools, maxWorkers, features, isActive } = req.body;

    const sets: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (nameUz !== undefined) {
      sets.push(`name_uz = $${idx++}`);
      params.push(nameUz);
      sets.push(`name = $${idx++}`);
      params.push(name || nameUz);
    } else if (name !== undefined) {
      sets.push(`name = $${idx++}`);
      params.push(name);
    }
    if (price !== undefined) {
      sets.push(`price = $${idx++}`);
      params.push(Number(price));
    }
    if (maxTools !== undefined) {
      sets.push(`max_tools = $${idx++}`);
      params.push(Number(maxTools));
    }
    if (maxWorkers !== undefined) {
      sets.push(`max_workers = $${idx++}`);
      params.push(Number(maxWorkers));
    }
    if (features !== undefined) {
      sets.push(`features = $${idx++}::jsonb`);
      params.push(JSON.stringify(features));
    }
    if (isActive !== undefined) {
      sets.push(`is_active = $${idx++}`);
      params.push(Boolean(isActive));
    }

    if (!sets.length) {
      res.status(400).json({ error: "O'zgartirish uchun maydon kiritilmadi" });
      return;
    }

    params.push(id);
    const query = `UPDATE subscription_plans SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`;

    const { rows } = await db.$client.query(query, params);
    if (!rows.length) {
      res.status(404).json({ error: "Tarif topilmadi" });
      return;
    }
    res.json({ plan: rows[0] });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.execute(sql`UPDATE subscription_plans SET is_active = false WHERE id = ${id}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/assign", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const { shopId, planId } = req.body;
    if (!shopId || !planId) {
      res.status(400).json({ error: "shopId va planId kiritilishi shart" });
      return;
    }
    const endsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await db.execute(sql`
      UPDATE shops 
      SET plan_id = ${Number(planId)}, subscription_status = 'active', subscription_ends_at = ${endsAt}
      WHERE id = ${Number(shopId)}
    `);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
