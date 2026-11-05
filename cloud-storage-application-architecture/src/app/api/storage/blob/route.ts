import { NextRequest, NextResponse } from "next/server";
import { verifyStorageSignature } from "@/lib/server/guard";
import { safeStorageKey } from "@/lib/server/storage";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";
import { ReadableStream as WebReadableStream } from "stream/web";

/** خدمة البايتات عبر رابط موقّع — مع دعم Range للبث التدريجي (Video Seeking) */
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key") ?? "";
  const exp = Number(req.nextUrl.searchParams.get("exp") ?? 0);
  const sig = req.nextUrl.searchParams.get("sig") ?? "";

  if (!verifyStorageSignature(key, exp, sig)) {
    return NextResponse.json({ error: "توقيع غير صالح أو منتهي" }, { status: 403 });
  }
  const filePath = safeStorageKey(key);
  if (!filePath) return NextResponse.json({ error: "مفتاح غير صالح" }, { status: 400 });

  let info;
  try {
    info = await stat(filePath);
  } catch {
    return NextResponse.json({ error: "الملف غير موجود" }, { status: 404 });
  }

  const total = info.size;
  const range = req.headers.get("range");
  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/octet-stream",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=60",
    "X-Content-Type-Options": "nosniff",
  };

  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    if (match) {
      let start = match[1] ? parseInt(match[1], 10) : 0;
      let end = match[2] ? parseInt(match[2], 10) : total - 1;
      if (Number.isNaN(start)) start = 0;
      if (Number.isNaN(end) || end >= total) end = total - 1;
      if (start > end) return new NextResponse(null, { status: 416 });

      const nodeStream = createReadStream(filePath, { start, end });
      const webStream = Readable.toWeb(nodeStream) as unknown as WebReadableStream<Uint8Array>;
      return new NextResponse(webStream as unknown as BodyInit, {
        status: 206,
        headers: { ...baseHeaders, "Content-Range": `bytes ${start}-${end}/${total}`, "Content-Length": String(end - start + 1) },
      });
    }
  }

  const nodeStream = createReadStream(filePath);
  const webStream = Readable.toWeb(nodeStream) as unknown as WebReadableStream<Uint8Array>;
  return new NextResponse(webStream as unknown as BodyInit, {
    status: 200,
    headers: { ...baseHeaders, "Content-Length": String(total) },
  });
}

// حذف الملف الموقّع عند الإزالة الدائمة عبر مسار آخر — غير مستخدم هنا
export async function HEAD() {
  return new NextResponse(null, { status: 405 });
}
