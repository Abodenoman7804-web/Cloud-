import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { files, users, activities } from "@/db/schema";
import { getAuthUser } from "@/lib/server/guard";
import { and, eq } from "drizzle-orm";
import { deleteBlob } from "@/lib/server/storage";

export const runtime = "edge";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;

  const [file] = await db
    .select({ id: files.id, fileName: files.fileName, storageKey: files.storageKey, thumbnailKey: files.thumbnailKey, fileSizeBytes: files.fileSizeBytes })
    .from(files)
    .where(and(eq(files.id, id), eq(files.userId, user.id)))
    .limit(1);
  if (!file) return NextResponse.json({ error: "الملف غير موجود" }, { status: 404 });

  await deleteBlob(file.storageKey);
  await deleteBlob(file.thumbnailKey);
  await db.delete(files).where(eq(files.id, file.id));
  await db.update(users).set({ storageUsedBytes: Math.max(0, user.storageUsedBytes - file.fileSizeBytes) }).where(eq(users.id, user.id));
  await db.insert(activities).values({ userId: user.id, type: "delete", detail: `حذف نهائي «${file.fileName}»` });
  return NextResponse.json({ ok: true });
}
