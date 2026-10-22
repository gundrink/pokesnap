import { NextResponse } from "next/server";
import { mapLimit } from "@/lib/fetcher";
import { scoreMint } from "@/lib/score";
import { pumpBoard } from "@/lib/sources";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const board = (u.searchParams.get("board") ?? "movers") as "movers" | "graduated" | "recent";
  const limit = Math.min(Number(u.searchParams.get("limit") ?? 9), 15);
  const list = await pumpBoard(["movers", "graduated", "recent"].includes(board) ? board : "movers", limit);
  if (!list.ok) return NextResponse.json({ error: `pump.fun board failed: ${list.error}`, coins: [] }, { status: 502 });
  const scored = await mapLimit(list.data, 3, async (c) => {
    try {
      return await scoreMint(c.mint);
    } catch (e: any) {
      return { mint: c.mint, name: c.name, symbol: c.symbol, error: String(e?.message ?? e) };
    }
  });
  return NextResponse.json({ board, coins: scored, at: Date.now() });
}
