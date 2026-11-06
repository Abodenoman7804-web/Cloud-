import { NextResponse } from "next/server";
import { db } from "@/db";
import { files } from "@/db/schema";
import { getAuthUser } from "@/lib/server/guard";
import { and, eq, isNull, desc } from "drizzle-orm";

export const runtime = "edge";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const rows = await db
    .select({
      id: files.id,
      fileName: files.fileName,
      fileSizeBytes: files.fileSizeBytes,
      mimeType: files.mimeType,
      thumbnailKey: files.thumbnailKey,
      chunkCount: files.chunkCount,
      isFavorite: files.isFavorite,
      folderId: files.folderId,
      createdAt: files.createdAt,
    })
    .from(files)
    .where(and(eq(files.userId, user.id), eq(files.isFavorite, true), isNull(files.trashedAt)))
    .orderBy(desc(files.createdAt));
  return NextResponse.json({ files: rows });
}
