/**
 * منظومة التشفير من طرف لآخر (Zero-Knowledge) — تعمل بالكامل داخل المتصفح:
 * مفتاح AES-256-GCM مشتق من كلمة مرور المستخدم عبر PBKDF2 (100 ألف تكرار).
 * الخادم لا يرى أبداً كلمة المرور أو المفتاح أو الملفات بصيغتها الأصلية.
 */

export const CHUNK_SIZE = 8 * 1024 * 1024; // 8MB لكل جزء
const IV_BYTES = 12;
const TAG_BYTES = 16;
export const CHUNK_OVERHEAD = IV_BYTES + TAG_BYTES; // 28 بايت
const PBKDF2_ITERATIONS = 100_000;

const encoder = new TextEncoder();

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(text));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

function b64urlToB64(s: string) {
  return s.replace(/-/g, "+").replace(/_/g, "/");
}

/** اشتقاق مفتاح الخزنة من كلمة المرور + الملح الفريد لكل مستخدم */
export async function deriveVaultKey(password: string, saltB64: string): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: b64ToBytes(b64urlToB64(saltB64)) as BufferSource, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

/** استيراد مفتاح خام (من ذاكرة الجلسة) */
export async function importRawVaultKey(rawB64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", b64ToBytes(rawB64) as BufferSource, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function exportRawVaultKey(key: CryptoKey): Promise<string> {
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", key));
  return bytesToB64(raw);
}

/** تشفير جزء واحد: IV عشوائي (12B) + نص مشفر + وسم GCM (16B) */
export async function encryptChunk(key: CryptoKey, plain: Uint8Array): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, plain as BufferSource));
  const out = new Uint8Array(IV_BYTES + ct.length);
  out.set(iv, 0);
  out.set(ct, IV_BYTES);
  return out;
}

export async function decryptChunk(key: CryptoKey, enc: Uint8Array): Promise<Uint8Array> {
  const iv = enc.subarray(0, IV_BYTES);
  const ct = enc.subarray(IV_BYTES);
  return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, ct as BufferSource));
}

/** عدد الأجزاء لملف بحجم معين */
export function chunkCountFor(size: number): number {
  return Math.max(1, Math.ceil(size / CHUNK_SIZE));
}

/** فك تشفير ملف كامل مجمّع (بعد جلبه من الرابط الموقّع) */
export async function decryptWholeFile(
  key: CryptoKey,
  encrypted: ArrayBuffer,
  plainSize: number,
  chunkCount: number
): Promise<Blob> {
  const bytes = new Uint8Array(encrypted);
  const parts: Uint8Array[] = [];
  let offset = 0;
  for (let i = 0; i < chunkCount; i++) {
    const isLast = i === chunkCount - 1;
    const plainLen = isLast ? plainSize - (chunkCount - 1) * CHUNK_SIZE : CHUNK_SIZE;
    const encLen = Math.max(plainLen, 0) + CHUNK_OVERHEAD;
    if (offset + encLen > bytes.length) break;
    const encChunk = bytes.subarray(offset, offset + encLen);
    parts.push(await decryptChunk(key, encChunk));
    offset += encLen;
  }
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const merged = new Uint8Array(total);
  let pos = 0;
  for (const p of parts) {
    merged.set(p, pos);
    pos += p.length;
  }
  return new Blob([merged.buffer as ArrayBuffer]);
}

/** توليد بصمة مصغرة (Thumbnail) مشفرة للصور والفيديو — تُحفظ سحابياً فقط */
export async function makeThumbnail(file: File): Promise<string | null> {
  try {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) return null;

    const url = URL.createObjectURL(file);
    const canvas = document.createElement("canvas");
    const MAX = 360;

    if (isImage) {
      const img = await loadImage(url);
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    } else {
      const video = document.createElement("video");
      video.src = url;
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("video-timeout")), 8000);
        video.onloadeddata = () => {
          video.currentTime = Math.min(1, (video.duration || 2) / 4);
        };
        video.onseeked = () => {
          clearTimeout(timer);
          resolve();
        };
        video.onerror = () => {
          clearTimeout(timer);
          reject(new Error("video-error"));
        };
      });
      const scale = Math.min(1, MAX / Math.max(video.videoWidth || 1, video.videoHeight || 1));
      canvas.width = Math.max(1, Math.round((video.videoWidth || 320) * scale));
      canvas.height = Math.max(1, Math.round((video.videoHeight || 180) * scale));
      canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    URL.revokeObjectURL(url);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
    return dataUrl.split(",")[1] ?? null;
  } catch {
    return null;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
