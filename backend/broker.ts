// backend/broker.ts
import axios, { AxiosInstance } from 'axios';

/** ---------- Types ---------- */
type BrokerProvider = 'alpaca' | 'interactive_brokers' | 'robinhood' | 'td_ameritrade';

type Side = 'buy' | 'sell';
type OrderType = 'market' | 'limit';
type TIF = 'day' | 'gtc' | 'ioc' | 'fok';

type AlpacaCreds = {
  key: string;
  secret: string;
  baseUrl?: string;
};

type StoredBrokerDoc = {
  provider: BrokerProvider;
  credentials?: Partial<AlpacaCreds> & Record<string, any>;
  linkedAt?: number;
};

/** ---------- Firestore (optional) ---------- */
let db: any | null = null;
try {
  // Expect backend/firebase.ts to export { db } (Firestore Admin instance)
  // If not present, we continue with env credentials only.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const firebase = require('./firebase');
  db = firebase?.db ?? null;
} catch (_) {
  db = null;
}

/** ---------- Defaults from env (kept from your original file) ---------- */
const ENV_ALPACA: AlpacaCreds = {
  key: process.env.ALPACA_API_KEY as string,
  secret: process.env.ALPACA_SECRET_KEY as string,
  baseUrl: process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets',
};

if (!ENV_ALPACA.key || !ENV_ALPACA.secret) {
  // Keep original guard: still throw if you haven't configured anything at all
  // (Per-user creds can override at runtime if set, but env is our baseline.)
  throw new Error('Missing Alpaca API credentials in .env');
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** ---------- Helpers ---------- */
function makeAlpacaClient(creds: AlpacaCreds): AxiosInstance {
  return axios.create({
    baseURL: creds.baseUrl || ENV_ALPACA.baseUrl!,
    headers: {
      'APCA-API-KEY-ID': creds.key,
      'APCA-API-SECRET-KEY': creds.secret,
      'Content-Type': 'application/json',
    },
  });
}

async function getStoredBroker(userId?: string): Promise<StoredBrokerDoc | null> {
  if (!db || !userId) return null;
  try {
    const snap = await db.doc(`users/${userId}/brokers/alpaca`).get();
    if (snap.exists) return snap.data() as StoredBrokerDoc;
    return null;
  } catch {
    return null;
  }
}

async function setStoredBroker(
  userId: string,
  doc: StoredBrokerDoc | null
): Promise<void> {
  if (!db || !userId) return;
  const ref = db.doc(`users/${userId}/brokers/alpaca`);
  if (doc) {
    await ref.set({ ...doc, linkedAt: Date.now() }, { merge: true });
  } else {
    await ref.delete().catch(() => void 0);
  }
}

async function getAlpacaClient(userId?: string): Promise<AxiosInstance> {
  // Prefer user-scoped credentials if present, else env.
  const stored = await getStoredBroker(userId);
  const creds: AlpacaCreds = {
    key: stored?.credentials?.key || ENV_ALPACA.key,
    secret: stored?.credentials?.secret || ENV_ALPACA.secret,
    baseUrl: stored?.credentials?.baseUrl || ENV_ALPACA.baseUrl,
  };
  return makeAlpacaClient(creds);
}

/** ---------- Public API used by the rest of backend ---------- */

export async function getAccount(userId?: string) {
  const alpaca = await getAlpacaClient(userId);
  const { data } = await alpaca.get('/v2/account');
  return data;
}

export async function getPositions(userId?: string) {
  const alpaca = await getAlpacaClient(userId);
  const { data } = await alpaca.get('/v2/positions');
  return data;
}

export async function getOrders(
  status: 'open' | 'closed' | 'all' = 'open',
  userId?: string
) {
  const alpaca = await getAlpacaClient(userId);
  const { data } = await alpaca.get(`/v2/orders?status=${status}`);
  return data;
}

export async function placeOrder(
  symbol: string,
  qty: number,
  side: Side,
  type: OrderType,
  time_in_force: TIF,
  limit_price?: number,
  userId?: string,
  bracket?: { take_profit?: number; stop_loss?: number; trailing_stop_percent?: number }
) {
  const alpaca = await getAlpacaClient(userId);

  const body: any = { symbol, qty, side, type, time_in_force };
  if (type === 'limit' && limit_price) body.limit_price = r2(limit_price);

  if (bracket?.take_profit || bracket?.stop_loss) {
    body.order_class = 'bracket';
    if (bracket.take_profit) body.take_profit = { limit_price: r2(bracket.take_profit) };
    if (bracket.stop_loss) body.stop_loss = { stop_price: r2(bracket.stop_loss) };
  } else if (bracket?.trailing_stop_percent) {
    body.type = 'trailing_stop';
    delete body.limit_price;
    body.trail_percent = r2(bracket.trailing_stop_percent);
  }

  const { data } = await alpaca.post('/v2/orders', body);
  return data;
}

export async function cancelOrder(orderId: string, userId?: string) {
  const alpaca = await getAlpacaClient(userId);
  const { data } = await alpaca.delete(`/v2/orders/${orderId}`);
  return data;
}

/** ---------- New: link/unlink to support the Trading screen ---------- */

/**
 * Link a broker to a user. For now, we support Alpaca API-key auth.
 * Other providers are stubbed (OAuth to be added later).
 */
export async function linkBroker(params: {
  userId: string;
  provider: BrokerProvider;
  credentials?: Partial<AlpacaCreds> & Record<string, any>;
}): Promise<{ ok: true }> {
  const { userId, provider, credentials } = params;

  if (!userId) throw new Error('userId required');

  switch (provider) {
    case 'alpaca': {
      // Minimal validation; allow empty to fallback to env
      const safe: StoredBrokerDoc = {
        provider: 'alpaca',
        credentials: {
          key: credentials?.key || '',
          secret: credentials?.secret || '',
          baseUrl: credentials?.baseUrl || undefined,
        },
      };
      await setStoredBroker(userId, safe);
      return { ok: true };
    }

    // Placeholders for future OAuth-based brokers
    case 'interactive_brokers':
    case 'robinhood':
    case 'td_ameritrade': {
      // You can store a placeholder so the app knows a broker is selected.
      const safe: StoredBrokerDoc = { provider, credentials: credentials || {} };
      await setStoredBroker(userId, safe);
      return { ok: true };
    }

    default:
      throw new Error('Unsupported broker provider');
  }
}

export async function unlinkBroker(params: { userId: string }) {
  const { userId } = params;
  if (!userId) throw new Error('userId required');
  await setStoredBroker(userId, null);
  return { ok: true };
}
