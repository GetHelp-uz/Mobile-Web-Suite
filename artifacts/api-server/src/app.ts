import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes/index.js";
import { sendOverdueSmsAlerts } from "./lib/sms.js";

const app: Express = express();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(process.cwd(), "uploads");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// ─── Muddati o'tgan ijaralar uchun avtomatik SMS (har soatda) ──────────────────
function startOverdueCron() {
  const INTERVAL_MS = 60 * 60 * 1000; // 1 soat

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

  // Server ishga tushgandan 30 soniya keyin birinchi tekshiruv
  setTimeout(run, 30_000);
  setInterval(run, INTERVAL_MS);
}

startOverdueCron();

export default app;
