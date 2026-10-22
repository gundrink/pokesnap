import { NextResponse } from "next/server";
import { scoreMint } from "@/lib/score";
import { isSolanaMint } from "@/lib/sources";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const mint = (u.searchParams.get("mint") ?? "").trim();
  if (!isSolanaMint(mint)) return NextResponse.json({ error: "Invalid Solana mint address" }, { status: 400 });
  try {
    const r = await scoreMint(mint, { force: u.searchParams.get("fresh") === "1", deep: u.searchParams.get("deep") === "1", light: u.searchParams.get("light") === "1" });
    return NextResponse.json(r, { headers: { "cache-control": r.deep ? "s-maxage=60, stale-while-revalidate=120" : "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 404 });
  }
}
