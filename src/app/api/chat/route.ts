import { NextResponse } from "next/server";
import { mapLimit } from "@/lib/fetcher";
import { scoreMint, type ScoreResult } from "@/lib/score";
import { coinMcapUsd, isSolanaMint, pumpBoard, pumpSearch } from "@/lib/sources";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Msg = { role: "user" | "assistant"; content: string };
const usd = (n?: number) => (n == null ? "?" : n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}K` : `$${n.toFixed(0)}`);
const brief = (s: ScoreResult) =>
  `${s.name} ($${s.symbol}) — score ${s.score}/100 (${s.level}). MC ${usd(s.metrics.marketCapUsd)}, liq ${usd(s.metrics.liquidityUsd)}, holders ${s.metrics.holders ?? "?"}.\n` +
  s.factors.map((f) => `• ${f.label}: ${f.points}/${f.weight} — ${f.evidence[0]}`).join("\n");

// ---------- tools (shared by LLM + rule mode)
async function toolScore(mint: string) {
  const s = await scoreMint(mint);
  return { mint: s.mint, name: s.name, symbol: s.symbol, score: s.score, level: s.level, metrics: s.metrics, factors: s.factors.map((f) => ({ label: f.label, points: f.points, weight: f.weight, evidence: f.evidence })), reasons: s.reasons };
}
async function toolBoard(board: "movers" | "graduated" | "recent", limit = 5, scored = true) {
  const b = await pumpBoard(board, limit);
  if (!b.ok) throw new Error(`pump.fun ${board}: ${b.error}`);
  return mapLimit(b.data, 3, async (c) => {
    let score: number | null = null;
    if (scored) try { score = (await scoreMint(c.mint)).score; } catch {}
    return { mint: c.mint, name: c.name, symbol: c.symbol, mcap: coinMcapUsd(c), score };
  });
}
async function toolSearch(term: string) {
  const r = await pumpSearch(term);
  if (!r.ok) throw new Error(`search: ${r.error}`);
  return r.data.filter((c) => isSolanaMint(c.mint)).slice(0, 5).map((c) => ({ mint: c.mint, name: c.name, symbol: c.symbol, mcap: coinMcapUsd(c) }));
}

// ---------- rule-based mode
async function ruleReply(text: string): Promise<string> {
  const t = text.trim();
  const mint = t.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/)?.[0];
  try {
    if (mint && isSolanaMint(mint)) return brief(await scoreMint(mint));
    if (/safest|teraman|paling aman/i.test(t)) {
      const board = /recent|terbaru/i.test(t) ? "recent" : /mover/i.test(t) ? "movers" : "graduated";
      const list = (await toolBoard(board, 8)).filter((c) => c.score != null).sort((a, b) => b.score! - a.score!);
      return `Safest ${board} right now:\n` + list.slice(0, 5).map((c, i) => `${i + 1}. ${c.name} ($${c.symbol}) — ${c.score}/100, MC ${usd(c.mcap)}\n   ${c.mint}`).join("\n");
    }
    if (/riskiest|dangerous|bahaya|rug/i.test(t)) {
      const list = (await toolBoard("movers", 8)).filter((c) => c.score != null).sort((a, b) => a.score! - b.score!);
      return `Most dangerous movers:\n` + list.slice(0, 5).map((c, i) => `${i + 1}. ${c.name} ($${c.symbol}) — ${c.score}/100\n   ${c.mint}`).join("\n");
    }
    const bm = t.match(/(top\s+)?(movers|graduated|recent|terbaru)/i);
    if (bm) {
      const board = /graduated/i.test(bm[2]) ? "graduated" : /movers/i.test(bm[2]) ? "movers" : "recent";
      const list = await toolBoard(board, 6);
      return `Top ${board} on pump.fun:\n` + list.map((c, i) => `${i + 1}. ${c.name} ($${c.symbol}) — MC ${usd(c.mcap)} — score ${c.score ?? "n/a"}\n   ${c.mint}`).join("\n");
    }
    const sm = t.match(/^(search|cari|find)\s+(.+)/i);
    if (sm) {
      const list = await toolSearch(sm[2]);
      return list.length ? list.map((c) => `${c.name} ($${c.symbol}) MC ${usd(c.mcap)}\n   ${c.mint}`).join("\n") : "No coins found.";
    }
  } catch (e: any) {
    return `⚠️ ${e?.message ?? e}`;
  }
  return "I'm in rule mode (no OPENAI_API_KEY). Try:\n• score <mint>\n• top movers / top graduated / recent\n• safest graduated\n• riskiest movers\n• search <name>";
}

// ---------- LLM mode
const TOOLS = [
  { type: "function", function: { name: "score_token", description: "Run PokeSnap risk score (0-100, higher = safer) on a Solana mint using live pump.fun, DexScreener, RugCheck and RPC data.", parameters: { type: "object", properties: { mint: { type: "string" } }, required: ["mint"] } } },
  { type: "function", function: { name: "get_board", description: "List pump.fun coins from a board with PokeSnap scores.", parameters: { type: "object", properties: { board: { type: "string", enum: ["movers", "graduated", "recent"] }, limit: { type: "number" } }, required: ["board"] } } },
  { type: "function", function: { name: "search_coins", description: "Search pump.fun coins by name or ticker.", parameters: { type: "object", properties: { term: { type: "string" } }, required: ["term"] } } },
];

async function llmReply(messages: Msg[]): Promise<string> {
  const key = process.env.OPENAI_API_KEY!;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const convo: any[] = [
    { role: "system", content: "You are PokeSnap, an electric critter that sniffs pump.fun tokens for rugs. Always use tools for real data; never invent numbers. Be concise, reply in the user's language, cite scores and evidence. Not financial advice." },
    ...messages.slice(-12),
  ];
  for (let step = 0; step < 5; step++) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ model, messages: convo, tools: TOOLS }),
    });
    if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
    const msg = (await res.json()).choices[0].message;
    convo.push(msg);
    if (!msg.tool_calls?.length) return msg.content ?? "";
    for (const tc of msg.tool_calls) {
      let out: unknown;
      try {
        const a = JSON.parse(tc.function.arguments || "{}");
        out = tc.function.name === "score_token" ? await toolScore(a.mint) : tc.function.name === "get_board" ? await toolBoard(a.board, Math.min(a.limit ?? 5, 10)) : await toolSearch(a.term);
      } catch (e: any) {
        out = { error: String(e?.message ?? e) };
      }
      convo.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(out).slice(0, 12000) });
    }
  }
  return "I ran out of tool steps — try a more specific question.";
}

export async function POST(req: Request) {
  const { messages } = (await req.json()) as { messages: Msg[] };
  const last = messages?.[messages.length - 1]?.content ?? "";
  if (process.env.OPENAI_API_KEY) {
    try {
      return NextResponse.json({ mode: "llm", reply: await llmReply(messages) });
    } catch (e: any) {
      return NextResponse.json({ mode: "rules", reply: `(LLM failed: ${e?.message}; falling back)\n` + (await ruleReply(last)) });
    }
  }
  return NextResponse.json({ mode: "rules", reply: await ruleReply(last) });
}
