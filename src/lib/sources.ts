import { fetchJson } from "./fetcher";

export const PUMP = "https://frontend-api-v3.pump.fun";
export const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

export const isSolanaMint = (s: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s.trim());

export type PumpCoin = {
  mint: string;
  name: string;
  symbol: string;
  description?: string;
  image_uri?: string;
  twitter?: string | null;
  telegram?: string | null;
  website?: string | null;
  creator?: string;
  created_timestamp?: number;
  complete?: boolean;
  market_cap?: number;
  usd_market_cap?: number;
  market_cap_usd?: number;
  canonical_pool_liquidity_usd?: number;
  total_supply?: number;
  bonding_curve?: string;
  associated_bonding_curve?: string;
  pump_swap_pool?: string;
  pool_address?: string;
  last_trade_timestamp?: number;
  ath_market_cap?: number;
};

export const coinMcapUsd = (c: PumpCoin) => c.market_cap_usd ?? c.usd_market_cap ?? undefined;

export function pumpCoin(mint: string) {
  return fetchJson<PumpCoin>(`${PUMP}/coins-v2/${mint}`);
}

export async function pumpBoard(board: "movers" | "graduated" | "recent", limit = 30) {
  if (board === "recent") {
    const r = await fetchJson<PumpCoin[]>(
      `${PUMP}/coins?sort=last_trade_timestamp&order=DESC&offset=0&limit=${limit}&includeNsfw=false`,
      { ttlMs: 30_000 }
    );
    return r.ok ? { ...r, data: r.data.filter((c) => isSolanaMint(c.mint)).slice(0, limit) } : r;
  }
  const r = await fetchJson<{ coins: PumpCoin[] }>(`${PUMP}/coins/boards/${board}`, { ttlMs: 30_000 });
  return r.ok ? { ok: true as const, ms: r.ms, data: (r.data.coins ?? []).filter((c) => isSolanaMint(c.mint)).slice(0, limit) } : r;
}

export function pumpSearch(term: string) {
  return fetchJson<PumpCoin[]>(`${PUMP}/coins/search-v2?searchTerm=${encodeURIComponent(term)}`);
}

export type DexPair = {
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: { address: string; symbol: string };
  priceUsd?: string;
  liquidity?: { usd?: number };
  fdv?: number;
  marketCap?: number;
  volume?: { h24?: number };
  priceChange?: { h1?: number; h24?: number };
  pairCreatedAt?: number;
  info?: { socials?: { type: string; url: string }[]; websites?: { url: string }[] };
};
export function dexToken(mint: string) {
  return fetchJson<{ pairs: DexPair[] | null }>(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
}

export type RugReport = {
  mint: string;
  creator?: string | null;
  creatorBalance?: number;
  token?: { supply: number; decimals: number; mintAuthority: string | null; freezeAuthority: string | null };
  topHolders?: { address: string; owner: string; pct: number; insider?: boolean; uiAmount?: number }[];
  risks?: { name: string; description: string; level: string; score?: number; value?: string }[];
  score_normalised?: number;
  markets?: { pubkey: string; marketType: string; lp?: { lpLockedUSD?: number } }[];
  totalMarketLiquidity?: number;
  totalHolders?: number;
  rugged?: boolean;
  knownAccounts?: Record<string, { name: string; type: string }>;
  graphInsidersDetected?: number;
  insiderNetworks?: { id: string; size: number; type: string; activeAccounts?: number; tokenAmount?: number }[] | null;
  creatorTokens?: unknown[] | null;
  tokenMeta?: { name?: string; symbol?: string };
};
export function rugReport(mint: string) {
  return fetchJson<RugReport>(`https://api.rugcheck.xyz/v1/tokens/${mint}/report`, { ttlMs: 90_000, timeoutMs: 12_000 });
}

export async function rpc<T = any>(method: string, params: unknown[], ttlMs = 30_000) {
  const r = await fetchJson<{ result?: T; error?: { message: string } }>(RPC_URL, {
    ttlMs,
    init: {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    },
  });
  if (!r.ok) return r;
  if (r.data.error) return { ok: false as const, error: r.data.error.message, ms: r.ms };
  return { ok: true as const, data: r.data.result as T, ms: r.ms };
}

export type MintInfo = { mintAuthority: string | null; freezeAuthority: string | null; supply: string; decimals: number };
export async function mintInfo(mint: string) {
  const r = await rpc<{ value: { data: { parsed: { info: MintInfo } } } | null }>("getAccountInfo", [
    mint,
    { encoding: "jsonParsed" },
  ]);
  if (!r.ok) return r;
  const info = r.data?.value?.data?.parsed?.info;
  if (!info) return { ok: false as const, error: "mint account not found", ms: r.ms };
  return { ok: true as const, data: info, ms: r.ms };
}
