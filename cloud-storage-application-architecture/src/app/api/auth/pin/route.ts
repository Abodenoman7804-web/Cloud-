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
    const action = String(body.action ?? "");
    const pinHash = String(body.pinHash ?? "");

    if (action === "verify") {
      if (!user.pinHash) return NextResponse.json({ error: "لم يتم تعيين رمز PIN بعد" }, { status: 400 });
      const ok = await bcrypt.compare(pinHash, user.pinHash);
      if (!ok) return NextResponse.json({ error: "رمز PIN غير صحيح" }, { status: 401 });
      return NextResponse.json({ ok: true });
    }

    if (action === "setup") {
      if (!/^[a-f0-9]{64}$/.test(pinHash)) {
        return NextResponse.json({ error: "بصمة الرمز غير صالحة" }, { status: 400 });
      }
      if (user.pinHash && body.currentPinHash) {
        const ok = await bcrypt.compare(String(body.currentPinHash), user.pinHash);
        if (!ok) return NextResponse.json({ error: "رمز PIN الحالي غير صحيح" }, { status: 400 });
      }
      const stored = await bcrypt.hash(pinHash, 10);
      await db.update(users).set({ pinHash: stored }).where(eq(users.id, user.id));
      await db.insert(activities).values({ userId: user.id, type: "security", detail: user.pinHash ? "تغيير رمز PIN" : "تفعيل رمز PIN" });
      return NextResponse.json({ ok: true });
    }

    if (action === "check") {
      return NextResponse.json({ pinSet: Boolean(user.pinHash) });
    }

    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (err) {
    console.error("pin error", err);
    return NextResponse.json({ error: "حدث خطأ غير متوقع" }, { status: 500 });
  }
}
