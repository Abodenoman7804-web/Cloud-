import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { db } from "@/db";
import { users, activities } from "@/db/schema";
import { issueSessionCookies, publicUser } from "@/lib/server/guard";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (name.length < 2 || name.length > 120) {
      return NextResponse.json({ error: "الاسم قصير جداً" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return NextResponse.json({ error: "البريد الإلكتروني غير صالح" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" }, { status: 400 });
    }

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) {
      return NextResponse.json({ error: "هذا البريد مسجل مسبقاً" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const encryptionSalt = randomBytes(16).toString("base64");

    const [user] = await db
      .insert(users)
      .values({ name, email, passwordHash, encryptionSalt })
      .returning();

    await db.insert(activities).values({ userId: user.id, type: "signup", detail: "إنشاء الحساب" });
    await issueSessionCookies(user);

    return NextResponse.json({ user: publicUser(user) }, { status: 201 });
  } catch (err) {
    console.error("register error", err);
    return NextResponse.json({ error: "حدث خطأ غير متوقع" }, { status: 500 });
  }
}
