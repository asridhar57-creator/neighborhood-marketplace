type Bucket = { timestamps: number[] };

type GlobalLimit = typeof globalThis & {
  __pinRateLimit?: Map<string, Bucket>;
};

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export function consumePinVerifyQuota(ip: string): { ok: true } | { ok: false; error: string } {
  const g = globalThis as GlobalLimit;
  if (!g.__pinRateLimit) {
    g.__pinRateLimit = new Map();
  }
  const now = Date.now();
  const bucket = g.__pinRateLimit.get(ip) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < WINDOW_MS);
  if (bucket.timestamps.length >= MAX_ATTEMPTS) {
    return {
      ok: false,
      error: "Too many PIN attempts from this connection. Wait a few minutes.",
    };
  }
  bucket.timestamps.push(now);
  g.__pinRateLimit.set(ip, bucket);
  return { ok: true };
}

export function clientIpFromHeaders(headerList: Headers): string {
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  return headerList.get("x-real-ip") ?? headerList.get("cf-connecting-ip") ?? "unknown";
}
