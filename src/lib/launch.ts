import { fetchJson } from "./fetcher";

// Launch forensics from pump.fun's public trade feed: swap-api.pump.fun/v2/coins/{mint}/trades
// Pages newest -> oldest. The cursor is "<slotIndexId>-<timestampMs>"; a cursor with a max slot id and
// a timestamp seeks to "trades before that time", so we jump straight to the launch window at any coin age.
export type Trade = { tx: string; slotIndexId: string; timestamp: string; userAddress: string; type: "buy" | "sell"; program: string; amountUsd: string; baseAmount: string };
export type LaunchStats = {
  complete: boolean; // launch (first trade) was reached
  trades: number; // recent trades scanned
  firstTs?: number;
  creationSlotBuyPct: number; // supply bought in the creation slot (bundle)
  creationSlotWallets: number;
  sniperPct: number; // supply bought in the first SNIPE_SLOTS slots (incl. creation slot, incl. dev)
  sniperWallets: number;
  devBoughtPct: number;
  devSoldPct: number;
  firstSellSecs?: number; // seconds after launch the dev first sold
  tinyTradeShare: number; // share of recent trades < $1 (bot / wash / dust-phishing)
  buys: number; sells: number; buyUsd: number; sellUsd: number;
  earlyWallets: string[];
  topEarly: { wallet: string; pct: number; slot: number }[];
};

export const SNIPE_SLOTS = 10; // ~4 seconds
const slotOf = (t: Trade) => Number(t.slotIndexId.slice(0, 12));

async function pageTrades(mint: string, cursor: string, maxPages: number) {
  const out: Trade[] = [];
  for (let i = 0; i < maxPages; i++) {
    const url = `https://swap-api.pump.fun/v2/coins/${mint}/trades?limit=100&cursor=${encodeURIComponent(cursor)}`;
    let r = await fetchJson<{ trades: Trade[]; pagination: { nextCursor?: string; hasMore?: boolean } }>(url, { ttlMs: 20_000, timeoutMs: 8_000 });
    for (let a = 1; !r.ok && /429/.test(r.error) && a <= 3; a++) {
      await new Promise((res) => setTimeout(res, 700 * a)); // rate-limited: back off and retry
      r = await fetchJson(url, { ttlMs: 20_000, timeoutMs: 8_000, cacheKey: `${url}#retry${a}` });
    }
    if (!r.ok) return { trades: out, complete: false, error: r.error };
    out.push(...(r.data.trades ?? []));
    if (!r.data.pagination?.hasMore || !r.data.pagination.nextCursor) return { trades: out, complete: true };
    cursor = r.data.pagination.nextCursor;
  }
  return { trades: out, complete: false };
}

export async function launchStats(mint: string, creator: string | undefined, supply: number, createdMs?: number) {
  const started = Date.now();
  const recent = await pageTrades(mint, "0", 5);
  if (!recent.trades.length) return { ok: false as const, error: `pump.fun trades: ${recent.error ?? "no trades"}`, ms: Date.now() - started };
  let windowT: Trade[] = [];
  let complete = recent.complete;
  if (!complete && createdMs) {
    const w = await pageTrades(mint, `9999999999999999999999-${createdMs + 15_000}`, 25);
    windowT = w.trades;
    complete = w.complete;
  }
  const seen = new Set<string>();
  const all = [...recent.trades, ...windowT].filter((t) => {
    const k = `${t.tx}${t.slotIndexId}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  all.sort((a, b) => (a.slotIndexId < b.slotIndexId ? -1 : 1));
  const s0 = slotOf(all[0]);
  const t0 = Date.parse(all[0].timestamp);
  const pctOf = (t: Trade) => (Number(t.baseAmount) / supply) * 100;
  let creationSlotBuyPct = 0, sniperPct = 0, devBoughtPct = 0, devSoldPct = 0;
  let firstSellSecs: number | undefined;
  const cw = new Set<string>(), sw = new Map<string, { pct: number; slot: number }>();
  for (const t of all) {
    const p = pctOf(t), ds = slotOf(t) - s0;
    const isDev = !!creator && t.userAddress === creator;
    if (t.type === "buy") {
      if (ds === 0) { creationSlotBuyPct += p; cw.add(t.userAddress); }
      if (ds < SNIPE_SLOTS) {
        sniperPct += p;
        const e = sw.get(t.userAddress) ?? { pct: 0, slot: ds };
        e.pct += p;
        sw.set(t.userAddress, e);
      }
      if (isDev) devBoughtPct += p;
    } else if (isDev) {
      devSoldPct += p;
      if (firstSellSecs == null) firstSellSecs = (Date.parse(t.timestamp) - t0) / 1000;
    }
  }
  let buys = 0, sells = 0, buyUsd = 0, sellUsd = 0, tiny = 0;
  for (const t of recent.trades) {
    const usd = Number(t.amountUsd) || 0;
    if (usd < 1) tiny++;
    if (t.type === "buy") { buys++; buyUsd += usd; } else { sells++; sellUsd += usd; }
  }
  const data: LaunchStats = {
    complete, trades: recent.trades.length, firstTs: t0,
    creationSlotBuyPct: complete ? creationSlotBuyPct : 0, creationSlotWallets: complete ? cw.size : 0,
    sniperPct: complete ? sniperPct : 0, sniperWallets: complete ? sw.size : 0,
    devBoughtPct, devSoldPct, firstSellSecs,
    tinyTradeShare: tiny / recent.trades.length, buys, sells, buyUsd, sellUsd,
    earlyWallets: complete ? [...sw.keys()] : [],
    topEarly: complete ? [...sw.entries()].map(([wallet, v]) => ({ wallet, ...v })).sort((a, b) => b.pct - a.pct).slice(0, 5) : [],
  };
  return { ok: true as const, data, ms: Date.now() - started };
}
