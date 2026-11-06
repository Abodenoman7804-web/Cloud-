import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { shareLinks, files, activities } from "@/db/schema";
import { getAuthUser } from "@/lib/server/guard";
import { and, eq, isNull } from "drizzle-orm";
import { randomBytes } from "node:crypto";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  try {
    const body = await req.json();
    const fileId = String(body.fileId ?? "");
    const expiresInHours = Math.min(168, Math.max(1, Number(body.expiresInHours ?? 24)));

    const [file] = await db.select({ id: files.id, fileName: files.fileName }).from(files).where(and(eq(files.id, fileId), eq(files.userId, user.id), isNull(files.trashedAt))).limit(1);
    if (!file) return NextResponse.json({ error: "الملف غير موجود" }, { status: 404 });

    const token = randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + expiresInHours * 3600 * 1000);

    const [link] = await db.insert(shareLinks).values({ fileId: file.id, userId: user.id, token, expiresAt }).returning({ token: shareLinks.token, expiresAt: shareLinks.expiresAt });

    await db.insert(activities).values({ userId: user.id, type: "share", detail: `مشاركة «${file.fileName}»` });
    return NextResponse.json({ token: link.token, expiresAt: link.expiresAt, path: `/share/${link.token}` }, { status: 201 });
  } catch (err) {
    console.error("share create error", err);
    return NextResponse.json({ error: "حدث خطأ غير متوقع" }, { status: 500 });
  }
}
