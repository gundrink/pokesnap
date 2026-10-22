import { NextResponse } from "next/server";
import { mapLimit } from "@/lib/fetcher";
import { scoreMint } from "@/lib/score";
import { coinMcapUsd, pumpBoard, type PumpCoin } from "@/lib/sources";
import { classify, THEMES } from "@/lib/themes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const sample = Math.min(Number(new URL(req.url).searchParams.get("sample") ?? 2), 4);
  const [recent, movers, grad] = await Promise.all([pumpBoard("recent", 50), pumpBoard("movers", 40), pumpBoard("graduated", 40)]);
  const coins = new Map<string, PumpCoin>();
  for (const r of [movers, grad, recent]) if (r.ok) r.data.forEach((c) => coins.set(c.mint, c));
  const groups = new Map<string, PumpCoin[]>();
  for (const c of coins.values()) {
    for (const k of classify(`${c.name} ${c.symbol} ${c.description ?? ""}`)) {
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(c);
    }
  }
  const themes = await mapLimit([...groups.entries()], 2, async ([key, list]) => {
    list.sort((a, b) => (coinMcapUsd(b) ?? 0) - (coinMcapUsd(a) ?? 0));
    const sampled = await mapLimit(list.slice(0, sample), 2, async (c) => {
      try {
        const s = await scoreMint(c.mint);
        return { mint: c.mint, score: s.score };
      } catch {
        return null;
      }
    });
    const ok = sampled.filter(Boolean) as { mint: string; score: number }[];
    const t = THEMES.find((x) => x.key === key);
    return {
      key,
      label: t?.label ?? "Other",
      emoji: t?.emoji ?? "❔",
      count: list.length,
      totalMcap: list.reduce((a, c) => a + (coinMcapUsd(c) ?? 0), 0),
      avgScore: ok.length ? Math.round(ok.reduce((a, x) => a + x.score, 0) / ok.length) : null,
      scoredSample: ok.length,
      top: list.slice(0, 5).map((c) => ({ mint: c.mint, name: c.name, symbol: c.symbol, image: c.image_uri, mcap: coinMcapUsd(c), score: ok.find((o) => o.mint === c.mint)?.score ?? null })),
    };
  });
  themes.sort((a, b) => b.count - a.count);
  return NextResponse.json({
    totalCoins: coins.size,
    sources: { recent: recent.ok, movers: movers.ok, graduated: grad.ok },
    themes,
    at: Date.now(),
  });
}
