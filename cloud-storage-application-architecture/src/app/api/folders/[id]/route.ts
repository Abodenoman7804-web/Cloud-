import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { folders, files, activities } from "@/db/schema";
import { getAuthUser } from "@/lib/server/guard";
import { and, eq, isNull, inArray } from "drizzle-orm";

async function collectDescendants(userId: string, rootId: string): Promise<string[]> {
  const all = await db
    .select({ id: folders.id, parentId: folders.parentId })
    .from(folders)
    .where(and(eq(folders.userId, userId), isNull(folders.deletedAt)));
  const children = new Map<string, string[]>();
  for (const f of all) {
    if (!f.parentId) continue;
    const list = children.get(f.parentId) ?? [];
    list.push(f.id);
    children.set(f.parentId, list);
  }
  const result: string[] = [];
  const queue = [rootId];
  let guard = 0;
  while (queue.length && guard++ < 5000) {
    const current = queue.pop()!;
    result.push(current);
    for (const child of children.get(current) ?? []) queue.push(child);
  }
  return result;
}

/** إعادة تسمية مجلد */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (name.length < 1 || name.length > 120) {
    return NextResponse.json({ error: "اسم المجلد غير صالح" }, { status: 400 });
  }

  const [updated] = await db
    .update(folders)
    .set({ name })
    .where(and(eq(folders.id, id), eq(folders.userId, user.id), isNull(folders.deletedAt)))
    .returning({ id: folders.id, name: folders.name });
  if (!updated) return NextResponse.json({ error: "المجلد غير موجود" }, { status: 404 });
  return NextResponse.json({ folder: updated });
}

/** حذف ناعم: نقل الملفات إلى السلة وجميع المجلدات المتداخلة */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;

  const [folder] = await db
    .select({ id: folders.id, name: folders.name })
    .from(folders)
    .where(and(eq(folders.id, id), eq(folders.userId, user.id), isNull(folders.deletedAt)))
    .limit(1);
  if (!folder) return NextResponse.json({ error: "المجلد غير موجود" }, { status: 404 });

  const ids = await collectDescendants(user.id, id);
  await db.update(files).set({ trashedAt: new Date() }).where(and(eq(files.userId, user.id), inArray(files.folderId, ids)));
  await db.update(folders).set({ deletedAt: new Date() }).where(and(eq(folders.userId, user.id), inArray(folders.id, ids)));
  await db.insert(activities).values({ userId: user.id, type: "delete", detail: `حذف مجلد «${folder.name}» إلى السلة` });
  return NextResponse.json({ ok: true, removedFolders: ids.length });
}
