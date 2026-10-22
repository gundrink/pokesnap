import { rpc } from "./sources";

// Lightweight same-funder clustering: for each top holder wallet, find its OLDEST signature
// (getSignaturesForAddress, 1 page of 1000) and read who paid / sent SOL in that first tx.
// Wallets with <1000 sigs reveal their first tx; older busy wallets are skipped (not "fresh").
export type FunderStats = {
  ok: boolean;
  checked: number;
  fresh: string[]; // wallets with < 25 total txs
  clusters: { funder: string; wallets: string[]; pct: number }[];
  clusteredPct: number;
  freshPct: number;
  error?: string;
};

const cache = new Map<string, { at: number; v: { funder?: string; sigCount: number } | null }>();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let chain: Promise<unknown> = Promise.resolve();
// global RPC throttle (~6 req/s) so concurrent scans don't 429 the public endpoint
function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const p = chain.then(() => sleep(160)).then(fn);
  chain = p.catch(() => {});
  return p;
}
async function call<T>(method: string, params: unknown[]) {
  for (let a = 0; a < 3; a++) {
    const r = await throttled(() => rpc<T>(method, params, 600_000));
    if (r.ok) return r;
    if (!/429|timeout|rate/i.test(r.error)) return r;
    await sleep(600 * (a + 1));
  }
  return { ok: false as const, error: "rpc rate-limited", ms: 0 };
}

async function firstFunder(wallet: string) {
  const hit = cache.get(wallet);
  if (hit && Date.now() - hit.at < 30 * 60_000) return hit.v;
  const sigs = await call<{ signature: string }[]>("getSignaturesForAddress", [wallet, { limit: 1000 }]);
  if (!sigs.ok) return undefined; // unknown (don't cache)
  const list = sigs.data ?? [];
  let v: { funder?: string; sigCount: number } | null = { sigCount: list.length };
  if (list.length && list.length < 1000) {
    const first = list[list.length - 1].signature;
    const tx = await call<any>("getTransaction", [first, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }]);
    if (tx.ok && tx.data) {
      const ins = [...(tx.data.transaction?.message?.instructions ?? []), ...(tx.data.meta?.innerInstructions ?? []).flatMap((i: any) => i.instructions)];
      const transfer = ins.find((i: any) => i?.parsed?.type === "transfer" && i?.parsed?.info?.destination === wallet && i?.parsed?.info?.lamports);
      const payer = tx.data.transaction?.message?.accountKeys?.find((k: any) => k.signer)?.pubkey;
      const funder = transfer?.parsed?.info?.source ?? (payer !== wallet ? payer : undefined);
      v = { funder, sigCount: list.length };
    }
  }
  cache.set(wallet, { at: Date.now(), v });
  if (cache.size > 5000) cache.delete(cache.keys().next().value as string);
  return v;
}

export async function funderStats(holders: { owner: string; pct: number }[], max = 15): Promise<FunderStats> {
  const top = holders.filter((h) => h.pct > 0.05).slice(0, max);
  if (!top.length) return { ok: true, checked: 0, fresh: [], clusters: [], clusteredPct: 0, freshPct: 0 };
  const res = await Promise.all(top.map((h) => firstFunder(h.owner)));
  const known = res.filter((r) => r !== undefined).length;
  if (known < Math.ceil(top.length / 2)) return { ok: false, checked: known, fresh: [], clusters: [], clusteredPct: 0, freshPct: 0, error: "Solana RPC rate-limited" };
  const by = new Map<string, { wallets: string[]; pct: number }>();
  const fresh: string[] = [];
  let freshPct = 0;
  top.forEach((h, i) => {
    const r = res[i];
    if (!r) return;
    if (r.sigCount < 25) { fresh.push(h.owner); freshPct += h.pct; }
    if (r.funder) {
      const g = by.get(r.funder) ?? { wallets: [], pct: 0 };
      g.wallets.push(h.owner); g.pct += h.pct;
      by.set(r.funder, g);
    }
  });
  // a funder that is itself a top holder also links them
  top.forEach((h) => { const g = by.get(h.owner); if (g && !g.wallets.includes(h.owner)) { g.wallets.push(h.owner); g.pct += h.pct; } });
  const clusters = [...by.entries()].filter(([, g]) => g.wallets.length >= 2).map(([funder, g]) => ({ funder, ...g })).sort((a, b) => b.pct - a.pct);
  return { ok: true, checked: known, fresh, clusters, clusteredPct: clusters.reduce((a, c) => a + c.pct, 0), freshPct };
}
