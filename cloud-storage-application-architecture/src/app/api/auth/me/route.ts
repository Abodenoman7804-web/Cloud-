import { NextResponse } from "next/server";
import { getAuthUser, publicUser } from "@/lib/server/guard";

export const runtime = "edge";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  return NextResponse.json({ user: publicUser(user) });
}
