import { NextResponse } from "next/server";
import { db } from "@/db";
import { files, users } from "@/db/schema";
import { getAuthUser, clearSessionCookies } from "@/lib/server/guard";
import { eq } from "drizzle-orm";
import { deleteBlob } from "@/lib/server/storage";

/** حذف الحساب نهائياً مع كل البايتات المخزنة */
export async function DELETE() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const all = await db
    .select({ storageKey: files.storageKey, thumbnailKey: files.thumbnailKey })
    .from(files)
    .where(eq(files.userId, user.id));
  for (const f of all) {
    await deleteBlob(f.storageKey);
    await deleteBlob(f.thumbnailKey);
  }
  await db.delete(users).where(eq(users.id, user.id)); // cascade يفك الارتباطات
  await clearSessionCookies();
  return NextResponse.json({ ok: true });
}
