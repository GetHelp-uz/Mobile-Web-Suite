import { db, usersTable, shopsTable, toolsTable } from "@workspace/db";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding database...");

  // Create users
  const hashedPassword = await bcrypt.hash("password123", 10);

  const [superAdmin] = await db.insert(usersTable).values({
    name: "Super Admin",
    phone: "998901234567",
    email: "admin@toolrent.uz",
    password: hashedPassword,
    role: "super_admin",
    isActive: true,
  }).onConflictDoNothing().returning();
  console.log("Super admin:", superAdmin?.id);

  const [shopOwner] = await db.insert(usersTable).values({
    name: "Alisher Karimov",
    phone: "998901111111",
    email: "shop@toolrent.uz",
    password: hashedPassword,
    role: "shop_owner",
    isActive: true,
  }).onConflictDoNothing().returning();
  console.log("Shop owner:", shopOwner?.id);

  const [worker] = await db.insert(usersTable).values({
    name: "Bobur Toshmatov",
    phone: "998902222222",
    password: hashedPassword,
    role: "worker",
    isActive: true,
  }).onConflictDoNothing().returning();
  console.log("Worker:", worker?.id);

  const [customer] = await db.insert(usersTable).values({
    name: "Jasur Rahimov",
    phone: "998903333333",
    email: "customer@mail.com",
    password: hashedPassword,
    role: "customer",
    isActive: true,
  }).onConflictDoNothing().returning();
  console.log("Customer:", customer?.id);

  const ownerId = shopOwner?.id;
  if (!ownerId) {
    console.log("Shop owner already exists, skipping shops & tools");
    return;
  }

  // Create shops
  const [shop1] = await db.insert(shopsTable).values({
    name: "Qurilish Asboblari Markazi",
    address: "Toshkent, Mirzo Ulugbek ko'chasi 15",
    phone: "998711234567",
    ownerId,
    subscriptionStatus: "active",
    commission: 10,
    isActive: true,
  }).returning();

  const [shop2] = await db.insert(shopsTable).values({
    name: "ProTool Ijara",
    address: "Toshkent, Chilonzor 8-kvartal",
    phone: "998712345678",
    ownerId,
    subscriptionStatus: "active",
    commission: 12,
    isActive: true,
  }).returning();

  // Update shop owner shopId
  await db.update(usersTable).set({ shopId: shop1.id }).where(
    (await import("drizzle-orm")).eq(usersTable.id, ownerId)
  );

  // Create tools for shop1
  const toolsData = [
    { name: "Perforator Bosch 800W", category: "Drill", pricePerDay: 50000, depositAmount: 200000, status: "available" as const },
    { name: "Болгарка 125mm", category: "Saw", pricePerDay: 40000, depositAmount: 150000, status: "rented" as const },
    { name: "Kompressor 50L", category: "Compressor", pricePerDay: 80000, depositAmount: 300000, status: "available" as const },
    { name: "Generator 5KW", category: "Generator", pricePerDay: 120000, depositAmount: 500000, status: "available" as const },
    { name: "Narvon 3m", category: "Ladder", pricePerDay: 20000, depositAmount: 50000, status: "maintenance" as const },
    { name: "Welding Inverter", category: "Welder", pricePerDay: 90000, depositAmount: 350000, status: "available" as const },
    { name: "Beton Aralashtirgich", category: "Mixer", pricePerDay: 70000, depositAmount: 250000, status: "available" as const },
    { name: "Kafel Kesish Mashina", category: "Saw", pricePerDay: 45000, depositAmount: 180000, status: "available" as const },
  ];

  const { createHash } = await import("crypto");
  for (const tool of toolsData) {
    const qrCode = createHash("sha256").update(`tool:${tool.name}:shop:${shop1.id}:${Date.now()}`).digest("hex").slice(0, 16);
    await db.insert(toolsTable).values({
      ...tool,
      shopId: shop1.id,
      qrCode,
    });
  }

  // Tools for shop2
  const tools2Data = [
    { name: "Puncher Makita", category: "Drill", pricePerDay: 55000, depositAmount: 220000, status: "available" as const },
    { name: "Lift Jack 2T", category: "Equipment", pricePerDay: 60000, depositAmount: 400000, status: "available" as const },
    { name: "Scaffolding Set 4m", category: "Scaffold", pricePerDay: 100000, depositAmount: 600000, status: "rented" as const },
  ];

  for (const tool of tools2Data) {
    const qrCode = createHash("sha256").update(`tool:${tool.name}:shop:${shop2.id}:${Date.now()}`).digest("hex").slice(0, 16);
    await db.insert(toolsTable).values({
      ...tool,
      shopId: shop2.id,
      qrCode,
    });
  }

  console.log("Seed completed!");
  console.log("\nDemo accounts:");
  console.log("Super Admin: phone=998901234567, password=password123");
  console.log("Shop Owner:  phone=998901111111, password=password123");
  console.log("Worker:      phone=998902222222, password=password123");
  console.log("Customer:    phone=998903333333, password=password123");
}

seed().catch(console.error).finally(() => process.exit(0));
