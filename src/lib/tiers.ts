export type TierName = "Free" | "Scout" | "Hunter" | "Alpha";
export const TIERS: { name: TierName; min: number; perks: string }[] = [
  { name: "Free", min: 0, perks: "Snap Scanner, Hall of Shame, Ask PokeSnap" },
  { name: "Scout", min: 100_000, perks: "+ Live Arena, Meta Radar" },
  { name: "Hunter", min: 500_000, perks: "+ Watchlist / Dev Watch" },
  { name: "Alpha", min: 2_000_000, perks: "Everything + priority features" },
];
export const tierFor = (bal: number): TierName => [...TIERS].reverse().find((t) => bal >= t.min)!.name;
export const tierRank = (t: TierName) => TIERS.findIndex((x) => x.name === t);
export const UNLOCK_ALL = process.env.NEXT_PUBLIC_UNLOCK_ALL === "true";
export const POKESNAP_MINT = process.env.NEXT_PUBLIC_POKESNAP_MINT ?? "";
