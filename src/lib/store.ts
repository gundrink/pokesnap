import { promises as fs } from "fs";
import path from "path";
import type { ScoreResult } from "./score";

const FILE = path.join(process.cwd(), "data", "hall-of-shame.json");
export type ShameEntry = {
  mint: string;
  name: string;
  symbol: string;
  image?: string;
  score: number;
  reasons: string[];
  marketCapUsd?: number;
  firstZappedAt: number;
  lastScoredAt: number;
  timesZapped: number;
};

let lock: Promise<unknown> = Promise.resolve();

export async function readShame(): Promise<ShameEntry[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as ShameEntry[];
  } catch {
    return [];
  }
}

export function recordShame(r: ScoreResult) {
  const job = lock.then(async () => {
    const list = await readShame();
    const ex = list.find((e) => e.mint === r.mint);
    if (ex) {
      Object.assign(ex, { score: r.score, reasons: r.reasons.slice(0, 5), marketCapUsd: r.metrics.marketCapUsd, lastScoredAt: r.scoredAt, timesZapped: ex.timesZapped + 1 });
    } else {
      list.unshift({ mint: r.mint, name: r.name, symbol: r.symbol, image: r.image, score: r.score, reasons: r.reasons.slice(0, 5), marketCapUsd: r.metrics.marketCapUsd, firstZappedAt: r.scoredAt, lastScoredAt: r.scoredAt, timesZapped: 1 });
    }
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(list.slice(0, 500), null, 2));
  });
  lock = job.catch(() => {});
  return job;
}
