import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, files, folders, activities } from "@/db/schema";
import { getAuthUser } from "@/lib/server/guard";
import { and, eq, isNull, isNotNull, desc, sql, gte } from "drizzle-orm";

/** إحصائيات لوحة المعلومات: الحصة + التصنيفات + النشاط + الاتجاه الشهري */
export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const [fresh] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

  const [{ filesCount }] = await db
    .select({ filesCount: sql<number>`count(*)::int` })
    .from(files)
    .where(and(eq(files.userId, user.id), isNull(files.trashedAt)));

  const [{ foldersCount }] = await db
    .select({ foldersCount: sql<number>`count(*)::int` })
    .from(folders)
    .where(and(eq(folders.userId, user.id), isNull(folders.deletedAt)));

  const [{ favoritesCount }] = await db
    .select({ favoritesCount: sql<number>`count(*)::int` })
    .from(files)
    .where(and(eq(files.userId, user.id), isNull(files.trashedAt), eq(files.isFavorite, true)));

  const [{ trashCount, trashBytes }] = await db
    .select({
      trashCount: sql<number>`count(*)::int`,
      trashBytes: sql<number>`coalesce(sum(${files.fileSizeBytes}), 0)::bigint`,
    })
    .from(files)
    .where(and(eq(files.userId, user.id), isNotNull(files.trashedAt)));

  // توزيع الحجم حسب التصنيف
  const categoryRows = await db.execute(sql`
    SELECT
      CASE
        WHEN mime_type LIKE 'image/%' THEN 'image'
        WHEN mime_type LIKE 'video/%' THEN 'video'
        WHEN mime_type LIKE 'audio/%' THEN 'audio'
        WHEN mime_type LIKE 'application/pdf' OR mime_type LIKE '%word%' OR mime_type LIKE '%spreadsheet%'
             OR mime_type LIKE '%presentation%' OR mime_type LIKE 'text/%' OR mime_type LIKE 'application/csv' THEN 'document'
        WHEN mime_type LIKE '%zip%' OR mime_type LIKE '%rar%' OR mime_type LIKE '%7z%' OR mime_type LIKE '%gzip%' OR mime_type LIKE '%tar%' THEN 'archive'
        ELSE 'other'
      END AS category,
      COALESCE(SUM(file_size_bytes), 0)::bigint AS bytes,
      COUNT(*)::int AS count
    FROM files
    WHERE user_id = ${user.id} AND trashed_at IS NULL
    GROUP BY 1
  `);

  const categories: Record<string, { bytes: number; count: number }> = {};
  for (const row of categoryRows.rows as { category: string; bytes: string | number; count: number }[]) {
    categories[row.category] = { bytes: Number(row.bytes), count: Number(row.count) };
  }

  // الاتجاه الشهري لآخر 6 أشهر
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);
  const monthRows = await db
    .select({ fileSizeBytes: files.fileSizeBytes, createdAt: files.createdAt })
    .from(files)
    .where(and(eq(files.userId, user.id), gte(files.createdAt, sixMonthsAgo)));

  const trend: { month: string; bytes: number }[] = [];
  const fmt = new Intl.DateTimeFormat("ar", { month: "short" });
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    trend.push({ month: fmt.format(d), bytes: 0 });
  }
  for (const row of monthRows) {
    const d = new Date(row.createdAt);
    const now = new Date();
    const idx = 5 - (now.getFullYear() * 12 + now.getMonth() - (d.getFullYear() * 12 + d.getMonth()));
    if (idx >= 0 && idx < 6) trend[idx].bytes += row.fileSizeBytes;
  }

  const recentActivity = await db
    .select({ id: activities.id, type: activities.type, detail: activities.detail, createdAt: activities.createdAt })
    .from(activities)
    .where(eq(activities.userId, user.id))
    .orderBy(desc(activities.createdAt))
    .limit(9);

  const largestFiles = await db
    .select({ id: files.id, fileName: files.fileName, fileSizeBytes: files.fileSizeBytes, mimeType: files.mimeType })
    .from(files)
    .where(and(eq(files.userId, user.id), isNull(files.trashedAt)))
    .orderBy(desc(files.fileSizeBytes))
    .limit(5);

  return NextResponse.json({
    storage: {
      usedBytes: fresh.storageUsedBytes,
      limitBytes: fresh.storageLimitBytes,
      percent: fresh.storageLimitBytes > 0 ? (fresh.storageUsedBytes / fresh.storageLimitBytes) * 100 : 0,
    },
    totals: { filesCount, foldersCount, favoritesCount, trashCount, trashBytes: Number(trashBytes) },
    categories,
    trend,
    recentActivity,
    largestFiles,
  });
}
