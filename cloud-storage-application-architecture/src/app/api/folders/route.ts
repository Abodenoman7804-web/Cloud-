import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { folders, files, activities } from "@/db/schema";
import { getAuthUser } from "@/lib/server/guard";
import { and, eq, isNull, inArray } from "drizzle-orm";

/** إنشاء مجلد جديد */
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const parentId = body.parentId ? String(body.parentId) : null;

    if (name.length < 1 || name.length > 120) {
      return NextResponse.json({ error: "اسم المجلد غير صالح" }, { status: 400 });
    }

    if (parentId) {
      const [parent] = await db
        .select({ id: folders.id })
        .from(folders)
        .where(and(eq(folders.id, parentId), eq(folders.userId, user.id), isNull(folders.deletedAt)))
        .limit(1);
      if (!parent) return NextResponse.json({ error: "المجلد الأب غير موجود" }, { status: 404 });
    }

    const [folder] = await db.insert(folders).values({ userId: user.id, name, parentId }).returning();
    await db.insert(activities).values({ userId: user.id, type: "folder", detail: `إنشاء مجلد «${name}»` });
    return NextResponse.json({ folder }, { status: 201 });
  } catch (err) {
    console.error("create folder error", err);
    return NextResponse.json({ error: "حدث خطأ غير متوقع" }, { status: 500 });
  }
}

/** قائمة كل المجلدات النشطة (لنوافذ النقل) */
export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const rows = await db
    .select({ id: folders.id, name: folders.name, parentId: folders.parentId })
    .from(folders)
    .where(and(eq(folders.userId, user.id), isNull(folders.deletedAt)));
  return NextResponse.json({ folders: rows });
}
