# PokeSnap ⚡ — Product Document

> **"Smells off? Gets zapped."**

## 1. Product Overview
PokeSnap is a Solana dApp that gives any pump.fun or Solana token a **risk score from 0 to 100** (higher is safer). Data is pulled live from pump.fun, DexScreener, RugCheck, and Solana RPC, and every point in the score is backed by evidence. Coins that score badly get "attacked" by the PokeSnap mascot, **purely visually**. The utility ties into the **$PokeSnap** token: how many tokens you hold determines which feature tier you can access.

## 2. Problem & Target Users
- **Problem:** thousands of new coins launch on pump.fun every day. Most are bundled, sniped, or abandoned by their dev (rugged) within minutes. Risk data is scattered across many tools (RugCheck, DexScreener, GMGN) and is hard to read quickly.
- **Target users:** pump.fun traders and degens who need a fast read before buying, meta hunters, and communities that want to keep an eye on devs.
- **Solution:** one score, a clear reason for each factor, and a visual reaction you can read at a glance.

## 3. Mascot & Visual Reactions
The mascot is an original electric fox-squirrel creature in pump.fun-style green and yellow (`src/components/HeroMascot.tsx`). It breathes and floats, turns to follow the cursor, switches to an attack pose while scanning, and then jumps according to the result.

Coin card reactions (`src/components/Reaction.tsx`, `Shatter.tsx`) follow the verdict from `score.ts`:

| Score | Verdict | Reaction |
|---|---|---|
| 80–100 | safe | Mascot stays calm, card glows |
| 50–79 | caution | Card shakes with electric sparks |
| 25–49 | suspicious | Lightning strikes and cracks spread. The card **snaps in two** with scorched edges, then gets stamped **ZAPPED** |
| 0–24 | danger | Mascot attacks and the card **shatters into shards**. Sparks and embers burst out, then the **ZAPPED** stamp slams down |

All of these effects are **purely visual on the website**. No on-chain transactions happen and no tokens are touched in any way.

## 4. Features by Page
| Page | Features | Access |
|---|---|---|
| `/` **Snap Scanner** | Paste a mint to get a coin card, score, factor breakdown with evidence, data source status, and a visual reaction | Free |
| `/arena` **Live Arena** | Movers, recent, and graduated boards, scored automatically every 60 seconds | Scout+ |
| `/meta` **Meta Radar** | Theme clustering using keyword rules (AI, RWA/oil, dev-fee, Pokémon-style, animals, …), with coin count, total mcap, and average score from a sample | Scout+ |
| `/shame` **Hall of Shame** | Every coin scoring <25, stored in `data/hall-of-shame.json` | Free |
| `/ask` **Ask PokeSnap** | LLM mode when `OPENAI_API_KEY` is set (tool calls into the score engine). Otherwise, basic commands: `score <mint>`, `top movers`, `safest graduated`, `riskiest movers`, `search <name>` | Free |
| `/watch` **Dev Watch** | A localStorage watchlist that is re-scored on every visit and flags when a dev's balance drops | Hunter+ |
| `/self` **Self Score** | PokeSnap scores the $PokeSnap token itself | Shown when `NEXT_PUBLIC_POKESNAP_MINT` is set |
| `/burn` **Burn Tracker** | Initial supply, current supply (from RPC), amount burned, and burn percentage | Shown when `NEXT_PUBLIC_POKESNAP_MINT` is set |
| **Wallet** | Phantom and Solflare via the Solana wallet adapter. $PokeSnap balance is read from `/api/balance` | — |

## 5. Score Engine (`src/lib/score.ts`, `src/lib/launch.ts`)
**Formula:** score = (total factor points / total factor weight) × 100, then hard caps are applied.

| Factor | Weight | Source |
|---|---|---|
| Holder bundle pattern (top wallet balances nearly identical within ±6%, RugCheck correlation flag) | 25 | RugCheck |
| Dev/creator behavior (dev balance 0 or >10%, serial launcher) | 20 | RugCheck + pump.fun |
| Top-10 concentration, excluding pools (>30% scores 0) | 15 | RugCheck |
| Liquidity / market cap (<2% scores 0) | 15 | DexScreener / pump.fun |
| Mint & freeze authority (5 each if revoked) | 10 | Solana RPC |
| Insider network | 10 | RugCheck insider graph |
| Age & socials (X/TG/web) | 5 | pump.fun / DexScreener |
| Snipers & bundles at launch | 20 | pump.fun trade feed |
| Dev exit (from trade history) | 10 | pump.fun trades + RugCheck creator balance |
| Age, pump velocity & wash trading | 10 | DexScreener + pump.fun trades |

If a data source fails, its factor is marked "no data" and awarded half points. A "danger"-level risk from RugCheck deducts up to 15 points.

**Launch forensics:** data comes from `swap-api.pump.fun/v2/coins/{mint}/trades`. The cursor jumps straight to the launch window, so detection works for coins of any age.
- *Bundled at launch*: % of supply bought in the creation slot.
- *Snipers*: % of supply bought in the first 10 slots (~4 seconds), including the dev (GMGN-style).
- *Dev exit*: the dev sells in the trade feed, or the creator balance on RugCheck is 0.
- *Wash/dust*: share of trades under $1 among the last 500 trades.

