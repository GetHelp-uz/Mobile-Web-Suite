import express, { type Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import hpp from "hpp";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes/index.js";
import { sendOverdueSmsAlerts } from "./lib/sms.js";

const app: Express = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV === "development";

// ─── TRUST PROXY (Nginx orqali ishlaydi) ───────────────────────────
app.set("trust proxy", 1);

// ─── HELMET: Xavfsizlik sarlavhalari ─────────────────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    xFrameOptions: { action: "deny" },
    xContentTypeOptions: true,
    xDnsPrefetchControl: { allow: false },
    crossOriginResourcePolicy: { policy: "same-site" },
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
  })
);

// Qo'shimcha xavfsizlik sarlavhalari
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  res.setHeader("Permissions-Policy", "camera=(self), microphone=(), geolocation=(), payment=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.removeHeader("X-Powered-By");
  next();
});

// ─── CORS: Faqat ruxsat berilgan manzillar ───────────────────────────────────
const ALLOWED_ORIGINS = [
  process.env.WEB_APP_URL,
  "http://localhost:5000",
  "http://localhost:22965",
  "http://localhost:3000",
  "http://localhost:5173",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS: ${origin} manzili ruxsatsiz`));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
    exposedHeaders: ["X-Request-ID"],
    maxAge: 86400,
  })
);

// ─── HPP: HTTP Parameter Pollution himoya ────────────────────────────────────
app.use(hpp({
  whitelist: ["status", "role", "category"],
}));

// ─── BODY SIZE LIMIT: DoS hujumidan himoya ───────────────────────────────────
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// ─── REQUEST ID: Har bir so'rovga noyob ID ───────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  req.headers["x-request-id"] = id;
  res.setHeader("X-Request-ID", id);
  next();
});

// ─── IP BLOKLASH: Hisobga olish ──────────────────────────────────────────────
const blockedIPs = new Set<string>();
const suspiciousIPs = new Map<string, number>();

function getClientIP(req: Request): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

app.use((req: Request, res: Response, next: NextFunction) => {
  const ip = getClientIP(req);
  if (blockedIPs.has(ip)) {
    return res.status(429).json({ error: "Kirish vaqtincha cheklangan" });
  }
  next();
});

// ─── RATE LIMITING ───────────────────────────────────────────────────────────
function isLocalIP(req: Request): boolean {
  const ip = getClientIP(req);
  return ip === "127.0.0.1" || ip === "::1" || ip.startsWith("::ffff:127.");
}

// Slow-down: Auth so'rovlari sekinlashtiriladi (brute-force oldini olish)
const authSlowDown = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 5,
  delayMs: (used) => (used - 5) * 500,
  maxDelayMs: 20000,
  skip: isLocalIP,
});

// Login: 15 daqiqada max 15 urinish
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: "Juda ko'p urinish. 15 daqiqadan keyin qayta urining." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: isLocalIP,
  handler: (req: Request, res: Response) => {
    const ip = getClientIP(req);
    const count = (suspiciousIPs.get(ip) || 0) + 1;
    suspiciousIPs.set(ip, count);
    if (count >= 5) {
      blockedIPs.add(ip);
      setTimeout(() => blockedIPs.delete(ip), 60 * 60 * 1000);
      console.warn(`[Security] IP bloklandi: ${ip}`);
    }
    res.status(429).json({ error: "Juda ko'p urinish. 15 daqiqadan keyin qayta urining." });
  },
});

// Umumiy API: 1 daqiqada 300 ta so'rov
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: { error: "Juda ko'p so'rov yuborildi. Biroz kuting." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: isLocalIP,
});

// AI chat uchun: 1 daqiqada 10 ta so'rov
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "AI limitiga yetdingiz. Biroz kuting." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: isLocalIP,
});

// Fayllar uchun: 1 daqiqada 30 ta
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "Fayl yuklash limiti. Qayta urining." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: isLocalIP,
});

app.use("/api/auth/login", authSlowDown, authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/ai/", aiLimiter);
app.use("/api/documents/", uploadLimiter);
app.use("/api", generalLimiter);

// ─── XSS/INJECTION DAN HIMOYA ────────────────────────────────────────────────
const DANGEROUS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gis,
  /<[^>]*on\w+\s*=/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /data:text\/html/gi,
  /\beval\s*\(/gi,
  /\bexec\s*\(/gi,
  /\bexpression\s*\(/gi,
  /\bunion\s+select/gi,
  /\bdrop\s+table/gi,
  /\binsert\s+into/gi,
  /\bdelete\s+from/gi,
  /\bupdate\s+\w+\s+set/gi,
  /';\s*--/g,
  /\/\*.*?\*\//gs,
];

function sanitizeValue(val: any, depth = 0): any {
  if (depth > 10) return val;
  if (typeof val === "string") {
    let clean = val;
    for (const pattern of DANGEROUS_PATTERNS) {
      clean = clean.replace(pattern, "");
    }
    return clean.slice(0, 10000);
  }
  if (Array.isArray(val)) return val.slice(0, 500).map(v => sanitizeValue(v, depth + 1));
  if (val && typeof val === "object") {
    const clean: any = {};
    for (const [k, v] of Object.entries(val)) {
      if (k.startsWith("$") || k.includes("..") || k.length > 100) continue;
      clean[k] = sanitizeValue(v, depth + 1);
    }
    return clean;
  }
  return val;
}

app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.body) req.body = sanitizeValue(req.body);
  next();
});

// ─── SECURITY LOGGING ────────────────────────────────────────────────────────
const SUSPICIOUS_PATHS = ["/etc/passwd", "/.env", "/wp-admin", "/phpmyadmin", "/.git", "/admin.php", "/<", "/%3C"];

app.use((req: Request, res: Response, next: NextFunction) => {
  const path = req.path.toLowerCase();
  if (SUSPICIOUS_PATHS.some(p => path.includes(p))) {
    const ip = getClientIP(req);
    console.warn(`[Security] Shubhali so'rov: ${ip} → ${req.method} ${req.path}`);
    const count = (suspiciousIPs.get(ip) || 0) + 3;
    suspiciousIPs.set(ip, count);
    if (count >= 10) {
      blockedIPs.add(ip);
      setTimeout(() => blockedIPs.delete(ip), 60 * 60 * 1000);
      console.warn(`[Security] IP avtomatik bloklandi: ${ip}`);
    }
    return res.status(404).json({ error: "Topilmadi" });
  }
  next();
});

