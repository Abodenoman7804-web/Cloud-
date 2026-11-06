import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users, activities } from "@/db/schema";
import { getAuthUser } from "@/lib/server/guard";
import { eq } from "drizzle-orm";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  try {
    const body = await req.json();
    const currentPassword = String(body.currentPassword ?? "");
    const newPassword = String(body.newPassword ?? "");
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "كلمة المرور الجديدة قصيرة جداً (8 أحرف على الأقل)" }, { status: 400 });
    }
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "كلمة المرور الحالية غير صحيحة" }, { status: 400 });
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));
    await db.insert(activities).values({ userId: user.id, type: "security", detail: "تغيير كلمة المرور" });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("change password error", err);
    return NextResponse.json({ error: "حدث خطأ غير متوقع" }, { status: 500 });
  }
}
