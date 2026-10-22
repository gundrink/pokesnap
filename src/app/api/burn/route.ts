import { NextResponse } from "next/server";
import { pumpCoin, rpc, isSolanaMint } from "@/lib/sources";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const mint = (new URL(req.url).searchParams.get("mint") ?? process.env.NEXT_PUBLIC_POKESNAP_MINT ?? "").trim();
  if (!mint) return NextResponse.json({ configured: false });
  if (!isSolanaMint(mint)) return NextResponse.json({ configured: false, error: "Invalid mint" }, { status: 400 });
  const [sup, pump] = await Promise.all([rpc<{ value: { amount: string; decimals: number; uiAmount: number } }>("getTokenSupply", [mint]), pumpCoin(mint)]);
  if (!sup.ok) return NextResponse.json({ configured: true, mint, error: `RPC: ${sup.error}` }, { status: 502 });
  const decimals = sup.data.value.decimals;
  const current = Number(sup.data.value.amount) / 10 ** decimals;
  // pump.fun tokens launch with a fixed 1B supply; prefer pump's reported total_supply if available
  const initial = pump.ok && pump.data.total_supply ? pump.data.total_supply / 10 ** decimals : 1_000_000_000;
  const burned = Math.max(0, initial - current);
  return NextResponse.json({ configured: true, mint, initial, current, burned, burnedPct: (burned / initial) * 100, decimals, initialSource: pump.ok ? "pump.fun total_supply" : "assumed 1B (pump.fun standard)" });
}
