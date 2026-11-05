import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { files, folders } from "@/db/schema";
import { getAuthUser } from "@/lib/server/guard";
import { and, eq, isNotNull, isNull } from "drizzle-orm";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;

  // جلب الملف لمعرفة مجلده الأصلي
  const [file] = await db
    .select({ id: files.id, folderId: files.folderId })
    .from(files)
    .where(and(eq(files.id, id), eq(files.userId, user.id), isNotNull(files.trashedAt)))
    .limit(1);
  if (!file) return NextResponse.json({ error: "الملف غير موجود في السلة" }, { status: 404 });

  // إن كان مجلده الأصلي حُذف ناعماً، نعيد الملف إلى الجذر كي لا يختفي
  let targetFolderId: string | null = file.folderId;
  if (targetFolderId) {
    const [folder] = await db
      .select({ id: folders.id })
      .from(folders)
      .where(and(eq(folders.id, targetFolderId), eq(folders.userId, user.id), isNull(folders.deletedAt)))
      .limit(1);
    if (!folder) targetFolderId = null;
  }

  await db.update(files).set({ trashedAt: null, folderId: targetFolderId }).where(eq(files.id, file.id));
  return NextResponse.json({ ok: true, folderId: targetFolderId });
}
