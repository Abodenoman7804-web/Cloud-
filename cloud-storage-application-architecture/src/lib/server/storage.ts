import { createWriteStream } from "fs";
import { mkdir, readFile, rm, stat, writeFile } from "fs/promises";
import { createReadStream } from "fs";
import { pipeline } from "stream/promises";
import path from "path";

/** جذر التخزين — يحاكي طبقة S3 (Cloudflare R2 / MinIO) محلياً */
export const STORAGE_ROOT = path.join(process.cwd(), ".data", "storage");
export const PARTS_ROOT = path.join(process.cwd(), ".data", "parts");

const KEY_RE = /^[a-zA-Z0-9][a-zA-Z0-9/_-]{0,200}$/;

export function safeStorageKey(key: string): string | null {
  if (!key || !KEY_RE.test(key) || key.includes("..")) return null;
  // منع الخروج من جذر التخزين
  const resolved = path.resolve(STORAGE_ROOT, key);
  if (!resolved.startsWith(path.resolve(STORAGE_ROOT))) return null;
  return resolved;
}

export function storagePath(key: string) {
  const safe = safeStorageKey(key);
  if (!safe) throw new Error("INVALID_STORAGE_KEY");
  return safe;
}

export function partsDir(uploadId: string) {
  if (!/^[a-f0-9-]{36}$/i.test(uploadId)) throw new Error("INVALID_UPLOAD_ID");
  return path.join(PARTS_ROOT, uploadId);
}

export async function ensureStorageRoots() {
  await mkdir(STORAGE_ROOT, { recursive: true });
  await mkdir(PARTS_ROOT, { recursive: true });
}

export async function writePart(uploadId: string, partNumber: number, body: Buffer) {
  const dir = partsDir(uploadId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, String(partNumber).padStart(6, "0")), body);
}

export async function writeThumb(thumbKey: string, data: Buffer) {
  const dest = storagePath(thumbKey);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, data);
}

/** تجميع الأجزاء المتوازية بالترتيب الصحيح — مثل CompleteMultipartUpload في S3 */
export async function assembleParts(uploadId: string, totalChunks: number, storageKey: string) {
  const dir = partsDir(uploadId);
  const dest = storagePath(storageKey);
  await mkdir(path.dirname(dest), { recursive: true });
  const out = createWriteStream(dest);
  for (let i = 1; i <= totalChunks; i++) {
    const partPath = path.join(dir, String(i).padStart(6, "0"));
    await pipeline(createReadStream(partPath), out, { end: false });
  }
  await new Promise<void>((resolve, reject) => {
    out.end(() => resolve());
    out.on("error", reject);
  });
  await rm(dir, { recursive: true, force: true });
  const info = await stat(dest);
  return info.size;
}

export async function deleteBlob(key: string | null | undefined) {
  if (!key) return;
  const safe = safeStorageKey(key);
  if (!safe) return;
  await rm(safe, { force: true });
}

export async function clearParts(uploadId: string) {
  try {
    await rm(partsDir(uploadId), { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

export async function readBlob(key: string) {
  return readFile(storagePath(key));
}
