import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { folders, files } from "@/db/schema";
import { getAuthUser } from "@/lib/server/guard";
import { and, eq, isNull, desc } from "drizzle-orm";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const folderId = req.nextUrl.searchParams.get("folderId") || null;

  let folder = null as null | { id: string; name: string; parentId: string | null };
  if (folderId) {
    const [row] = await db
      .select({ id: folders.id, name: folders.name, parentId: folders.parentId, deletedAt: folders.deletedAt })
      .from(folders)
      .where(and(eq(folders.id, folderId), eq(folders.userId, user.id)))
      .limit(1);
    if (!row || row.deletedAt) return NextResponse.json({ error: "المجلد غير موجود" }, { status: 404 });
    folder = row;
  }

  const breadcrumbs: { id: string; name: string }[] = [];
  let cursor = folder;
  const allUserFolders = await db
    .select({ id: folders.id, name: folders.name, parentId: folders.parentId })
    .from(folders)
    .where(and(eq(folders.userId, user.id), isNull(folders.deletedAt)));
  const byId = new Map(allUserFolders.map((f) => [f.id, f]));
  let guard = 0;
  while (cursor && guard++ < 50) {
    breadcrumbs.unshift({ id: cursor.id, name: cursor.name });
    cursor = cursor.parentId ? byId.get(cursor.parentId) ?? null : null;
  }

  const subFolders = await db
    .select({ id: folders.id, name: folders.name, createdAt: folders.createdAt })
    .from(folders)
    .where(
      folderId
        ? and(eq(folders.userId, user.id), eq(folders.parentId, folderId), isNull(folders.deletedAt))
        : and(eq(folders.userId, user.id), isNull(folders.parentId), isNull(folders.deletedAt))
    )
    .orderBy(folders.name);

  const fileRows = await db
    .select({
      id: files.id,
      fileName: files.fileName,
      fileSizeBytes: files.fileSizeBytes,
      mimeType: files.mimeType,
      thumbnailKey: files.thumbnailKey,
      isFavorite: files.isFavorite,
      chunkCount: files.chunkCount,
      createdAt: files.createdAt,
      updatedAt: files.updatedAt,
    })
    .from(files)
    .where(
      folderId
        ? and(eq(files.userId, user.id), eq(files.folderId, folderId), isNull(files.trashedAt))
        : and(eq(files.userId, user.id), isNull(files.folderId), isNull(files.trashedAt))
    )
    .orderBy(desc(files.updatedAt));

  return NextResponse.json({ folderId, breadcrumbs, folders: subFolders, files: fileRows });
}
