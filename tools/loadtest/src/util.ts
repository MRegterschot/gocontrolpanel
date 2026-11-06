import { createHash } from "node:crypto";

// Seeded PRNG (mulberry32)
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

// Deterministic uuid-shaped account id for a login
export function accountId(login: string): string {
  const h = createHash("sha1").update(login).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

export class Counter {
  private counts = new Map<string, number>();
  inc(key: string, n = 1) {
    this.counts.set(key, (this.counts.get(key) ?? 0) + n);
  }
  get(key: string) {
    return this.counts.get(key) ?? 0;
  }
  entries() {
    return [...this.counts.entries()];
  }
  top(n: number, scale = 1): Record<string, number> {
    return Object.fromEntries(
      this.entries()
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([k, v]) => [k, round(v / scale)]),
    );
  }
}

export const round = (n: number, digits = 2) => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};

// Flag parser: --key value, --key=value, bare --flag; env LOADTEST_<KEY> as fallback
export class Args {
  private map = new Map<string, string>();
  constructor(
    argv: string[],
    private env: NodeJS.ProcessEnv = process.env,
  ) {
    for (let i = 0; i < argv.length; i++) {
      const a = argv[i];
      if (!a.startsWith("--")) continue;
      const eq = a.indexOf("=");
      if (eq > 0) this.map.set(a.slice(2, eq), a.slice(eq + 1));
      else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith("--"))
        this.map.set(a.slice(2), argv[++i]);
      else this.map.set(a.slice(2), "true");
    }
  }
  str(key: string): string | undefined {
    return (
      this.map.get(key) ??
      this.env[`LOADTEST_${key.replaceAll("-", "_").toUpperCase()}`]
    );
  }
  num(key: string, fallback: number): number {
    const raw = this.str(key);
    if (raw === undefined) return fallback;
    const n = Number(raw);
    if (!Number.isFinite(n)) throw new Error(`--${key} must be a number`);
    return n;
  }
  bool(key: string): boolean {
    const v = this.str(key);
    return v === "true" || v === "1";
  }
}
