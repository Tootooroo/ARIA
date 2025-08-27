// backend/settings.ts
// Persists per-user Trade Autopilot settings. Upstash Redis if configured; else in-memory fallback.
import axios from 'axios';

export type Settings = {
  autotrade: boolean;
  riskPerTrade: number;        // % of equity risked per new position
  maxDailyLoss: number;        // % of equity; hard daily circuit breaker
  maxPositions: number;        // max concurrent positions
  allocationPct: number;       // % of equity allowed for the bot overall (evenly split)
  useMomentum: boolean;
  useMeanRev: boolean;
  useNews: boolean;
  timeframe: 'INTRADAY' | 'SWING' | 'POSITION';
  stopLoss: number;            // % below entry
  takeProfit: number;          // % above entry
  trailingStop: number;        // (kept for UI; strategy uses bracket TP/SL primarily)
  watchlist: string[];

  // --- safety/quality filters ---
  minScore: number;            // minimum screener score 0..100
  minPrice: number;            // skip penny/illiquid
  maxPrice: number;
  minAvgVol: number;           // minimum avgVolume (shares/day)
  maxATRpct: number;           // skip if ATR% too high (too volatile)
  earningsBlackoutDays: number;// avoid opening positions near earnings
  hardStopDaily: boolean;      // disable autotrade for the day if maxDailyLoss breached
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

const KV_URL = process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const mem = new Map<string, Settings>();
const k = (uid: string) => `trade:settings:${uid}`;

// --- tiny helpers ---
const num = (v: any, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const normalize = (s: Partial<Settings>): Partial<Settings> => {
  const out: Partial<Settings> = { ...s };
  if ('riskPerTrade' in s) out.riskPerTrade = clamp(num(s.riskPerTrade, DEFAULTS.riskPerTrade), 0, 10);
  if ('maxDailyLoss'  in s) out.maxDailyLoss  = clamp(num(s.maxDailyLoss,  DEFAULTS.maxDailyLoss), 0, 20);
  if ('maxPositions'  in s) out.maxPositions  = clamp(Math.floor(num(s.maxPositions, DEFAULTS.maxPositions)), 1, 20);
  if ('allocationPct' in s) out.allocationPct = clamp(num(s.allocationPct, DEFAULTS.allocationPct), 0, 100);
  if ('stopLoss'      in s) out.stopLoss      = clamp(num(s.stopLoss, DEFAULTS.stopLoss), 0.1, 50);
  if ('takeProfit'    in s) out.takeProfit    = clamp(num(s.takeProfit, DEFAULTS.takeProfit), 0.1, 200);
  if ('trailingStop'  in s) out.trailingStop  = clamp(num(s.trailingStop, DEFAULTS.trailingStop), 0, 50);
  if ('minScore'      in s) out.minScore      = clamp(num(s.minScore, DEFAULTS.minScore), 0, 100);
  if ('minPrice'      in s) out.minPrice      = clamp(num(s.minPrice, DEFAULTS.minPrice), 0, 10000);
  if ('maxPrice'      in s) out.maxPrice      = clamp(num(s.maxPrice, DEFAULTS.maxPrice), 1, 100000);
  if ('minAvgVol'     in s) out.minAvgVol     = clamp(Math.floor(num(s.minAvgVol, DEFAULTS.minAvgVol)), 0, 1e9);
  if ('maxATRpct'     in s) out.maxATRpct     = clamp(num(s.maxATRpct, DEFAULTS.maxATRpct), 0, 100);
  if ('earningsBlackoutDays' in s) out.earningsBlackoutDays = clamp(Math.floor(num(s.earningsBlackoutDays, DEFAULTS.earningsBlackoutDays)), 0, 30);
  if ('timeframe'     in s && !['INTRADAY','SWING','POSITION'].includes(String(s.timeframe))) out.timeframe = DEFAULTS.timeframe;
  if (Array.isArray(s.watchlist)) {
    const dedup = Array.from(new Set(s.watchlist.map((x) => String(x).trim().toUpperCase()).filter(Boolean)));
    out.watchlist = dedup.slice(0, 200);
  }
  return out;
};

export async function getSettings(userId?: string): Promise<Settings> {
  if (!userId) return DEFAULTS;
  if (KV_URL && KV_TOKEN) {
    try {
      const { data } = await axios.post(`${KV_URL}/get/${encodeURIComponent(k(userId))}`, null, {
        headers: { Authorization: `Bearer ${KV_TOKEN}` },
      });
      if (data?.result) return { ...DEFAULTS, ...JSON.parse(data.result) };
    } catch {}
  } else if (mem.has(userId)) {
    return mem.get(userId)!;
  }
  return DEFAULTS;
}

export async function saveSettings(userId: string | undefined, s: Partial<Settings>) {
  if (!userId) return DEFAULTS;
  const next: Settings = { ...(await getSettings(userId)), ...normalize(s) };
  if (KV_URL && KV_TOKEN) {
    try {
      await axios.post(
        `${KV_URL}/set/${encodeURIComponent(k(userId))}/${encodeURIComponent(JSON.stringify(next))}`,
        null,
        { headers: { Authorization: `Bearer ${KV_TOKEN}` } },
      );
    } catch {}
  } else {
    mem.set(userId, next);
  }
  return next;
}

// --- NEW: tiny helper the UI/back-end call expects ---
export async function toggleAutotrade(userId: string | undefined, value: boolean) {
  return saveSettings(userId, { autotrade: !!value });
}