// ─── ASOSIY ROUTERLAR ────────────────────────────────────────────────────────
app.use("/api", router);

// ─── 404 HANDLER ─────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Topilmadi" });
});

// ─── GLOBAL ERROR HANDLER ────────────────────────────────────────────────────
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  if (err.message?.includes("CORS")) {
    return res.status(403).json({ error: "CORS xatosi" });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "JSON formati noto'g'ri" });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "So'rov hajmi juda katta" });
  }

  res.status(err.status || 500).json({
    error: isDev ? err.message : "Server xatosi. Iltimos qayta urining.",
  });
});

// ─── MUDDATI O'TGAN IJARALAR UCHUN AVTOMATIK SMS ─────────────────────────────
function startOverdueCron() {
  const INTERVAL_MS = 60 * 60 * 1000;
  const run = async () => {
    try {
      const count = await sendOverdueSmsAlerts();
      if (count > 0) console.log(`[SMS Cron] ${count} ta muddati o'tgan ijara uchun SMS yuborildi`);
    } catch (err: any) {
      console.error("[SMS Cron] Xatolik:", err.message);
    }
  };
  setTimeout(run, 30_000);
  setInterval(run, INTERVAL_MS);
}

// ─── XAVFSIZLIK DAVRIY TOZALASH ──────────────────────────────────────────────
setInterval(() => {
  suspiciousIPs.clear();
  if (isDev) console.log("[Security] Shubhali IP ro'yxati tozalandi");
}, 60 * 60 * 1000);

startOverdueCron();

export default app;
