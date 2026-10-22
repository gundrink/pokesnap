import { coinMcapUsd, dexToken, mintInfo, pumpCoin, rugReport, type DexPair, type PumpCoin, type RugReport } from "./sources";
import { recordShame } from "./store";

export type FactorStatus = "good" | "warn" | "bad" | "unknown";
export type Factor = {
  key: string;
  label: string;
  weight: number;
  points: number;
  status: FactorStatus;
  evidence: string[];
};
export type SourceStatus = { name: string; ok: boolean; ms: number; error?: string };
export type ScoreResult = {
  mint: string;
  name: string;
  symbol: string;
  image?: string;
  description?: string;
  score: number;
  level: "safe" | "caution" | "suspicious" | "danger";
  factors: Factor[];
  reasons: string[];
  sources: SourceStatus[];
  metrics: {
    marketCapUsd?: number;
    liquidityUsd?: number;
    volume24h?: number;
    priceUsd?: number;
    change1h?: number;
    change24h?: number;
    holders?: number;
    top10Pct?: number;
    devPct?: number;
    ageHours?: number;
    graduated?: boolean;
    creator?: string;
    supply?: number;
  };
  links: { pump: string; dex?: string; rugcheck: string; twitter?: string; website?: string; telegram?: string };
  scoredAt: number;
};

export const levelOf = (s: number): ScoreResult["level"] =>
  s >= 80 ? "safe" : s >= 50 ? "caution" : s >= 25 ? "suspicious" : "danger";

