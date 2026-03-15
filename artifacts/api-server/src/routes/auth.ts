import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { generateToken, authenticate } from "../lib/auth.js";
import { LoginBody, RegisterBody } from "@workspace/api-zod";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const body = RegisterBody.parse(req.body);
    const existing = await db.select().from(usersTable).where(eq(usersTable.phone, body.phone));
    if (existing.length > 0) {
      res.status(400).json({ error: "Phone already registered" });
      return;
    }
    const hashed = await bcrypt.hash(body.password, 10);
    const [user] = await db.insert(usersTable).values({
      name: body.name,
      phone: body.phone,
      email: body.email,
      password: hashed,
      role: body.role as any,
    }).returning();
    const token = generateToken(user.id, user.role);
    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        shopId: user.shopId,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const body = LoginBody.parse(req.body);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.phone, body.phone));
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const valid = await bcrypt.compare(body.password, user.password);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    if (!user.isActive) {
      res.status(403).json({ error: "Account is inactive" });
      return;
    }
    const token = generateToken(user.id, user.role);
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        shopId: user.shopId,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/me", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      shopId: user.shopId,
      isActive: user.isActive,
      createdAt: user.createdAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
