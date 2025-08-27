// backend/strategy.ts
import axios from 'axios';
import { getAccount, getOrders, getPositions, placeOrder } from './broker';
import { runBasicScreener } from './screener';
import { getSettings, saveSettings } from './settings';

type Log = { t: string; msg: string };
const now = () => new Date().toISOString();
const logPush = (logs: Log[], msg: string) => logs.push({ t: now(), msg });

const FMP_BASE = 'https://financialmodelingprep.com/api/v3';
const FMP_API_KEY = process.env.FMP_API_KEY as string | undefined;

/** ---------------- FMP helpers (with safe fallbacks) ---------------- */
async function fmpQuote(symbol: string) {
  if (!FMP_API_KEY) return { price: 0, avgVolume: 0 };
  try {
    const { data } = await axios.get(`${FMP_BASE}/quote/${symbol}?apikey=${FMP_API_KEY}`);
    const q = Array.isArray(data) ? data[0] : null;
    return {
      price: Number(q?.price || q?.previousClose || 0),
      avgVolume: Number(q?.avgVolume || 0),
    };
  } catch {
    return { price: 0, avgVolume: 0 };
  }
}

async function fmpATRpct(symbol: string, period = 14) {
  if (!FMP_API_KEY) return 0;
  try {
    const { data } = await axios.get(
      `${FMP_BASE}/historical-price-full/${symbol}?timeseries=${Math.max(20, period + 5)}&apikey=${FMP_API_KEY}`
    );
    const rows: any[] = data?.historical || [];
    if (rows.length < period + 1) return 0;

    const closes = rows.map((r) => Number(r.close));
    const highs = rows.map((r) => Number(r.high));
    const lows = rows.map((r) => Number(r.low));

    let atr = 0;
    for (let i = rows.length - 1; i >= 1; i--) {
      const h = highs[i], l = lows[i], cPrev = closes[i - 1];
      const tr = Math.max(h - l, Math.abs(h - cPrev), Math.abs(l - cPrev));
      if (rows.length - 1 - i === 0) {
        atr = tr;
      } else {
        atr = (atr * (period - 1) + tr) / period; // Wilder smoothing
      }
    }
    const lastClose = closes[closes.length - 1];
    return lastClose ? (atr / lastClose) * 100 : 0;
  } catch {
    return 0;
  }
}

