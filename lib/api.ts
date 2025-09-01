import axios from 'axios';

/** ================= Base URLs =================
 * For Expo on device, set EXPO_PUBLIC_API_BASE to your LAN IP (e.g. http://192.168.1.10:3000)
 */
const BASE = (process.env.EXPO_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_BASE || 'https://ai-companion-app-three.vercel.app')
  .replace(/\/$/, '');

const CHAT_API_URL = `${BASE}/api/chat`;

// Optional server for settings/logs (NOT required for the simulator)
const TRADING_PRIMARY_URL  = `${BASE}/api/tradehandler`;
const TRADING_FALLBACK_URL = `${BASE}/api/trading`;

// Flip this on only if you actually deploy the backend route:
const ENABLE_BACKEND =
  process.env.EXPO_PUBLIC_ENABLE_BACKEND === '1' ||
  process.env.NEXT_PUBLIC_ENABLE_BACKEND === '1';

// Shared axios instance
const http = axios.create({ timeout: 15000 });

/** ================= ARIA System Prompt ================= */
const SYSTEM_PROMPT = `
You are ARIA, a warm, caring, and capable companion. 
Adapt to the user's mood:
- Sad → comfort genuinely
- Happy/proud → celebrate
- Anxious → reassure
- Frustrated/confused → calmly guide
Give clear, direct answers for factual questions (no extra fluff or emojis).
Be friendly and relatable for emotional topics; reference recent context naturally.
Never say you're an AI. Your goal: make the user feel understood, supported, and empowered.
`;

/** ================= Chat client ================= */
export const sendMessageToOpenAI = async (
  messages: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> => {
  try {
    const fullMessages = [{ role: 'system', content: SYSTEM_PROMPT }, ...messages];
    const { data } = await http.post(CHAT_API_URL, { messages: fullMessages });
    return data?.reply?.trim?.() || '🤖 (No response)';
  } catch (error: any) {
    const detail = error?.response?.data || error?.message || error;
    console.error('API Proxy Error:', detail);
    return '⚠️ Sorry, there was a problem connecting to the service.';
  }
};

/** ================= Trading types (UI-facing) ================= */
export type TradingIntent =
  | 'ping'
  | 'getSettings' | 'saveSettings' | 'toggleAutotrade'
  | 'activityLogs' | 'appendActivityLogs'
  // kept for compatibility; will return NOT_ENABLED in local mode
  | 'screener' | 'symbolSnapshot'
  | 'linkBroker' | 'unlinkBroker'
  | 'account' | 'positions' | 'orders' | 'analytics'
  | 'buy' | 'sell' | 'cancel'
  | 'runStrategyOnce';

type Ok<T>  = { ok: true; data: T; ts: string };
type Err    = { ok: false; error: { code?: string; message: string }; ts: string };
type Res<T> = Ok<T> | Err;

const ts = () => new Date().toISOString();
const ok = <T,>(data: T): Ok<T> => ({ ok: true, data, ts: ts() });
const err = (message: string, code = 'ERROR'): Err => ({ ok: false, error: { code, message }, ts: ts() });

/** ================= Local (offline) settings store =================
 * Your simulator UI works without any backend. We keep a tiny in-memory
 * store keyed by userId to mimic get/save/toggle + logs.
 */
type Settings = {
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
  // extra fields can be added later
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
};

const LOCAL_SETTINGS = new Map<string, Settings>();
const LOCAL_LOGS = new Map<string, Array<{ ts: number; message: string }>>();

function mergeWithDefaults(x: Partial<Settings> | undefined): Settings {
  return { ...DEFAULTS, ...(x || {}) };
}

/** Local handler used when ENABLE_BACKEND is false */
async function localHandle(intent: TradingIntent | string, params: any): Promise<Res<any>> {
  switch (intent) {
    case 'ping': return ok({ pong: true });

    case 'getSettings': {
      const key = String(params?.userId || 'anon');
      const s = LOCAL_SETTINGS.get(key) || DEFAULTS;
      return ok(mergeWithDefaults(s));
    }
    case 'saveSettings': {
      const key = String(params?.userId || 'anon');
      const next = mergeWithDefaults({ ...(LOCAL_SETTINGS.get(key) || DEFAULTS), ...(params?.settings || {}) });
      LOCAL_SETTINGS.set(key, next);
      return ok({ saved: true });
    }
    case 'toggleAutotrade': {
      const key = String(params?.userId || 'anon');
      const cur = LOCAL_SETTINGS.get(key) || DEFAULTS;
      const next = { ...cur, autotrade: !!params?.autotrade };
      LOCAL_SETTINGS.set(key, next);
      return ok({ autotrade: next.autotrade });
    }

    case 'appendActivityLogs': {
      const key = String(params?.userId || 'anon');
      const items: Array<{ ts: number; message: string }> = Array.isArray(params?.items) ? params.items : [];
      const cur = LOCAL_LOGS.get(key) || [];
      LOCAL_LOGS.set(key, [...items, ...cur].slice(0, 1000));
      return ok({ appended: items.length });
    }
    case 'activityLogs': {
      const key = String(params?.userId || 'anon');
      return ok({ items: LOCAL_LOGS.get(key) || [] });
    }

    // Explicitly not supported in the simulation-only app:
    case 'screener':
    case 'symbolSnapshot':
    case 'linkBroker':
    case 'unlinkBroker':
    case 'account':
    case 'positions':
    case 'orders':
    case 'analytics':
    case 'buy':
    case 'sell':
    case 'cancel':
    case 'runStrategyOnce':
      return err('Live market & broker endpoints removed (simulation app)', 'NOT_ENABLED');

    default:
      return err('Unknown intent', 'UNKNOWN_INTENT');
  }
}

/** If backend is enabled, try /api/tradehandler then /api/trading */
async function postTrading(pathBody: any) {
  try {
    return await http.post(TRADING_PRIMARY_URL, pathBody);
  } catch (e: any) {
    const status = e?.response?.status;
    const text = typeof e?.response?.data === 'string' ? e.response.data : '';
    const looksNotFound =
      status === 404 || (typeof text === 'string' && /NOT_FOUND|The page could not be found/i.test(text));
    if (looksNotFound) return await http.post(TRADING_FALLBACK_URL, pathBody);
    throw e;
  }
}

/** ================= Exported Trading API ================= */
export const tradingAPI = {
  async query(intent: TradingIntent | string, params: any = {}) {
    if (!ENABLE_BACKEND) {
      // Offline-first: satisfy calls locally
      return localHandle(intent, params);
    }
    try {
      const { data } = await postTrading({ intent, params });
      return data;
    } catch (error: any) {
      const status = error?.response?.status;
      const detail = error?.response?.data || error?.message || error;
      console.error('Trading API Error:', detail);
      return {
        ok: false,
        error: {
          code: String(status || 'NETWORK'),
          message:
            (typeof detail === 'string' ? detail : detail?.error?.message) ||
            'Trading API request failed',
        },
      };
    }
  },

  async selfTest() {
    if (!ENABLE_BACKEND) return { reachable: true, status: 200, data: { ok: true, data: { mode: 'local' } } };
    try {
      const { data } = await postTrading({ intent: 'UNKNOWN_INTENT_TEST' });
      return { reachable: true, status: 200, data };
    } catch (e: any) {
      const status = e?.response?.status;
      const body = e?.response?.data;
      return { reachable: status !== 404, status: status || 0, data: body || null };
    }
  },
};
