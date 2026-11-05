/** أدوات تنسيق العرض + تصنيف الملفات */

export function formatBytes(bytes: number | null | undefined, decimals = 1): string {
  if (!bytes || bytes <= 0) return "0 بايت";
  const units = ["بايت", "كيلوبايت", "ميغابايت", "غيغابايت", "تيرابايت"];
  const k = 1024;
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);
  const value = bytes / Math.pow(k, i);
  return `${value.toLocaleString("en-US", { maximumFractionDigits: decimals, minimumFractionDigits: i > 1 ? decimals : 0 })} ${units[i]}`;
}

export function formatSpeed(bytesPerSecond: number): string {
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return "—";
  return `${formatBytes(bytesPerSecond, 1)}/ث`;
}

export function formatDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("ar", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

export function timeAgo(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} د`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} س`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `منذ ${days} يوم`;
  return formatDate(d);
}

export type FileCategory = "image" | "video" | "audio" | "document" | "archive" | "other";

export function fileCategory(mime: string | null | undefined): FileCategory {
  const m = (mime || "").toLowerCase();
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("video/")) return "video";
  if (m.startsWith("audio/")) return "audio";
  if (/(pdf|word|excel|powerpoint|spreadsheet|presentation|text\/|csv|msword|officedocument|document|rtf|markdown)/.test(m)) return "document";
  if (/(zip|rar|7z|tar|gzip|compressed)/.test(m)) return "archive";
  return "other";
}

export const CATEGORY_LABEL: Record<FileCategory, string> = {
  image: "الصور",
  video: "الفيديو",
  audio: "الصوت",
  document: "المستندات",
  archive: "الأرشيف",
  other: "أخرى",
};

export const CATEGORY_COLOR: Record<FileCategory, string> = {
  image: "#22d3ee",
  video: "#a78bfa",
  audio: "#f472b6",
  document: "#34d399",
  archive: "#fbbf24",
  other: "#94a3b8",
};

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/** امتداد الملف للعرض */
export function fileExtension(name: string): string {
  const idx = name.lastIndexOf(".");
  if (idx < 0 || idx === name.length - 1) return "ملف";
  return name.slice(idx + 1).toUpperCase().slice(0, 8);
}
