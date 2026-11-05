import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { files } from "@/db/schema";
import { getAuthUser, presignPath } from "@/lib/server/guard";
import { and, eq } from "drizzle-orm";

/** روابط موقّعة قصيرة العمر للملف والبصمة المصغرة (نمط Pre-signed GET) */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;

  const [file] = await db
    .select({
      id: files.id,
      fileName: files.fileName,
      fileSizeBytes: files.fileSizeBytes,
      mimeType: files.mimeType,
      storageKey: files.storageKey,
      thumbnailKey: files.thumbnailKey,
      chunkCount: files.chunkCount,
      isFavorite: files.isFavorite,
      createdAt: files.createdAt,
    })
    .from(files)
    .where(and(eq(files.id, id), eq(files.userId, user.id)))
    .limit(1);
  if (!file) return NextResponse.json({ error: "الملف غير موجود" }, { status: 404 });

  return NextResponse.json({
    file: {
      id: file.id,
      fileName: file.fileName,
      fileSizeBytes: file.fileSizeBytes,
      mimeType: file.mimeType,
      chunkCount: file.chunkCount,
      isFavorite: file.isFavorite,
      createdAt: file.createdAt,
    },
    url: presignPath(file.storageKey, 90),
    thumbnailUrl: file.thumbnailKey ? presignPath(file.thumbnailKey, 300) : null,
  });
}
