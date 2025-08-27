// backend/screener.ts
import axios from 'axios';

const FMP_API_KEY = process.env.FMP_API_KEY as string | undefined;
const FMP_BASE = 'https://financialmodelingprep.com/api/v3';

// --- tiny cache (10 minutes) ---
let cache: { ts: number; data: any[] } | null = null;
const CACHE_MS = 10 * 60 * 1000;

// --- util helpers ---
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const toNum = (v: any, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

/**
 * Run a simple growth + momentum screener over S&P 500.
 * Returns items shaped for the mobile UI: { symbol, price, avg200, score, ... }
 */
export async function runBasicScreener(): Promise<
  Array<{ symbol: string; price: number; avg200: number; score: number; epsGrowth?: number; marketCap?: number }>
> {
  // Serve from cache if fresh
  const now = Date.now();
  if (cache && now - cache.ts < CACHE_MS) return cache.data;

  // If no API key, return empty (UI handles gracefully)
  if (!FMP_API_KEY) {
    cache = { ts: now, data: [] };
    return [];
  }

  try {
    const { data: sp500 } = await axios.get(`${FMP_BASE}/sp500_constituent?apikey=${FMP_API_KEY}`);
    const symbols: string[] = (Array.isArray(sp500) ? sp500 : [])
      .slice(0, 200)
      .map((x) => String(x.symbol).toUpperCase())
      .filter(Boolean);

    // Concurrency limiter (keep it polite for FMP)
    const CONCURRENCY = 8;
    let idx = 0;
    const out: any[] = [];

    async function worker() {
      while (idx < symbols.length) {
        const i = idx++;
        const symbol = symbols[i];
        try {
          const { data: metrics } = await axios.get(
            `${FMP_BASE}/key-metrics/${symbol}?limit=1&apikey=${FMP_API_KEY}`
          );
          const m = Array.isArray(metrics) && metrics.length ? metrics[0] : null;
          if (!m) continue;

          // Required fields w/ guards
          const price = toNum(m.price);
          const avg200 = toNum(m.priceAvg200);
          // epsGrowth naming can vary; fall back to 0 if absent
          const epsG = toNum(m.epsGrowth ?? m.epsgrowth ?? 0);
          const mcap = toNum(m.marketCap);

          if (!price || !avg200 || !mcap) continue;
          if (mcap < 10_000_000_000) continue; // quality floor

          // Momentum: distance vs 200dma
          const rel200 = ((price - avg200) / Math.max(1e-9, avg200)) * 100;

          // Simple blended score 0-100 (same weighting as your original)
          let score = 0;
          score += Math.max(0, Math.min(60, rel200));        // up to 60 for momentum
          score += Math.max(0, Math.min(40, epsG * 10));     // up to 40 for EPS growth
          score = Math.max(0, Math.min(100, score));

          out.push({ symbol, price, avg200, epsGrowth: epsG, marketCap: mcap, score });
        } catch {
          // soft-fail a single symbol, go on
        }

        // gentle pacing (helps with bursty limits)
        if (i % 25 === 0) await sleep(50);
      }
    }

    // Run pool
    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

    const ranked = out.sort((a, b) => b.score - a.score).slice(0, 30);
    cache = { ts: now, data: ranked };
    return ranked;
  } catch {
    // If the S&P list call itself fails, return empty so UI doesn't explode
    cache = { ts: now, data: [] };
    return [];
  }
}
