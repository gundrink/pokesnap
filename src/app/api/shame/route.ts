import { NextResponse } from "next/server";
import { readShame } from "@/lib/store";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET() {
  return NextResponse.json({ entries: await readShame() });
}
