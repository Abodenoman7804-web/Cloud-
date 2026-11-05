import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { shareLinks, files } from "@/db/schema";
import { getAuthUser, presignPath } from "@/lib/server/guard";
import { and, eq, sql } from "drizzle-orm";

/** معلومات عامة عن الرابط + رابط تنزيل موقّع (لا يكشف مفتاح التشفير أبداً) */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const [row] = await db
    .select({
      shareId: shareLinks.id,
      expiresAt: shareLinks.expiresAt,
      revokedAt: shareLinks.revokedAt,
      fileId: files.id,
      fileName: files.fileName,
      fileSizeBytes: files.fileSizeBytes,
      mimeType: files.mimeType,
      storageKey: files.storageKey,
      chunkCount: files.chunkCount,
    })
    .from(shareLinks)
    .innerJoin(files, eq(files.id, shareLinks.fileId))
    .where(eq(shareLinks.token, token))
    .limit(1);

  if (!row) return NextResponse.json({ error: "الرابط غير موجود" }, { status: 404 });
  if (row.revokedAt) return NextResponse.json({ error: "تم إلغاء هذا الرابط" }, { status: 410 });
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    return NextResponse.json({ error: "انتهت صلاحية الرابط" }, { status: 410 });
  }

  await db.update(shareLinks).set({ downloadCount: sql`${shareLinks.downloadCount} + 1` }).where(eq(shareLinks.id, row.shareId));

  return NextResponse.json({
    fileName: row.fileName,
    fileSizeBytes: row.fileSizeBytes,
    mimeType: row.mimeType,
    chunkCount: row.chunkCount,
    expiresAt: row.expiresAt,
    url: presignPath(row.storageKey, 300),
  });
}

/** إلغاء رابط المشاركة (للمالك فقط) */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { token } = await params;

  const [updated] = await db
    .update(shareLinks)
    .set({ revokedAt: new Date() })
    .where(and(eq(shareLinks.token, token), eq(shareLinks.userId, user.id)))
    .returning({ id: shareLinks.id });
  if (!updated) return NextResponse.json({ error: "الرابط غير موجود" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
