import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { uploadSessions } from "@/db/schema";
import { getAuthUser, signStorageKey } from "@/lib/server/guard";
import { and, eq } from "drizzle-orm";

export const runtime = "edge";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const part = Number(body.part ?? 0);

  const [session] = await db.select({ id: uploadSessions.id, totalChunks: uploadSessions.totalChunks, status: uploadSessions.status }).from(uploadSessions).where(and(eq(uploadSessions.id, id), eq(uploadSessions.userId, user.id))).limit(1);

  if (!session || session.status !== "pending") {
    return NextResponse.json({ error: "جلسة الرفع غير متاحة" }, { status: 404 });
  }
  if (!Number.isFinite(part) || part < 1 || part > session.totalChunks) {
    return NextResponse.json({ error: "رقم الجزء غير صالح" }, { status: 400 });
  }

  const key = `part.${session.id}.${part}`;
  const exp = Math.floor(Date.now() / 1000) + 600;
  const sig = signStorageKey(key, exp);
  return NextResponse.json({ part, url: `/api/storage/part?key=${encodeURIComponent(key)}&exp=${exp}&sig=${encodeURIComponent(sig)}` });
}
