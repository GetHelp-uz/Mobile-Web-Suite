import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import path from "path";

const s3 = new S3Client({
  endpoint: `https://${process.env.DO_SPACES_ENDPOINT || "fra1.digitaloceanspaces.com"}`,
  region: "fra1",
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY || "",
    secretAccessKey: process.env.DO_SPACES_SECRET || "",
  },
  forcePathStyle: false,
});

const BUCKET = process.env.DO_SPACES_BUCKET || "gethelp-img";
const CDN_BASE = process.env.DO_SPACES_CDN || "https://gethelp-img.fra1.cdn.digitaloceanspaces.com";

/**
 * Upload a file buffer to DigitalOcean Spaces
 * @param buffer File buffer
 * @param originalName Original file name (for extension)
 * @param folder Folder in Spaces bucket (e.g. "tools", "listings", "documents")
 * @returns CDN URL of the uploaded file
 */
export async function uploadToSpaces(
  buffer: Buffer,
  originalName: string,
  folder: string = "uploads"
): Promise<string> {
  const ext = path.extname(originalName).toLowerCase() || ".jpg";
  const uniqueName = `${crypto.randomBytes(16).toString("hex")}${ext}`;
  const key = `${folder}/${uniqueName}`;

  const contentTypeMap: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".heic": "image/heic",
    ".pdf": "application/pdf",
    ".svg": "image/svg+xml",
  };

  const contentType = contentTypeMap[ext] || "application/octet-stream";

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ACL: "public-read",
      ContentType: contentType,
      CacheControl: "public, max-age=31536000",
    })
  );

  return `${CDN_BASE}/${key}`;
}

/**
 * Delete a file from DigitalOcean Spaces
 * @param url CDN URL of the file to delete
 */
export async function deleteFromSpaces(url: string): Promise<void> {
  try {
    const key = url.replace(`${CDN_BASE}/`, "");
    await s3.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );
  } catch (err: any) {
    console.error("[S3] Delete error:", err.message);
  }
}

export { s3, BUCKET, CDN_BASE };
