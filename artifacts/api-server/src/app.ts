import express, { type Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes/index.js";
import { sendOverdueSmsAlerts } from "./lib/sms.js";

const app: Express = express();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── HELMET: Xavfsizlik sarlavhalari ─────────────────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
  })
);

// ─── CORS: Faqat ruxsat berilgan manzillar ───────────────────────────────────
const ALLOWED_ORIGINS = [
  process.env.WEB_APP_URL,
  process.env.REPLIT_DOMAIN,
  "http://localhost:22965",
  "http://localhost:3000",
  "http://localhost:5173",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Curl/server-to-server so'rovlar uchun origin bo'lmaydi (ruxsat beriladi)
      if (!origin) return callback(null, true);
      // Replit domenlariga ruxsat
      if (origin.includes(".replit.dev") || origin.includes(".repl.co") || origin.includes(".replit.app")) {
        return callback(null, true);
      }
      if (ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS: ${origin} manzili ruxsatsiz`));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ─── BODY SIZE LIMIT: Katta fayllar orqali DoS hujumidan himoya ──────────────
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// ─── RATE LIMITING ───────────────────────────────────────────────────────────
// Login va register: Brute-force hujumidan himoya
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 daqiqa
  max: 20,                   // 15 daqiqada 20 ta urinish
  message: { error: "Juda ko'p urinish. 15 daqiqadan keyin qayta urining." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Ishlab chiqarish muhitida lokal manzillarni o'tkazib yuborish
    const ip = req.ip || "";
    return ip === "127.0.0.1" || ip === "::1" || ip.startsWith("::ffff:127.");
  },
});

// Umumiy API: 1 daqiqada 200 ta so'rov
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: "Juda ko'p so'rov yuborildi. Biroz kuting." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const ip = req.ip || "";
    return ip === "127.0.0.1" || ip === "::1" || ip.startsWith("::ffff:127.");
  },
});

// Platformga umumiy limit, login/register ga qattiqroq limit
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api", generalLimiter);

// ─── XSS/INJECTION DAN HIMOYA: Kiruvchi ma'lumotlarni tozalash ───────────────
function sanitizeInput(obj: any): any {
  if (typeof obj === "string") {
    // HTML taglarini olib tashlash (XSS)
    return obj
      .replace(/<script[^>]*>.*?<\/script>/gis, "")
      .replace(/<[^>]+>/g, "")
      .replace(/javascript:/gi, "")
      .replace(/on\w+=/gi, "");
  }
  if (Array.isArray(obj)) return obj.map(sanitizeInput);
  if (obj && typeof obj === "object") {
    const clean: any = {};
    for (const [k, v] of Object.entries(obj)) {
      // Xavfli kalitlarni bloklash (NoSQL injection simulyatsiyasi)
      if (k.startsWith("$") || k.includes(".")) continue;
      clean[k] = sanitizeInput(v);
    }
    return clean;
  }
  return obj;
}

app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.body) req.body = sanitizeInput(req.body);
  // req.query getter-only bo'lishi mumkin, shuning uchun faqat body ni tozalaymiz
  next();
});

// ─── ASOSIY ROUTERLAR ────────────────────────────────────────────────────────
app.use("/api", router);

// ─── GLOBAL ERROR HANDLER ────────────────────────────────────────────────────
// Ichki xatoliklarni foydalanuvchiga ko'rsatmaslik
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const isDev = process.env.NODE_ENV === "development";
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  
  if (err.message?.includes("CORS")) {
    return res.status(403).json({ error: "CORS xatosi: Manzil ruxsatsiz" });
  }
  
  res.status(err.status || 500).json({
    error: isDev ? err.message : "Server xatosi. Iltimos qayta urinib ko'ring.",
  });
});

// ─── MUDDATI O'TGAN IJARALAR UCHUN AVTOMATIK SMS (har soatda) ────────────────
function startOverdueCron() {
  const INTERVAL_MS = 60 * 60 * 1000;
  const run = async () => {
    try {
      const count = await sendOverdueSmsAlerts();
      if (count > 0) {
        console.log(`[SMS Cron] ${count} ta muddati o'tgan ijara uchun SMS yuborildi`);
      }
    } catch (err: any) {
      console.error("[SMS Cron] Xatolik:", err.message);
    }
  };
  setTimeout(run, 30_000);
  setInterval(run, INTERVAL_MS);
}

startOverdueCron();

export default app;
