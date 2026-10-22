import { NextResponse } from "next/server";
import { mapLimit } from "@/lib/fetcher";
import { scoreMint } from "@/lib/score";
import { coinMcapUsd, pumpBoard } from "@/lib/sources";
import { swr } from "@/lib/swr";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ?list=1 returns the board instantly (cards render immediately, client fills scores via /api/score).
// Without list, returns light-scored coins, cached 90s with stale-while-revalidate.
export async function GET(req: Request) {
  const u = new URL(req.url);
  const b = u.searchParams.get("board") ?? "movers";
  const board = (["movers", "graduated", "recent"].includes(b) ? b : "movers") as "movers" | "graduated" | "recent";
  const limit = Math.min(Number(u.searchParams.get("limit") ?? 9), 15);
  const list = await pumpBoard(board, limit);
  if (!list.ok) return NextResponse.json({ error: `pump.fun board failed: ${list.error}`, coins: [] }, { status: 502 });
  if (u.searchParams.get("list") === "1") {
    return NextResponse.json({
      board,
      coins: list.data.map((c) => ({ mint: c.mint, name: c.name, symbol: c.symbol, image: c.image_uri, mcap: coinMcapUsd(c) })),
      at: Date.now(),
    });
  }
  const { v, stale } = await swr(`arena:${board}:${limit}`, 90_000, 15 * 60_000, async () => {
    const coins = await mapLimit(list.data, 5, async (c) => {
      try { return await scoreMint(c.mint, { light: true }); }
      catch (e: any) { return { mint: c.mint, name: c.name, symbol: c.symbol, error: String(e?.message ?? e) }; }
    });
    return { board, coins, at: Date.now() };
  });
  return NextResponse.json({ ...v, stale });
}
