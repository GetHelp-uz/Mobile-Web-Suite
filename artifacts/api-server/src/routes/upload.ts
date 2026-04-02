import { Router } from "express";
import multer from "multer";
import path from "path";
import { authenticate } from "../lib/auth.js";
import { uploadToSpaces } from "../lib/s3.js";

const router = Router();

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".pdf"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Faqat rasm va PDF fayllar qabul qilinadi"));
  },
});

// POST /api/upload/image — rasm yuklash (asbob, e'lon, profil uchun)
router.post("/image", authenticate, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Fayl yuborilmadi" });
      return;
    }

    const folder = (req.body.folder as string) || "images";
    const allowedFolders = ["tools", "listings", "documents", "profiles", "images", "shops"];
    const safeFolder = allowedFolders.includes(folder) ? folder : "images";

    const url = await uploadToSpaces(req.file.buffer, req.file.originalname, safeFolder);

    res.json({
      success: true,
      url,
      originalName: req.file.originalname,
      size: req.file.size,
    });
  } catch (err: any) {
    console.error("[Upload] Error:", err.message);
    res.status(500).json({ error: "Rasm yuklashda xatolik yuz berdi" });
  }
});

// POST /api/upload/images — bir nechta rasm yuklash
router.post("/images", authenticate, upload.array("files", 5), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: "Fayl yuborilmadi" });
      return;
    }

    const folder = (req.body.folder as string) || "images";
    const allowedFolders = ["tools", "listings", "documents", "profiles", "images", "shops"];
    const safeFolder = allowedFolders.includes(folder) ? folder : "images";

    const urls: string[] = [];
    for (const file of files) {
      const url = await uploadToSpaces(file.buffer, file.originalname, safeFolder);
      urls.push(url);
    }

    res.json({
      success: true,
      urls,
      count: urls.length,
    });
  } catch (err: any) {
    console.error("[Upload] Multiple error:", err.message);
    res.status(500).json({ error: "Rasmlar yuklashda xatolik yuz berdi" });
  }
});

export default router;