async function hasEarningsWithin(symbol: string, days: number) {
  if (!FMP_API_KEY || !days || days <= 0) return false;
  try {
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + days);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const { data } = await axios.get(
      `${FMP_BASE}/earning_calendar?symbol=${symbol}&from=${fmt(from)}&to=${fmt(to)}&apikey=${FMP_API_KEY}`
    );
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

/** ---------------- Core strategy ---------------- */
export async function evaluateAndTrade(userId?: string) {
  const logs: Log[] = [];

  const settings = await getSettings(userId);
  if (!settings?.autotrade) {
    logPush(logs, 'Auto-trade disabled — skipping');
    return { logs };
  }

  // 0) Circuit breaker: daily loss
  const [acct, rawPositions] = await Promise.all([
    getAccount(userId).catch(() => null),
    getPositions(userId).catch(() => []),
  ]);
  const equity = Number(acct?.equity ?? 0) || 100000;
  const dayPL = (Array.isArray(rawPositions) ? rawPositions : []).reduce((sum: number, p: any) => {
    const pl = Number(p?.unrealized_intraday_pl ?? 0);
    return sum + (Number.isFinite(pl) ? pl : 0);
  }, 0);
  const dayDrawdownPct = equity ? (-Math.min(0, dayPL) / equity) * 100 : 0;

  if (settings.hardStopDaily && dayDrawdownPct >= settings.maxDailyLoss) {
    await saveSettings(userId, { autotrade: false });
    logPush(
      logs,
      `⚠️ Daily loss ${dayDrawdownPct.toFixed(2)}% ≥ ${settings.maxDailyLoss}% — disabling autotrade for today`
    );
    return { logs, dayPL, equity };
  }

  // 1) Current state
  const positions = (Array.isArray(rawPositions) ? rawPositions : []).map((p: any) =>
    String(p.symbol).toUpperCase()
  );
  const posSet = new Set(positions);
  const maxPositions: number = Number(settings.maxPositions ?? 3);
  const openSlots = Math.max(0, maxPositions - positions.length);
  if (openSlots === 0) logPush(logs, `Max positions reached (${maxPositions}) — no new entries`);

  // 2) Candidate ideas
  const opps = await runBasicScreener();
  const minScore: number = Number(settings.minScore ?? 60);
  const filtered = opps.filter((o) => o.score >= minScore);

  // 3) Sizing constants
  const allocationPct: number = Number(settings.allocationPct ?? 30);
  const botEquityCap = (allocationPct / 100) * equity;
  const perPosCap = botEquityCap / Math.max(1, maxPositions);
  const riskPerTrade: number = Number(settings.riskPerTrade ?? 1);
  const riskDollars = (riskPerTrade / 100) * equity;

  const minPrice: number = Number(settings.minPrice ?? 1);
  const maxPrice: number = Number(settings.maxPrice ?? 1000);
  const minAvgVol: number = Number(settings.minAvgVol ?? 500_000);
  const maxATRpct: number = Number(settings.maxATRpct ?? 8);
  const earningsBlackoutDays: number = Number(settings.earningsBlackoutDays ?? 0);
  const stopLossPct: number = Number(settings.stopLoss ?? 1.0);
  const takeProfitPct: number = Number(settings.takeProfit ?? 2.0);

  // 4) Try to open up to openSlots positions
  let opened = 0;
  for (const o of filtered) {
    if (opened >= openSlots) break;

    const symbol = String(o.symbol).toUpperCase();
    if (posSet.has(symbol)) continue;

    // Quote & volatility checks
    const [{ price, avgVolume }, atrPct] = await Promise.all([fmpQuote(symbol), fmpATRpct(symbol, 14)]);

    if (!price || price < minPrice || price > maxPrice) {
      logPush(logs, `Skip ${symbol}: price ${price?.toFixed?.(2) ?? 'n/a'} out of bounds`);
      continue;
    }
    if (avgVolume < minAvgVol) {
      logPush(logs, `Skip ${symbol}: avgVol ${avgVolume} < ${minAvgVol}`);
      continue;
    }
    if (atrPct > maxATRpct) {
      logPush(logs, `Skip ${symbol}: ATR% ${atrPct.toFixed(2)} > ${maxATRpct}`);
      continue;
    }
    if (await hasEarningsWithin(symbol, earningsBlackoutDays)) {
      logPush(logs, `Skip ${symbol}: earnings within ${earningsBlackoutDays}d`);
      continue;
    }

    // Risk-based sizing: risk per share approx = stopLoss% * price
    const riskPerShare = price * (stopLossPct / 100);
    let qty = Math.floor(riskDollars / Math.max(0.01, riskPerShare));
    // cap by allocation
    qty = Math.min(qty, Math.floor(perPosCap / price));
    if (!qty || qty <= 0) {
      logPush(logs, `Skip ${symbol}: qty calc <= 0`);
      continue;
    }

    // Bracket prices
    const tp = price * (1 + takeProfitPct / 100);
    const sl = price * (1 - stopLossPct / 100);

    try {
      await placeOrder(symbol, qty, 'buy', 'market', 'day', undefined, userId, {
        take_profit: tp,
        stop_loss: sl,
      });
      logPush(
        logs,
        `BUY ${qty} ${symbol} @~${price.toFixed(2)} | TP ${tp.toFixed(2)} SL ${sl.toFixed(2)} (score ${Math.round(
          o.score
        )})`
      );
      opened++;
    } catch (e: any) {
      logPush(logs, `❗ Failed BUY ${symbol}: ${e?.message || 'unknown'}`);
    }
  }

  // 5) For legacy positions without brackets, enforce exits (belt & suspenders)
  for (const p of (Array.isArray(rawPositions) ? rawPositions : [])) {
    const symbol = String(p.symbol).toUpperCase();
    const qty = Number(p.qty ?? p.quantity ?? 0);
    const entry = Number(p.avg_entry_price ?? p.average_entry_price ?? 0);
    const last = Number(p.current_price ?? p.market_price ?? 0);
    if (!qty || !entry || !last) continue;

    const changePct = ((last - entry) / entry) * 100;
    if (changePct >= takeProfitPct) {
      try {
        await placeOrder(symbol, qty, 'sell', 'market', 'day', undefined, userId);
        logPush(logs, `TP SELL ${qty} ${symbol} at +${changePct.toFixed(2)}%`);
      } catch (e: any) {
        logPush(logs, `❗ Failed TP SELL ${symbol}: ${e?.message || 'unknown'}`);
      }
    } else if (changePct <= -stopLossPct) {
      try {
        await placeOrder(symbol, qty, 'sell', 'market', 'day', undefined, userId);
        logPush(logs, `SL SELL ${qty} ${symbol} at ${changePct.toFixed(2)}%`);
      } catch (e: any) {
        logPush(logs, `❗ Failed SL SELL ${symbol}: ${e?.message || 'unknown'}`);
      }
    }
  }

  const orders = await getOrders('open', userId).catch(() => []);
  return {
    logs,
    opened,
    openOrders: Array.isArray(orders) ? orders.length : 0,
    equity,
    dayPL,
  };
}

/** ---------------- UI-facing helper ----------------
 * The mobile screen calls `tradingAPI.query('runStrategyOnce')`
 * and expects `data.ordersCount`.
 */
export async function runStrategyOnce(userId?: string) {
  const out = await evaluateAndTrade(userId);
  // If evaluateAndTrade returned only logs (autotrade off), normalize fields:
  const ordersCount =
    (out as any)?.openOrders ?? (Array.isArray((out as any)?.orders) ? (out as any).orders.length : 0) ?? 0;
  return {
    ordersCount,
    logs: (out as any)?.logs ?? [],
    opened: (out as any)?.opened ?? 0,
    equity: (out as any)?.equity,
    dayPL: (out as any)?.dayPL,
  };
}
