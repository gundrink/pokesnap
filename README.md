# PokeSnap ⚡ — pump.fun rug sniffer dApp

**ID:** PokeSnap memberi skor risiko 0-100 untuk token Solana / pump.fun dari data live (pump.fun, DexScreener, RugCheck, Solana RPC). Koin jelek "diserang" maskot secara visual: disetrum, dicakar, dirobek, meledak jadi abu dengan cap **ZAPPED**. Efeknya murni visual — token tidak disentuh.

**EN:** PokeSnap scores any Solana mint 0-100 (higher = safer) with evidence for every point, and reacts visually. Not financial advice.

## Quick start
```bash
npm install
cp .env.example .env.local   # edit if needed
npm run dev                  # http://localhost:3000
# production
npm run build && npm start
```
Node 18.18+ (tested on Node 20).

## Env vars
| Var | Default | Purpose |
|---|---|---|
| `SOLANA_RPC_URL` | public mainnet | Server-side RPC (authorities, supply, balances). Use Helius/QuickNode in prod. |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | public mainnet | Wallet adapter connection |
| `NEXT_PUBLIC_POKESNAP_MINT` | empty | $PokeSnap mint. Enables tiers, Self Score, Burn Tracker |
| `NEXT_PUBLIC_UNLOCK_ALL` | `true` | Bypass tier gating (pre-launch) |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | empty / gpt-4o-mini | Enables LLM mode for Ask PokeSnap (tool calls into score engine) |

## Features / Fitur
| Page | What |
|---|---|
| `/` Snap Scanner | Paste mint → coin card, score, factor breakdown + evidence, source status. Reactions: 80-100 safe (calm mascot, glow) · 50-79 caution (shake, sparks) · 25-49 suspicious (lightning, scorched, claw marks) · 0-24 danger (attack video → card tears into fragments with reasons → ash + ZAPPED) |
| `/arena` Live Arena (Scout+) | movers / recent / graduated boards auto-scored every 60s |
| `/meta` Meta Radar (Scout+) | themes via keyword rules (AI, RWA/oil, dev-fee, Pokémon-style, animals, …) with counts, total mcap, sampled avg score |
| `/shame` Hall of Shame | every coin scored <25, persisted in `data/hall-of-shame.json` |
| `/ask` Ask PokeSnap | LLM (if key) or rule commands: `score <mint>`, `top movers`, `safest graduated`, `riskiest movers`, `search <name>` |
| `/watch` Dev Watch (Hunter+) | localStorage watchlist, re-scored on view, flags dev balance drops |
| `/self` Self Score, `/burn` Burn Tracker | shown only when `NEXT_PUBLIC_POKESNAP_MINT` is set |

Wallets: Phantom, Solflare. Tiers by $PokeSnap balance: Free 0 · Scout 100k · Hunter 500k · Alpha 2M.

## Score engine (`src/lib/score.ts`)
| Factor | Weight | Rule |
|---|---|---|
| Holder bundle pattern | 25 | cluster of top non-pool wallets with near-identical % (±6%) + RugCheck correlation flag |
| Dev / creator behavior | 20 | dev balance 0 (exited) or >10% is bad; serial launcher penalty |
| Top-10 concentration (excl. pools) | 15 | >30% = 0 |
| Liquidity / mcap | 15 | <2% = 0 |
| Mint + freeze authority | 10 | 5 each if revoked (RPC) — active mint caps score at 30, freeze at 40 |
| Insider networks | 10 | RugCheck graph insiders |
| Age + socials | 5 | age, X/TG/web |
Missing source → factor marked "no data" with half points. RugCheck "danger" risks subtract up to 15. 45-90s in-memory cache.

## API
`GET /api/score?mint=` · `GET /api/arena?board=movers|recent|graduated` · `GET /api/meta` · `GET /api/shame` · `POST /api/chat` · `GET /api/burn?mint=` · `GET /api/balance?owner=` · `GET /api/health`

Data sources: `frontend-api-v3.pump.fun` (`/coins-v2/{mint}`, `/coins/boards/movers`, `/coins/boards/graduated`, `/coins?sort=last_trade_timestamp`, `/coins/search-v2`), `api.dexscreener.com/latest/dex/tokens/{mint}`, `api.rugcheck.xyz/v1/tokens/{mint}/report`, Solana JSON-RPC.

## Notes
- Hall of Shame uses a local JSON file — on serverless (Vercel) swap for a DB/KV.
- pump.fun's frontend API is unofficial and may change.
- Mascot is a fan-style original critter; Pokémon is a trademark of Nintendo/Game Freak.
