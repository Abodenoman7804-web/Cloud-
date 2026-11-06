import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { uploadSessions, folders, activities } from "@/db/schema";
import { getAuthUser } from "@/lib/server/guard";
import { ensureStorageRoots, writeThumb } from "@/lib/server/storage";
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

const MAX_FILE = 1099511627776; // 1 TB
const MAX_THUMB_B64 = 80_000; // ~60KB

/**
 * بدء جلسة رفع مجزأ:
 * 1) التحقق من الحصة ذرّياً بحجز المساحة (Atomic Reservation)
 * 2) إنشاء جلسة الرفع وإرجاع معرفها
 * لا تمر البايتات هنا إطلاقاً — الرفع مباشر إلى التخزين عبر روابط موقعة.
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  try {
    const body = await req.json();
    const fileName = String(body.fileName ?? "").trim().slice(0, 180);
    const mimeType = String(body.mimeType ?? "application/octet-stream").slice(0, 150);
    const fileSizeBytes = Number(body.fileSizeBytes ?? 0);
    const totalChunks = Number(body.totalChunks ?? 0);
    const folderId = body.folderId ? String(body.folderId) : null;
    const thumbnailB64: string | undefined = typeof body.thumbnail === "string" ? body.thumbnail : undefined;

    if (!fileName) return NextResponse.json({ error: "اسم الملف مطلوب" }, { status: 400 });
    if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0 || fileSizeBytes > MAX_FILE) {
      return NextResponse.json({ error: "حجم الملف غير صالح" }, { status: 400 });
    }
    if (!Number.isFinite(totalChunks) || totalChunks < 1 || totalChunks > 10_000) {
      return NextResponse.json({ error: "عدد الأجزاء غير صالح" }, { status: 400 });
    }

    if (folderId) {
      const [dest] = await db
        .select({ id: folders.id })
        .from(folders)
        .where(sql`${folders.id} = ${folderId} AND ${folders.userId} = ${user.id} AND ${folders.deletedAt} IS NULL`)
        .limit(1);
      if (!dest) return NextResponse.json({ error: "المجلد غير موجود" }, { status: 404 });
    }

    // حجز الحصة ذرّياً — يفشل إن كانت المساحة غير كافية
    const reserved = await db.execute(sql`
      UPDATE users
      SET storage_used_bytes = storage_used_bytes + ${fileSizeBytes}
      WHERE id = ${user.id}
        AND storage_used_bytes + ${fileSizeBytes} <= storage_limit_bytes
      RETURNING storage_used_bytes
    `);
    if (!reserved.rowCount) {
      return NextResponse.json(
        { error: "المساحة غير كافية. خطتك 1 تيرابايت — احذف ملفات أو فرّغ السلة.", code: "QUOTA_EXCEEDED" },
        { status: 413 }
      );
    }

    await ensureStorageRoots();

    const storageKey = `${user.id}/${randomUUID()}`;
    let thumbnailKey: string | null = null;
    if (thumbnailB64 && thumbnailB64.length <= MAX_THUMB_B64) {
      try {
        const buf = Buffer.from(thumbnailB64, "base64");
        if (buf.length > 0) {
          thumbnailKey = `${user.id}/thumb_${randomUUID()}`;
          await writeThumb(thumbnailKey, buf);
        }
      } catch (e) {
        console.warn("thumb write failed", e);
        thumbnailKey = null;
      }
    }

    const [session] = await db
      .insert(uploadSessions)
      .values({
        userId: user.id,
        folderId,
        fileName,
        mimeType,
        fileSizeBytes,
        totalChunks,
        storageKey,
        thumbnailKey,
        status: "pending",
      })
      .returning({ id: uploadSessions.id });

    return NextResponse.json({ sessionId: session.id }, { status: 201 });
  } catch (err) {
    console.error("upload init error", err);
    return NextResponse.json({ error: "حدث خطأ غير متوقع" }, { status: 500 });
  }
}
