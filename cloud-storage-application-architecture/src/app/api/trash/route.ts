import { NextResponse } from "next/server";
import { db } from "@/db";
import { files, users } from "@/db/schema";
import { getAuthUser } from "@/lib/server/guard";
import { and, eq, isNotNull } from "drizzle-orm";
import { deleteBlob } from "@/lib/server/storage";
import { sql } from "drizzle-orm";

export const runtime = "edge";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const rows = await db.select({ id: files.id, fileName: files.fileName, fileSizeBytes: files.fileSizeBytes, mimeType: files.mimeType, thumbnailKey: files.thumbnailKey, chunkCount: files.chunkCount, trashedAt: files.trashedAt }).from(files).where(and(eq(files.userId, user.id), isNotNull(files.trashedAt)));
  return NextResponse.json({ files: rows });
}

export async function DELETE() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const trashed = await db.select({ id: files.id, storageKey: files.storageKey, thumbnailKey: files.thumbnailKey, fileSizeBytes: files.fileSizeBytes }).from(files).where(and(eq(files.userId, user.id), isNotNull(files.trashedAt)));
  let freed = 0;
  for (const f of trashed) {
    await deleteBlob(f.storageKey);
    await deleteBlob(f.thumbnailKey);
    freed += f.fileSizeBytes;
  }
  if (trashed.length) {
    await db.delete(files).where(and(eq(files.userId, user.id), isNotNull(files.trashedAt)));
    await db.update(users).set({ storageUsedBytes: sql`GREATEST(0, ${users.storageUsedBytes} - ${freed})` }).where(eq(users.id, user.id));
  }
  return NextResponse.json({ ok: true, purged: trashed.length, freedBytes: freed });
}
