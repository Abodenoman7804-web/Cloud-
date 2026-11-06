import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users, activities } from "@/db/schema";
import { issueSessionCookies, publicUser } from "@/lib/server/guard";
import { eq } from "drizzle-orm";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      return NextResponse.json({ error: "البريد أو كلمة المرور غير صحيحة" }, { status: 401 });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "البريد أو كلمة المرور غير صحيحة" }, { status: 401 });
    }

    await db.insert(activities).values({ userId: user.id, type: "login", detail: "تسجيل الدخول" });
    await issueSessionCookies(user);

    return NextResponse.json({ user: publicUser(user) });
  } catch (err) {
    console.error("login error", err);
    return NextResponse.json({ error: "حدث خطأ غير متوقع" }, { status: 500 });
  }
}
