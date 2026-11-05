import { NextResponse } from "next/server";
import { destroyRefreshSession } from "@/lib/server/guard";

export async function POST() {
  await destroyRefreshSession();
  return NextResponse.json({ ok: true });
}