**Hard caps:**
- Snipers >50% or creation-slot bundle >40% → score ≤20. Applies while the coin is <24 hours old or early wallets still hold >20%.
- RugCheck insider network holds >40% → ≤20.
- ≥3 severe flags at once (snipers >30%, dev dump within 1 hour, new coin with a vertical move, flood of dust trades, bad holder bundling, >15 insiders) → ≤15.
- Mint authority active → ≤30. Freeze authority active → ≤40. "Rugged" status from RugCheck → ≤10.

**Caching (in-memory):** pump.fun 30 seconds, RugCheck 90 seconds, RPC 30 seconds, launch trades 20 seconds. Rate-limited requests (429) are retried with backoff.

## 6. Token Utility & Tiers
Tiers are determined by the $PokeSnap balance of the connected wallet (`src/lib/tiers.ts`):

| Tier | Minimum balance | Access |
|---|---|---|
| Free | 0 | Snap Scanner, Hall of Shame, Ask PokeSnap |
| Scout | 100,000 | + Live Arena, Meta Radar |
| Hunter | 500,000 | + Watchlist / Dev Watch |
| Alpha | 2,000,000 | All features + priority features |

Gating is enforced by the `Gate` component. When `NEXT_PUBLIC_UNLOCK_ALL=true` (the default before launch), every feature is unlocked regardless of balance.

## 7. Tokenomics (planned)
- Total supply: **1,000,000,000 $PokeSnap**, fair launch on pump.fun.
- Planned revenue split: **40% buyback & burn**, **40% operations**, **20% community rewards**.
- Burns can be verified on-chain through the Burn Tracker page.

*Note: the revenue split is a planned policy and is not yet automated in code.*

## 8. Architecture & Tech Stack
- **Next.js (App Router) + TypeScript**, Tailwind CSS, and Framer Motion for animation.
- **Solana wallet adapter** for Phantom and Solflare.
- **Server-side API routes** act as a proxy and aggregator for data sources (`src/lib/sources.ts`, `fetcher.ts` with TTL caching and timeouts).
- **Storage:** a local JSON file for the Hall of Shame (`src/lib/store.ts`) and localStorage for the watchlist.

## 9. API Endpoints
| Endpoint | Purpose |
|---|---|
| `GET /api/score?mint=` | Full score with factors and evidence |
| `GET /api/arena?board=movers\|recent\|graduated` | Scored coin boards |
| `GET /api/meta` | Themes and metas |
| `GET /api/shame` | Hall of Shame list |
| `POST /api/chat` | Ask PokeSnap |
| `GET /api/burn?mint=` | Burn statistics |
| `GET /api/balance?owner=` | $PokeSnap balance and tier |
| `GET /api/health` | Data source status |

## 10. Environment Variables
| Variable | Default | Purpose |
|---|---|---|
| `SOLANA_RPC_URL` | Public mainnet | Server-side RPC |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | Public mainnet | RPC for the wallet adapter |
| `NEXT_PUBLIC_POKESNAP_MINT` | Empty | $PokeSnap mint. Enables tiers, Self Score, and Burn Tracker |
| `NEXT_PUBLIC_UNLOCK_ALL` | `true` | Unlocks every feature (bypasses gating) |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | Empty / `gpt-4o-mini` | LLM mode for Ask PokeSnap |

## 11. Getting Started
```bash
npm install
cp .env.example .env.local
npm run dev            # http://localhost:3000
npm run build && npm start   # production
```
Requires Node 18.18+ (tested on Node 20).

## 12. Known Limitations
- Funding-source clustering (wallets funded by the same parent), fresh-wallet %, and GMGN-style "phishing" and "Rug %" metrics are not implemented yet, because they need per-wallet history that is too heavy for public RPC.
- Insider figures depend on RugCheck's graph, which can report 0 even when GMGN shows a high number.
- The pump.fun frontend API is unofficial and may change. `trades/all` no longer works (HTTP 400).
- The swap-api can be rate-limited (429). If it still fails after retries, the factor is shown as "unknown".
- The Hall of Shame uses a local JSON file, so it is not suitable for serverless hosting.
- The mascot is a single flat image, so parts like the tail can't be animated separately yet.
- Wallet connection has not been tested end-to-end in production.

## 13. Roadmap (planned)
1. Paid RPC (Helius/QuickNode) for insider, funding-source, and fresh-wallet detection.
2. A persistent database (Postgres/KV) for the Hall of Shame, score history, and cross-device watchlists.
3. Ask PokeSnap LLM mode on by default, with more natural risk summaries.
4. Dev Watch notifications (Telegram/X bot) when a dev sells.
5. A rigged mascot (separate tail and expressions) for livelier animation.
6. Automated buyback & burn and holder rewards.
7. Production deployment and the $PokeSnap token launch, then setting `NEXT_PUBLIC_POKESNAP_MINT`.

## 14. Disclaimer
PokeSnap is an analysis aid and **not financial advice**. Scores can be wrong or delayed, so always do your own research (DYOR). Visual reactions do not affect any token. PokeSnap is a **fan-made** project with an original mascot and is not affiliated with Nintendo, Game Freak, or The Pokémon Company. Pokémon is a trademark of its respective owners.
