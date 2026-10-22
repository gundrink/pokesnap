# PokeSnap score engine

Score = (sum of factor points / sum of factor weights) × 100, then hard caps.

| Factor | Weight | Source |
|---|---|---|
| Holder bundle pattern (near-identical balances, RugCheck correlation flag) | 25 | RugCheck |
| Dev / creator balance & serial launches | 20 | RugCheck + pump.fun |
| Top-10 concentration (pools excluded) | 15 | RugCheck |
| Liquidity / market cap | 15 | DexScreener / pump.fun |
| Mint & freeze authority | 10 | Solana RPC |
| Insider networks | 10 | RugCheck insider graph |
| Age & socials | 5 | pump.fun / DexScreener |
| **Snipers & launch bundle** | 20 | pump.fun trades feed |
| **Dev exit (trade history)** | 10 | pump.fun trades + RugCheck creator balance |
| **Age, pump velocity & wash trades** | 10 | DexScreener + pump.fun trades |

## Launch forensics (`src/lib/launch.ts`)
`GET https://swap-api.pump.fun/v2/coins/{mint}/trades?limit=100&cursor=…` (newest first).
The cursor is `<slotIndexId>-<timestampMs>`; `9999999999999999999999-<created+15s>` seeks straight to the
launch window, so sniper / bundle stats work for coins of any age.
- **Bundled at launch** = % of supply bought in the creation slot.
- **Snipers** = % of supply bought in the first 10 slots (~4 s), dev included (GMGN-style).
- **Dev exit** = dev sells in the trade feed, or dev's launch bag gone (RugCheck creator balance = 0).
- **Wash / dust** = share of the last 500 trades under $1.

## Hard caps
- snipers > 50% or creation-slot bundle > 40% → score ≤ 20 (only while coin < 24h old or early wallets still hold > 20%)
- RugCheck insider networks hold > 40% → ≤ 20
- ≥ 3 severe flags (snipers > 30%, dev dumped within 1h, brand-new coin with ±vertical move, dust-trade flood, bad holder bundle, > 15 insiders) → ≤ 15
- active mint authority ≤ 30, freeze authority ≤ 40, RugCheck "rugged" ≤ 10 (unchanged)

## Data sources that don't work / not implemented
- `frontend-api-v3.pump.fun/trades/all/{mint}` — now returns HTTP 400 (expects a chainId), unusable.
- swap-api trades rate-limits (HTTP 429) under bursts; we retry with backoff and show "unknown" if it still fails.
- Funding-source clustering (wallets funded by the same parent), fresh-wallet %, and GMGN's "phishing" / "Rug %" metrics
  need per-wallet history (getSignaturesForAddress for every holder) — too heavy for the public RPC; not implemented.
  Insider % relies on RugCheck's insider graph, which reported 0 insiders for the SpaceX test mint even though GMGN shows 76%.
