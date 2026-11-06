import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { uploadSessions, files, activities, users } from "@/db/schema";
import { getAuthUser } from "@/lib/server/guard";
import { assembleParts, clearParts } from "@/lib/server/storage";
import { and, eq, sql } from "drizzle-orm";

export const runtime = "edge";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;

  const [session] = await db.select().from(uploadSessions).where(and(eq(uploadSessions.id, id), eq(uploadSessions.userId, user.id))).limit(1);
  if (!session || session.status !== "pending") {
    return NextResponse.json({ error: "جلسة الرفع غير متاحة" }, { status: 404 });
  }

  try {
    const assembledBytes = await assembleParts(session.id, session.totalChunks, session.storageKey);

    const [file] = await db.insert(files).values({
      userId: user.id,
      folderId: session.folderId,
      fileName: session.fileName,
      fileSizeBytes: session.fileSizeBytes,
      mimeType: session.mimeType,
      storageKey: session.storageKey,
      thumbnailKey: session.thumbnailKey,
      chunkCount: session.totalChunks,
      encrypted: true,
    }).returning({ id: files.id });

    await db.update(uploadSessions).set({ status: "completed" }).where(eq(uploadSessions.id, session.id));
    await db.insert(activities).values({ userId: user.id, type: "upload", detail: `رفع «${session.fileName}»` });

    return NextResponse.json({ ok: true, fileId: file.id, assembledBytes });
  } catch (err) {
    console.error("upload complete error", err);
    await clearParts(session.id);
    await db.update(users).set({ storageUsedBytes: sql`GREATEST(0, ${users.storageUsedBytes} - ${session.fileSizeBytes})` }).where(eq(users.id, user.id));
    return NextResponse.json({ error: "تعذر تجميع الأجزاء — تأكد من اكتمال رفعها" }, { status: 500 });
  }
}
