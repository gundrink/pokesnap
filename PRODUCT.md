# PokeSnap ⚡ — Dokumen Produk

> **"Smells off? Gets zapped."**

## 1. Ringkasan Produk
PokeSnap adalah dApp di Solana yang memberi **skor risiko 0–100** (semakin tinggi semakin aman) untuk token pump.fun atau token Solana mana pun. Datanya diambil live dari pump.fun, DexScreener, RugCheck, dan Solana RPC, dan setiap poin skor disertai bukti. Koin yang skornya jelek "diserang" oleh maskot PokeSnap **secara visual**. Utilitasnya terhubung ke token **$PokeSnap**: jumlah token yang dipegang menentukan tier akses fitur.

## 2. Masalah & Target User
- **Masalah:** di pump.fun ribuan koin baru muncul setiap hari. Sebagian besar dibundel, di-snipe, atau ditinggal dev (rug) dalam hitungan menit. Data risikonya tersebar di banyak tool (RugCheck, DexScreener, GMGN) dan sulit dibaca cepat.
- **Target user:** trader dan degen pump.fun yang butuh penilaian cepat sebelum beli, pemburu meta, dan komunitas yang ingin memantau dev.
- **Solusi:** satu skor, alasan yang jelas per faktor, dan reaksi visual yang langsung terbaca.

## 3. Maskot & Reaksi Visual
Maskotnya adalah makhluk rubah-tupai listrik orisinal berwarna hijau-kuning ala pump.fun (`src/components/HeroMascot.tsx`). Ia bernapas dan melayang, menoleh mengikuti kursor, memakai pose menyerang saat scan, lalu melompat sesuai hasilnya.

Reaksi kartu koin (`src/components/Reaction.tsx`, `Shatter.tsx`) mengikuti verdict dari `score.ts`:

| Skor | Verdict | Reaksi |
|---|---|---|
| 80–100 | safe | Maskot tenang, kartu bersinar |
| 50–79 | caution | Kartu bergetar dengan percikan listrik |
| 25–49 | suspicious | Petir menyambar dan retakan menjalar. Kartu **patah terbelah dua** dengan pinggiran gosong, lalu dicap **ZAPPED** |
| 0–24 | danger | Maskot menyerang dan kartu **hancur jadi serpihan**. Percikan dan bara menyembur, lalu cap **ZAPPED** menghantam |

Semua efek ini **murni visual di website**. Tidak ada transaksi on-chain dan token tidak disentuh sama sekali.

## 4. Fitur per Halaman
| Halaman | Fitur | Akses |
|---|---|---|
| `/` **Snap Scanner** | Tempel mint, lalu keluar kartu koin, skor, rincian faktor beserta bukti, status sumber data, dan reaksi visual | Free |
| `/arena` **Live Arena** | Papan movers, recent, dan graduated yang di-skor otomatis setiap 60 detik | Scout+ |
| `/meta` **Meta Radar** | Pengelompokan tema dengan aturan kata kunci (AI, RWA/oil, dev-fee, Pokémon-style, hewan, …), lengkap dengan jumlah koin, total mcap, dan rata-rata skor dari sampel | Scout+ |
| `/shame` **Hall of Shame** | Semua koin dengan skor <25, disimpan di `data/hall-of-shame.json` | Free |
| `/ask` **Ask PokeSnap** | Mode LLM kalau `OPENAI_API_KEY` diisi (tool call ke score engine). Kalau tidak, pakai perintah dasar: `score <mint>`, `top movers`, `safest graduated`, `riskiest movers`, `search <nama>` | Free |
| `/watch` **Dev Watch** | Watchlist di localStorage yang di-skor ulang setiap dibuka dan menandai kalau saldo dev turun | Hunter+ |
| `/self` **Self Score** | PokeSnap men-skor token $PokeSnap sendiri | Muncul jika `NEXT_PUBLIC_POKESNAP_MINT` diisi |
| `/burn` **Burn Tracker** | Supply awal, supply saat ini (dari RPC), jumlah yang dibakar, dan persentasenya | Muncul jika `NEXT_PUBLIC_POKESNAP_MINT` diisi |
| **Wallet** | Koneksi Phantom dan Solflare lewat Solana wallet adapter. Saldo $PokeSnap dibaca dari `/api/balance` | — |

