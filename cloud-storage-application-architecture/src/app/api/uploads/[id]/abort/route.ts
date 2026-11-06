import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { uploadSessions, users } from "@/db/schema";
import { getAuthUser } from "@/lib/server/guard";
import { clearParts } from "@/lib/server/storage";
import { and, eq, sql } from "drizzle-orm";

export const runtime = "edge";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;

  const [session] = await db.select().from(uploadSessions).where(and(eq(uploadSessions.id, id), eq(uploadSessions.userId, user.id))).limit(1);

  if (!session || session.status !== "pending") {
    return NextResponse.json({ ok: true });
  }

  await clearParts(session.id);
  await db.update(uploadSessions).set({ status: "aborted" }).where(eq(uploadSessions.id, session.id));
  await db.update(users).set({ storageUsedBytes: sql`GREATEST(0, ${users.storageUsedBytes} - ${session.fileSizeBytes})` }).where(eq(users.id, user.id));
  return NextResponse.json({ ok: true });
}
