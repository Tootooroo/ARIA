import axios from 'axios';

export type Settings = {
  autotrade: boolean;
  riskPerTrade: number;
  maxDailyLoss: number;
  maxPositions: number;
  allocationPct: number;
  useMomentum: boolean;
  useMeanRev: boolean;
  useNews: boolean;
  timeframe: 'INTRADAY' | 'SWING' | 'POSITION';
  stopLoss: number;
  takeProfit: number;
  trailingStop: number;
  watchlist: string[];

  minScore: number;
  minPrice: number;
  maxPrice: number;
  minAvgVol: number;
  maxATRpct: number;
  earningsBlackoutDays: number;
  hardStopDaily: boolean;
};

const DEFAULTS: Settings = {
  autotrade: false,
  riskPerTrade: 1.0,
  maxDailyLoss: 3.0,
  maxPositions: 3,
  allocationPct: 30,
  useMomentum: true,
  useMeanRev: false,
  useNews: true,
  timeframe: 'SWING',
  stopLoss: 1.0,
  takeProfit: 2.0,
  trailingStop: 1.0,
  watchlist: ['AAPL', 'NVDA', 'MSFT', 'TSLA'],

  minScore: 55,
  minPrice: 5,
  maxPrice: 1500,
  minAvgVol: 1_500_000,
  maxATRpct: 6,
  earningsBlackoutDays: 3,
  hardStopDaily: true,
};

// ---- storage wiring -----------------------------------------------------

const KV_URL_RAW = (process.env.UPSTASH_REDIS_REST_URL || '').trim();
const KV_URL = KV_URL_RAW.replace(/\/+$/, '');
const KV_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

const http = axios.create({
  baseURL: KV_URL || undefined,
  timeout: 8000,
  headers: KV_TOKEN ? { Authorization: `Bearer ${KV_TOKEN}` } : undefined,
});

const mem = new Map<string, Settings>();
const keyFor = (uid: string) => `trade:settings:${uid}`;

// Log once so you can verify on Vercel that storage is wired
(() => {
  if (KV_URL && KV_TOKEN) {
    console.log(
      '[settings] Upstash configured:',
      KV_URL.slice(0, 32) + (KV_URL.length > 32 ? '…' : ''),
      'token=' + KV_TOKEN.slice(0, 4) + '…' + KV_TOKEN.slice(-4)
    );
  } else {
    console.log('[settings] Using in-memory settings store');
  }
})();

// ---- helpers ------------------------------------------------------------

const num = (v: any, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

const normalize = (s: Partial<Settings>): Partial<Settings> => {
  const out: Partial<Settings> = {};
  if ('autotrade' in s) out.autotrade = !!s.autotrade;

  if ('riskPerTrade' in s) out.riskPerTrade = clamp(num(s.riskPerTrade, DEFAULTS.riskPerTrade), 0, 10);
  if ('maxDailyLoss'  in s) out.maxDailyLoss  = clamp(num(s.maxDailyLoss,  DEFAULTS.maxDailyLoss), 0, 20);
  if ('maxPositions'  in s) out.maxPositions  = clamp(Math.floor(num(s.maxPositions, DEFAULTS.maxPositions)), 1, 20);
  if ('allocationPct' in s) out.allocationPct = clamp(num(s.allocationPct, DEFAULTS.allocationPct), 0, 100);

  if ('stopLoss'      in s) out.stopLoss      = clamp(num(s.stopLoss, DEFAULTS.stopLoss), 0.1, 50);
  if ('takeProfit'    in s) out.takeProfit    = clamp(num(s.takeProfit, DEFAULTS.takeProfit), 0.1, 200);
  if ('trailingStop'  in s) out.trailingStop  = clamp(num(s.trailingStop, DEFAULTS.trailingStop), 0, 50);

  if ('useMomentum' in s) out.useMomentum = !!s.useMomentum;
  if ('useMeanRev'  in s) out.useMeanRev  = !!s.useMeanRev;
  if ('useNews'     in s) out.useNews     = !!s.useNews;

  if ('timeframe' in s) {
    const tf = String(s.timeframe);
    out.timeframe = (['INTRADAY', 'SWING', 'POSITION'] as const).includes(tf as any)
      ? (tf as Settings['timeframe'])
      : DEFAULTS.timeframe;
  }

  if ('minScore'  in s) out.minScore  = clamp(num(s.minScore, DEFAULTS.minScore), 0, 100);
  if ('minPrice'  in s) out.minPrice  = clamp(num(s.minPrice, DEFAULTS.minPrice), 0, 10000);
  if ('maxPrice'  in s) out.maxPrice  = clamp(num(s.maxPrice, DEFAULTS.maxPrice), 1, 100000);
  if ('minAvgVol' in s) out.minAvgVol = clamp(Math.floor(num(s.minAvgVol, DEFAULTS.minAvgVol)), 0, 1e9);
  if ('maxATRpct' in s) out.maxATRpct = clamp(num(s.maxATRpct, DEFAULTS.maxATRpct), 0, 100);

  if ('earningsBlackoutDays' in s)
    out.earningsBlackoutDays = clamp(Math.floor(num(s.earningsBlackoutDays, DEFAULTS.earningsBlackoutDays)), 0, 30);

  if ('hardStopDaily' in s) out.hardStopDaily = !!s.hardStopDaily;

  if (Array.isArray(s.watchlist)) {
    const dedup = Array.from(
      new Set(s.watchlist.map((x) => String(x).trim().toUpperCase()).filter(Boolean))
    );
    out.watchlist = dedup.slice(0, 200);
  }

  return out;
};

function mergeWithDefaults(x: any): Settings {
  const merged = { ...DEFAULTS, ...(x || {}) } as Settings;
  return { ...DEFAULTS, ...normalize(merged), watchlist: merged.watchlist || DEFAULTS.watchlist } as Settings;
}

// ---- API ----------------------------------------------------------------

export async function getSettings(userId?: string): Promise<Settings> {
  if (!userId) return DEFAULTS;

  if (KV_URL && KV_TOKEN) {
    try {
      const r = await http.get(`/get/${encodeURIComponent(keyFor(userId))}`);
      const raw = r.data?.result ?? null;
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          return mergeWithDefaults(parsed);
        } catch {
          // ignore corrupt JSON
        }
      }
    } catch {
      // ignore network/Upstash errors
    }
  }

  if (mem.has(userId)) return mem.get(userId)!;
  return DEFAULTS;
}

export async function saveSettings(userId: string | undefined, partial: Partial<Settings>) {
  if (!userId) return DEFAULTS;

  const next: Settings = mergeWithDefaults({ ...(await getSettings(userId)), ...normalize(partial) });

  if (KV_URL && KV_TOKEN) {
    try {
      // ✅ send JSON in body, not URL
      await http.post(`/set/${encodeURIComponent(keyFor(userId))}`, JSON.stringify(next), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      mem.set(userId, next);
      return next;
    }
  } else {
    mem.set(userId, next);
  }

  return next;
}

export async function toggleAutotrade(userId: string | undefined, value: boolean) {
  return saveSettings(userId, { autotrade: !!value });
}