const pct = (n: number | undefined, d = 2) => (n == null || !isFinite(n) ? "?" : `${n.toFixed(d)}%`);
const usd = (n?: number) =>
  n == null ? "?" : n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}K` : `$${n.toFixed(0)}`;

const resultCache = new Map<string, { at: number; r: ScoreResult }>();

export async function scoreMint(mint: string, { force = false } = {}): Promise<ScoreResult> {
  const hit = resultCache.get(mint);
  if (!force && hit && Date.now() - hit.at < 60_000) return hit.r;

  const [pumpR, dexR, rugR, mintR] = await Promise.all([pumpCoin(mint), dexToken(mint), rugReport(mint), mintInfo(mint)]);
  const sources: SourceStatus[] = [
    { name: "pump.fun", ok: pumpR.ok, ms: pumpR.ms, error: pumpR.ok ? undefined : pumpR.error },
    { name: "DexScreener", ok: dexR.ok, ms: dexR.ms, error: dexR.ok ? undefined : dexR.error },
    { name: "RugCheck", ok: rugR.ok, ms: rugR.ms, error: rugR.ok ? undefined : rugR.error },
    { name: "Solana RPC", ok: mintR.ok, ms: mintR.ms, error: mintR.ok ? undefined : mintR.error },
  ];
  const pump: PumpCoin | undefined = pumpR.ok && pumpR.data?.mint === mint ? pumpR.data : undefined;
  const rug: RugReport | undefined = rugR.ok ? rugR.data : undefined;
  const pairs: DexPair[] = dexR.ok ? (dexR.data.pairs ?? []).filter((p) => p.baseToken?.address === mint) : [];
  const chainMint = mintR.ok ? mintR.data : undefined;

  if (!pump && !rug && !pairs.length && !chainMint) {
    throw new Error("Token not found on any source (pump.fun, DexScreener, RugCheck, RPC). Check the mint address.");
  }

  const decimals = chainMint?.decimals ?? rug?.token?.decimals ?? 6;
  const supplyRaw = chainMint ? Number(chainMint.supply) : rug?.token?.supply;
  const supply = supplyRaw != null ? supplyRaw / 10 ** decimals : undefined;

  // ---- pools / AMM accounts to exclude from holder stats
  const poolOwners = new Set<string>();
  [pump?.bonding_curve, pump?.pump_swap_pool, pump?.pool_address, pump?.associated_bonding_curve].forEach((a) => a && poolOwners.add(a));
  rug?.markets?.forEach((m) => poolOwners.add(m.pubkey));
  pairs.forEach((p) => poolOwners.add(p.pairAddress));
  Object.entries(rug?.knownAccounts ?? {}).forEach(([addr, k]) => {
    if (/amm|pool|curve|lock|burn/i.test(`${k.type} ${k.name}`)) poolOwners.add(addr);
  });
  const holders = (rug?.topHolders ?? []).filter((h) => !poolOwners.has(h.owner) && !poolOwners.has(h.address));

  const factors: Factor[] = [];

  // 1. Holder bundle pattern (25)
  {
    const w = 25;
    const ev: string[] = [];
    let points = w;
    let status: FactorStatus = "good";
    if (!rug) {
      factors.push({ key: "bundle", label: "Holder bundle pattern", weight: w, points: w / 2, status: "unknown", evidence: ["RugCheck unavailable — holder list unknown"] });
    } else {
      const ps = holders.map((h) => h.pct).filter((p) => p > 0.005).sort((a, b) => a - b);
      let best: number[] = [];
      for (let i = 0; i < ps.length; i++) {
        const grp = ps.filter((p) => p >= ps[i] && p <= ps[i] * 1.06);
        if (grp.length > best.length) best = grp;
      }
      const correlation = (rug.risks ?? []).find((r) => /correlat|bundle|same.*fund|cluster/i.test(r.name + r.description));
      ev.push(`Analysed ${holders.length} top non-pool holders`);
      if (best.length >= 3) ev.push(`${best.length} wallets hold near-identical amounts (~${pct(best[0], 3)} – ${pct(best[best.length - 1], 3)})`);
      else ev.push("No cluster of near-identical balances found");
      if (best.length >= 8) points = 0;
      else if (best.length >= 6) points = 8;
      else if (best.length >= 4) points = 16;
      if (correlation) {
        points = Math.min(points, 6);
        ev.push(`RugCheck flag: "${correlation.name}" — ${correlation.description}`);
      }
      status = points >= 20 ? "good" : points >= 12 ? "warn" : "bad";
      factors.push({ key: "bundle", label: "Holder bundle pattern", weight: w, points, status, evidence: ev });
    }
  }

  // 2. Dev / creator behavior (20)
  let devPct: number | undefined;
  {
    const w = 20;
    const creator = pump?.creator ?? rug?.creator ?? undefined;
    const ev: string[] = [];
    if (!creator || !rug || rug.creatorBalance == null || !supplyRaw) {
      factors.push({ key: "dev", label: "Dev / creator behavior", weight: w, points: w / 2, status: "unknown", evidence: [creator ? `Creator ${short(creator)} — balance unknown` : "Creator unknown"] });
    } else {
      devPct = (rug.creatorBalance / supplyRaw) * 100;
      let points: number;
      ev.push(`Creator ${short(creator)} holds ${pct(devPct, 3)} of supply`);
      if (rug.creatorBalance === 0) {
        points = 6;
        ev.push("Dev balance is 0 — creator has sold / exited");
      } else if (devPct > 10) {
        points = 4;
        ev.push("Dev holds >10% — large dump risk");
      } else if (devPct > 5) points = 12;
      else points = 20;
      const others = Array.isArray(rug.creatorTokens) ? rug.creatorTokens.length : 0;
      if (others >= 5) {
        points = Math.max(0, points - 6);
        ev.push(`Creator launched ${others} other tokens (serial launcher)`);
      } else if (others > 0) ev.push(`Creator launched ${others} other token(s)`);
      factors.push({ key: "dev", label: "Dev / creator behavior", weight: w, points, status: points >= 15 ? "good" : points >= 8 ? "warn" : "bad", evidence: ev });
    }
  }

  // 3. Top-10 concentration excl. pools (15)
  let top10: number | undefined;
  {
    const w = 15;
    if (!rug) {
      factors.push({ key: "top10", label: "Top-10 concentration (excl. pools)", weight: w, points: w / 2, status: "unknown", evidence: ["RugCheck unavailable"] });
    } else {
      top10 = holders.slice(0, 10).reduce((a, h) => a + h.pct, 0);
      const points = top10 > 30 ? 0 : top10 > 20 ? 6 : top10 > 12 ? 11 : 15;
      const ev = [`Top 10 wallets (pools excluded) hold ${pct(top10)}`];
      if (holders[0]) ev.push(`Largest: ${short(holders[0].owner)} ${pct(holders[0].pct)}`);
      if (rug.totalHolders) ev.push(`${rug.totalHolders.toLocaleString()} holders total`);
      factors.push({ key: "top10", label: "Top-10 concentration (excl. pools)", weight: w, points, status: points >= 11 ? "good" : points >= 6 ? "warn" : "bad", evidence: ev });
    }
  }

  // 4. Liquidity / mcap (15)
  const best = [...pairs].sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
  const dexLiq = pairs.reduce((a, p) => a + (p.liquidity?.usd ?? 0), 0);
  const liquidity = dexLiq || rug?.totalMarketLiquidity || pump?.canonical_pool_liquidity_usd || undefined;
  const mcap = (pump && coinMcapUsd(pump)) ?? best?.marketCap ?? best?.fdv;
  {
    const w = 15;
    if (pump && pump.complete === false && pump.bonding_curve) {
      factors.push({ key: "liq", label: "Liquidity / market cap", weight: w, points: 8, status: "warn", evidence: ["Still on pump.fun bonding curve — liquidity is the curve itself", `Market cap ${usd(mcap)}`] });
    } else if (!liquidity && !pairs.length && !pump) {
      factors.push({ key: "liq", label: "Liquidity / market cap", weight: w, points: 0, status: "bad", evidence: ["No liquidity pool found on any DEX", "Token cannot be sold"] });
    } else if (!liquidity || !mcap) {
      factors.push({ key: "liq", label: "Liquidity / market cap", weight: w, points: w / 2, status: "unknown", evidence: ["Liquidity or market cap unavailable"] });
    } else {
      const ratio = (liquidity / mcap) * 100;
      const points = ratio < 2 ? 0 : ratio < 5 ? 7 : ratio < 10 ? 12 : 15;
      factors.push({
        key: "liq",
        label: "Liquidity / market cap",
        weight: w,
        points,
        status: points >= 12 ? "good" : points >= 7 ? "warn" : "bad",
        evidence: [`Liquidity ${usd(liquidity)} vs market cap ${usd(mcap)} = ${pct(ratio)}`, `${pairs.length} DEX pair(s)${best ? `, main: ${best.dexId}` : ""}`, ...(ratio < 2 ? ["<2%: price is easy to move / hard to exit"] : [])],
      });
    }
  }

  // 5. Mint + freeze authority (10)
  {
    const w = 10;
    const ma = chainMint ? chainMint.mintAuthority : rug?.token?.mintAuthority;
    const fa = chainMint ? chainMint.freezeAuthority : rug?.token?.freezeAuthority;
    if (!chainMint && !rug?.token) {
      factors.push({ key: "auth", label: "Mint & freeze authority", weight: w, points: 5, status: "unknown", evidence: ["RPC + RugCheck unavailable"] });
    } else {
      const points = (ma ? 0 : 5) + (fa ? 0 : 5);
      factors.push({
        key: "auth",
        label: "Mint & freeze authority",
        weight: w,
        points,
        status: points === 10 ? "good" : points === 5 ? "warn" : "bad",
        evidence: [ma ? `Mint authority ACTIVE: ${short(ma)} (can print tokens)` : "Mint authority revoked", fa ? `Freeze authority ACTIVE: ${short(fa)} (can freeze wallets)` : "Freeze authority revoked", `Source: ${chainMint ? "Solana RPC" : "RugCheck"}`],
      });
    }
  }

  // 6. Insider networks (10)
  {
    const w = 10;
    if (!rug) {
      factors.push({ key: "insider", label: "Insider networks", weight: w, points: 5, status: "unknown", evidence: ["RugCheck unavailable"] });
    } else {
      const n = rug.graphInsidersDetected ?? 0;
      const nets = rug.insiderNetworks ?? [];
      const flagged = (rug.topHolders ?? []).filter((h) => h.insider).length;
      const points = n === 0 && flagged === 0 ? 10 : n <= 5 ? 6 : n <= 15 ? 3 : 0;
      const ev = [`${n} insider wallet(s) detected by RugCheck graph`];
      if (nets.length) ev.push(`${nets.length} network(s): ${nets.slice(0, 3).map((x) => `${x.id} (${x.size} wallets, ${x.type})`).join(", ")}`);
      if (flagged) ev.push(`${flagged} top holder(s) marked insider`);
      factors.push({ key: "insider", label: "Insider networks", weight: w, points, status: points >= 8 ? "good" : points >= 3 ? "warn" : "bad", evidence: ev });
    }
  }

  // 7. Age + socials (5)
  const created = pump?.created_timestamp ?? best?.pairCreatedAt;
  const ageHours = created ? (Date.now() - created) / 3.6e6 : undefined;
  const twitter = pump?.twitter || best?.info?.socials?.find((s) => s.type === "twitter")?.url || undefined;
  const telegram = pump?.telegram || best?.info?.socials?.find((s) => s.type === "telegram")?.url || undefined;
  const website = pump?.website || best?.info?.websites?.[0]?.url || undefined;
  {
    const w = 5;
    let points = 0;
    const ev: string[] = [];
    if (ageHours != null) {
      points += ageHours > 24 * 7 ? 2 : ageHours > 24 ? 1 : 0;
      ev.push(`Age: ${ageHours < 48 ? `${ageHours.toFixed(1)} hours` : `${(ageHours / 24).toFixed(1)} days`}`);
    } else ev.push("Age unknown");
    const socials = [twitter, telegram, website].filter(Boolean).length;
    points += Math.min(3, socials);
    ev.push(`Socials: ${[twitter && "X", telegram && "Telegram", website && "website"].filter(Boolean).join(", ") || "none"}`);
    if (twitter && /\/status\//.test(twitter)) {
      points = Math.max(0, points - 1);
      ev.push("X link is a single tweet, not a project account");
    }
    factors.push({ key: "age", label: "Age & socials", weight: w, points, status: points >= 4 ? "good" : points >= 2 ? "warn" : "bad", evidence: ev });
  }

  let score = Math.round(factors.reduce((a, f) => a + f.points, 0));
  const reasons = factors.filter((f) => f.status === "bad").map((f) => `${f.label}: ${f.evidence[(f.key === "dev" || f.key === "bundle" || f.key === "age") && f.evidence.length > 1 ? 1 : 0]}`);
  // critical overrides: an active mint authority can print unlimited supply, freeze can trap holders
  const ma = chainMint ? chainMint.mintAuthority : rug?.token?.mintAuthority;
  const fa = chainMint ? chainMint.freezeAuthority : rug?.token?.freezeAuthority;
  if (ma) score = Math.min(score, 30);
  if (fa) score = Math.min(score, 40);
  const dangers = (rug?.risks ?? []).filter((r) => r.level === "danger").length;
  if (dangers) score = Math.max(0, score - Math.min(15, dangers * 5));
  if (rug?.rugged) {
    score = Math.min(score, 10);
    reasons.unshift("RugCheck marks this token as RUGGED");
  }
  (rug?.risks ?? []).filter((r) => r.level === "danger").forEach((r) => reasons.push(`RugCheck danger: ${r.name}`));

  const result: ScoreResult = {
    mint,
    name: pump?.name ?? rug?.tokenMeta?.name ?? best?.baseToken.symbol ?? "Unknown",
    symbol: pump?.symbol ?? rug?.tokenMeta?.symbol ?? best?.baseToken.symbol ?? "?",
    image: pump?.image_uri,
    description: pump?.description,
    score,
    level: levelOf(score),
    factors,
    reasons: reasons.length ? reasons : factors.filter((f) => f.status === "warn").map((f) => `${f.label}: ${f.evidence[0]}`),
    sources,
    metrics: {
      marketCapUsd: mcap,
      liquidityUsd: liquidity,
      volume24h: pairs.reduce((a, p) => a + (p.volume?.h24 ?? 0), 0) || undefined,
      priceUsd: best?.priceUsd ? Number(best.priceUsd) : undefined,
      change1h: best?.priceChange?.h1,
      change24h: best?.priceChange?.h24,
      holders: rug?.totalHolders,
      top10Pct: top10,
      devPct,
      ageHours,
      graduated: pump?.complete,
      creator: pump?.creator ?? rug?.creator ?? undefined,
      supply,
    },
    links: {
      pump: `https://pump.fun/coin/${mint}`,
      dex: best?.url,
      rugcheck: `https://rugcheck.xyz/tokens/${mint}`,
      twitter,
      website,
      telegram,
    },
    scoredAt: Date.now(),
  };
  resultCache.set(mint, { at: Date.now(), r: result });
  if (score < 25) await recordShame(result).catch(() => {});
  return result;
}

function short(a: string) {
  return a.length > 10 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a;
}
