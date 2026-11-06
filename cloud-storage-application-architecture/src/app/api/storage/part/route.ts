import { NextResponse } from "next/server";
import { verifyStorageSignature } from "@/lib/server/guard";
import { writePart, ensureStorageRoots } from "@/lib/server/storage";
import { NextRequest } from "next/server";

export const runtime = "edge";

const KEY_RE = /^part\.([a-f0-9-]{36})\.(\d{1,6})$/i;
const MAX_PART = 40 * 1024 * 1024;

export async function PUT(req: NextRequest) {
  const url = req.nextUrl;
  const key = url.searchParams.get("key") ?? "";
  const exp = Number(url.searchParams.get("exp") ?? 0);
  const sig = url.searchParams.get("sig") ?? "";

  const match = KEY_RE.exec(key);
  if (!match) return NextResponse.json({ error: "مفتاح غير صالح" }, { status: 400 });
  if (!verifyStorageSignature(key, exp, sig)) {
    return NextResponse.json({ error: "توقيع غير صالح أو منتهي" }, { status: 403 });
  }

  const uploadId = match[1];
  const partNumber = Number(match[2]);
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_PART) {
    return NextResponse.json({ error: "الجزء أكبر من الحد المسموح" }, { status: 413 });
  }

  try {
    await ensureStorageRoots();
    const body = Buffer.from(await req.arrayBuffer());
    if (body.length === 0 || body.length > MAX_PART) {
      return NextResponse.json({ error: "حجم الجزء غير صالح" }, { status: 400 });
    }
    await writePart(uploadId, partNumber, body);
    return NextResponse.json({ ok: true, part: partNumber, bytes: body.length });
  } catch (err) {
    console.error("part upload error", err);
    return NextResponse.json({ error: "تعذر حفظ الجزء" }, { status: 500 });
  }
}
