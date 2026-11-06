import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { files, folders, activities } from "@/db/schema";
import { getAuthUser } from "@/lib/server/guard";
import { and, eq, isNull } from "drizzle-orm";

export const runtime = "edge";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = { updatedAt: new Date() };

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (name.length < 1 || name.length > 180) return NextResponse.json({ error: "اسم الملف غير صالح" }, { status: 400 });
    patch.fileName = name;
  }
  if (typeof body.isFavorite === "boolean") patch.isFavorite = body.isFavorite;

  if (body.folderId !== undefined) {
    const target = body.folderId === null ? null : String(body.folderId);
    if (target) {
      const [dest] = await db
        .select({ id: folders.id })
        .from(folders)
        .where(and(eq(folders.id, target), eq(folders.userId, user.id), isNull(folders.deletedAt)))
        .limit(1);
      if (!dest) return NextResponse.json({ error: "المجلد الوجهة غير موجود" }, { status: 404 });
    }
    patch.folderId = target;
  }

  const [updated] = await db
    .update(files)
    .set(patch)
    .where(and(eq(files.id, id), eq(files.userId, user.id), isNull(files.trashedAt)))
    .returning({ id: files.id });
  if (!updated) return NextResponse.json({ error: "الملف غير موجود" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;

  const [updated] = await db
    .update(files)
    .set({ trashedAt: new Date() })
    .where(and(eq(files.id, id), eq(files.userId, user.id), isNull(files.trashedAt)))
    .returning({ id: files.id, fileName: files.fileName });
  if (!updated) return NextResponse.json({ error: "الملف غير موجود" }, { status: 404 });
  await db.insert(activities).values({ userId: user.id, type: "delete", detail: `نقل «${updated.fileName}» إلى السلة` });
  return NextResponse.json({ ok: true });
}