## 5. Score Engine (`src/lib/score.ts`, `src/lib/launch.ts`)
**Rumus:** skor = (total poin faktor / total bobot faktor) × 100, lalu diterapkan hard cap.

| Faktor | Bobot | Sumber |
|---|---|---|
| Pola bundel holder (saldo top wallet hampir identik ±6%, flag korelasi RugCheck) | 25 | RugCheck |
| Perilaku dev/creator (saldo dev 0 atau >10%, serial launcher) | 20 | RugCheck + pump.fun |
| Konsentrasi top-10, di luar pool (>30% dapat 0) | 15 | RugCheck |
| Likuiditas / market cap (<2% dapat 0) | 15 | DexScreener / pump.fun |
| Mint & freeze authority (masing-masing 5 jika sudah di-revoke) | 10 | Solana RPC |
| Jaringan insider | 10 | Graf insider RugCheck |
| Umur & sosial (X/TG/web) | 5 | pump.fun / DexScreener |
| Sniper & bundel saat launch | 20 | Feed trade pump.fun |
| Dev exit (dari riwayat trade) | 10 | Trade pump.fun + saldo creator RugCheck |
| Umur, kecepatan pump & wash trade | 10 | DexScreener + trade pump.fun |

Kalau sebuah sumber data gagal, faktornya ditandai "no data" dan diberi setengah poin. Risiko berlevel "danger" dari RugCheck mengurangi skor hingga 15 poin.

**Forensik launch:** data diambil dari `swap-api.pump.fun/v2/coins/{mint}/trades`. Cursor-nya langsung melompat ke jendela launch, jadi deteksi tetap jalan untuk koin berumur berapa pun.
- *Bundled at launch*: % supply yang dibeli di slot pembuatan.
- *Snipers*: % supply yang dibeli di 10 slot pertama (~4 detik), termasuk dev (gaya GMGN).
- *Dev exit*: dev menjual di feed trade, atau saldo creator di RugCheck = 0.
- *Wash/dust*: porsi trade di bawah $1 dari 500 trade terakhir.

**Hard cap:**
- Sniper >50% atau bundel slot pembuatan >40% → skor ≤20. Berlaku selama koin berumur <24 jam atau wallet awal masih memegang >20%.
- Jaringan insider RugCheck memegang >40% → ≤20.
- ≥3 tanda berat sekaligus (sniper >30%, dev dump dalam 1 jam, koin baru dengan gerakan vertikal, banjir dust trade, bundel holder buruk, >15 insider) → ≤15.
- Mint authority aktif → ≤30. Freeze authority aktif → ≤40. Status "rugged" dari RugCheck → ≤10.

**Caching (in-memory):** pump.fun 30 detik, RugCheck 90 detik, RPC 30 detik, trade launch 20 detik. Request yang kena rate limit (429) dicoba ulang dengan backoff.

## 6. Utilitas Token & Tier
Tier ditentukan oleh saldo $PokeSnap di wallet yang terhubung (`src/lib/tiers.ts`):

| Tier | Saldo minimum | Akses |
|---|---|---|
| Free | 0 | Snap Scanner, Hall of Shame, Ask PokeSnap |
| Scout | 100.000 | + Live Arena, Meta Radar |
| Hunter | 500.000 | + Watchlist / Dev Watch |
| Alpha | 2.000.000 | Semua fitur + fitur prioritas |

Gating diterapkan lewat komponen `Gate`. Jika `NEXT_PUBLIC_UNLOCK_ALL=true` (default sebelum launch), semua fitur terbuka tanpa melihat saldo.

## 7. Tokenomics (rencana)
- Total supply: **1.000.000.000 $PokeSnap**, fair launch di pump.fun.
- Rencana pembagian pendapatan: **40% buyback & burn**, **40% operasional**, **20% reward komunitas**.
- Burn dapat diverifikasi on-chain lewat halaman Burn Tracker.

*Catatan: pembagian pendapatan adalah kebijakan rencana dan belum diotomatisasi di kode.*

