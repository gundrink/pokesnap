import { NextResponse } from "next/server";
import { pumpBoard, rpc } from "@/lib/sources";
import { fetchJson } from "@/lib/fetcher";
export const dynamic = "force-dynamic";
export async function GET() {
  const [p, d, r, s] = await Promise.all([
    pumpBoard("movers", 1),
    fetchJson("https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112"),
    fetchJson("https://api.rugcheck.xyz/v1/stats/recent"),
    rpc("getSlot", []),
  ]);
  return NextResponse.json({ pump: p.ok, dexscreener: d.ok, rugcheck: r.ok, rpc: s.ok });
}
