import { NextResponse } from "next/server";
import { destroyRefreshSession } from "@/lib/server/guard";

export const runtime = "edge";

export async function POST() {
  await destroyRefreshSession();
  return NextResponse.json({ ok: true });
}