## 8. Arsitektur & Tech Stack
- **Next.js (App Router) + TypeScript**, Tailwind CSS, Framer Motion untuk animasi.
- **Solana wallet adapter** untuk Phantom dan Solflare.
- **API routes server-side** menjadi proxy dan agregator sumber data (`src/lib/sources.ts`, `fetcher.ts` dengan TTL cache dan timeout).
- **Penyimpanan:** file JSON lokal untuk Hall of Shame (`src/lib/store.ts`) dan localStorage untuk watchlist.

## 9. API Endpoints
| Endpoint | Fungsi |
|---|---|
| `GET /api/score?mint=` | Skor lengkap beserta faktor dan bukti |
| `GET /api/arena?board=movers\|recent\|graduated` | Papan koin yang sudah di-skor |
| `GET /api/meta` | Tema dan meta |
| `GET /api/shame` | Daftar Hall of Shame |
| `POST /api/chat` | Ask PokeSnap |
| `GET /api/burn?mint=` | Statistik burn |
| `GET /api/balance?owner=` | Saldo $PokeSnap dan tier |
| `GET /api/health` | Status sumber data |

## 10. Environment Variables
| Variabel | Default | Fungsi |
|---|---|---|
| `SOLANA_RPC_URL` | Mainnet publik | RPC di sisi server |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | Mainnet publik | RPC untuk wallet adapter |
| `NEXT_PUBLIC_POKESNAP_MINT` | Kosong | Mint $PokeSnap. Mengaktifkan tier, Self Score, dan Burn Tracker |
| `NEXT_PUBLIC_UNLOCK_ALL` | `true` | Membuka semua fitur (bypass gating) |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | Kosong / `gpt-4o-mini` | Mode LLM untuk Ask PokeSnap |

## 11. Cara Menjalankan
```bash
npm install
cp .env.example .env.local
npm run dev            # http://localhost:3000
npm run build && npm start   # production
```
Butuh Node 18.18+ (sudah dites di Node 20).

## 12. Keterbatasan yang Diketahui
- Clustering sumber dana (wallet yang didanai dari induk yang sama), % fresh wallet, serta metrik "phishing" dan "Rug %" ala GMGN belum diimplementasikan, karena butuh riwayat per wallet yang terlalu berat untuk RPC publik.
- Angka insider bergantung pada graf RugCheck, yang bisa melaporkan 0 padahal GMGN menunjukkan angka tinggi.
- API frontend pump.fun tidak resmi dan bisa berubah. `trades/all` sudah tidak bisa dipakai (HTTP 400).
- Swap-api bisa kena rate limit (429). Kalau masih gagal setelah dicoba ulang, faktornya ditampilkan "unknown".
- Hall of Shame memakai file JSON lokal, jadi tidak cocok untuk serverless.
- Maskotnya satu gambar utuh, jadi bagian seperti ekor belum bisa dianimasikan terpisah.
- Koneksi wallet belum diuji end-to-end di produksi.

## 13. Roadmap
1. RPC berbayar (Helius/QuickNode) untuk deteksi insider, sumber dana, dan fresh wallet.
2. Database persisten (Postgres/KV) untuk Hall of Shame, riwayat skor, dan watchlist lintas perangkat.
3. Mode LLM Ask PokeSnap aktif secara default, dengan ringkasan risiko yang lebih natural.
4. Notifikasi Dev Watch (Telegram/X bot) saat dev menjual.
5. Maskot ter-rig (ekor dan ekspresi terpisah) untuk animasi yang lebih hidup.
6. Otomatisasi buyback & burn serta reward untuk holder.
7. Deploy produksi dan launch token $PokeSnap, lalu isi `NEXT_PUBLIC_POKESNAP_MINT`.

## 14. Disclaimer
PokeSnap adalah alat bantu analisis dan **bukan nasihat keuangan**. Skor bisa salah atau terlambat, jadi selalu lakukan riset sendiri (DYOR). Reaksi visual tidak memengaruhi token apa pun. PokeSnap adalah proyek **fan-made** dengan maskot orisinal dan tidak berafiliasi dengan Nintendo, Game Freak, atau The Pokémon Company. Pokémon adalah merek dagang milik masing-masing pemiliknya.
