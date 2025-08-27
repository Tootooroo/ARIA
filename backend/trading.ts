// backend/trading.ts
import {
  cancelOrder,
  getAccount,
  getOrders,
  getPositions,
  linkBroker,
  placeOrder,
  unlinkBroker,
} from './broker';
import { runBasicScreener } from './screener';
import { getSettings, saveSettings, toggleAutotrade } from './settings';
import { runStrategyOnce } from './strategy';

// ---------- Result helpers ----------
export type Ok<T>  = { ok: true; data: T; ts: string };
export type Err    = { ok: false; error: { code?: string; message: string }; ts: string };
export type Res<T> = Ok<T> | Err;
const ts = () => new Date().toISOString();

function ok<T>(data: T): Ok<T> { return { ok: true, data, ts: ts() }; }
function err(message: string, code = 'ERROR'): Err {
  return { ok: false, error: { code, message }, ts: ts() };
}

// ---------- Analytics shape ----------
export type Analytics = {
  equity: number;
  cash: number;
  buyingPower: number;
  exposure: number;          // market value of positions
  allocationUsedPct: number; // exposure / (equity * settings.allocationPct)
  openPL: number;            // total unrealized P/L
  dayPL: number;             // intraday P/L across positions
  openPositions: number;
  openOrders: number;
};

// ---------- utils ----------
const toNum = (v: any, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const normSideTypeTIF = (params: any) => {
  const type = (params.type || 'market') as 'market' | 'limit';
  const tif = (params.time_in_force || 'day') as 'day' | 'gtc' | 'ioc' | 'fok';
  return { type, tif };
};
const axiosMsg = (e: any) =>
  e?.response?.data?.message ||
  e?.response?.data?.error ||
  e?.message ||
  'Unknown error';

// Build analytics from broker + settings
async function buildAnalytics(userId?: string): Promise<Res<Analytics>> {
  try {
    const [acct, pos, orders, settings] = await Promise.all([
      getAccount(userId),
      getPositions(userId),
      getOrders('open', userId),
      getSettings(userId),
    ]);

    const equity      = toNum(acct?.equity);
    const cash        = toNum(acct?.cash);
    const buyingPower = toNum(acct?.buying_power ?? acct?.buyingPower);

    let exposure = 0;
    let openPL = 0;
    let dayPL = 0;
    if (Array.isArray(pos)) {
      for (const p of pos) {
        exposure += toNum(p?.market_value);
        openPL   += toNum(p?.unrealized_pl);
        dayPL    += toNum(p?.unrealized_intraday_pl);
      }
    }

    const allocationPct: number = toNum((settings as any)?.allocationPct, 30);
    const allocCap = equity * (allocationPct / 100);
    const allocationUsedPct = allocCap > 0 ? (exposure / allocCap) * 100 : 0;

    return ok({
      equity,
      cash,
      buyingPower,
      exposure,
      allocationUsedPct,
      openPL,
      dayPL,
      openPositions: Array.isArray(pos) ? pos.length : 0,
      openOrders: Array.isArray(orders) ? orders.length : 0,
    });
  } catch (e: any) {
    return err(axiosMsg(e) || 'Failed to compute analytics', 'ANALYTICS');
  }
}

// ---------- Public handler ----------
export async function handleTradingQuery(intent: string, params: any): Promise<Res<any>> {
  try {
    switch (intent) {
      /** ---- broker link/unlink ---- */
      case 'linkBroker': {
        if (!params?.userId) return err('userId required', 'BAD_REQUEST');
        await linkBroker({
          userId: params.userId,
          provider: params?.provider,
          credentials: params?.credentials,
        });
        return ok({ ok: true });
      }
      case 'unlinkBroker': {
        if (!params?.userId) return err('userId required', 'BAD_REQUEST');
        await unlinkBroker({ userId: params.userId });
        return ok({ ok: true });
      }

      /** ---- account data ---- */
      case 'account':   return ok(await getAccount(params?.userId));
      case 'positions': return ok(await getPositions(params?.userId));
      case 'orders': {
        const status = (params?.status || 'open') as 'open' | 'closed' | 'all';
        const safeStatus: 'open' | 'closed' | 'all' =
          status === 'closed' ? 'closed' : status === 'all' ? 'all' : 'open';
        return ok(await getOrders(safeStatus, params?.userId));
      }
      case 'analytics': return await buildAnalytics(params?.userId);

      /** ---- screener & strategy ---- */
      case 'screener':         return ok(await runBasicScreener());
      case 'runStrategyOnce':  return ok(await runStrategyOnce(params?.userId));

      /** ---- settings ---- */
      case 'getSettings': {
        const s = await getSettings(params?.userId);
        return ok(s ?? {});
      }
      case 'saveSettings': {
        await saveSettings(params?.userId, params?.settings || {});
        return ok({ saved: true });
      }
      case 'toggleAutotrade': {
        const value = !!params?.autotrade;
        await toggleAutotrade(params?.userId, value);
        return ok({ autotrade: value });
      }

      /** ---- trading ---- */
      case 'buy':
      case 'sell': {
        const rawSymbol = String(params?.symbol || '').trim();
        const symbol = rawSymbol.toUpperCase();
        const qty = clamp(Math.floor(toNum(params?.qty, 0)), 1, 1_000_000);
        if (!symbol) return err('symbol required', 'BAD_REQUEST');
        if (!qty)    return err('qty must be > 0', 'BAD_REQUEST');

        const { type, tif } = normSideTypeTIF(params);
        const limit = type === 'limit' ? toNum(params?.limit_price) : undefined;

        const data = await placeOrder(
          symbol,
          qty,
          intent === 'buy' ? 'buy' : 'sell',
          type,
          tif,
          limit,
          params?.userId,
          params?.bracket
        );
        return ok(data);
      }

      case 'cancel': {
        if (!params?.orderId) return err('orderId required', 'BAD_REQUEST');
        return ok(await cancelOrder(params.orderId, params?.userId));
      }

      default:
        return err('Unknown intent', 'UNKNOWN_INTENT');
    }
  } catch (e: any) {
    return err(axiosMsg(e) || 'Trading op failed', 'SERVER');
  }
}
