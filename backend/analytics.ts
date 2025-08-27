// backend/analytics.ts
import { getAccount, getOrders, getPositions } from './broker';
import { getSettings } from './settings';

type Analytics = {
  equity: number;
  cash: number;
  buyingPower: number;
  exposure: number;
  allocationUsedPct: number; // exposure / (equity * allocationPct)
  openPL: number;
  dayPL: number;
  openPositions: number;
  openOrders: number;
  ts: string;
};

const toNum = (v: any, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

export async function getAnalytics(userId?: string) {
  try {
    const [acct, posRaw, openOrders, settings] = await Promise.all([
      getAccount(userId).catch(() => null),
      getPositions(userId).catch(() => []),
      getOrders('open', userId).catch(() => []),
      getSettings(userId).catch(() => null),
    ]);

    const equity      = toNum(acct?.equity);
    const cash        = toNum(acct?.cash);
    const buyingPower = toNum(acct?.buying_power ?? acct?.daytrading_buying_power ?? acct?.buyingPower);

    let exposure = 0;
    let openPL = 0;
    let dayPL = 0;

    (Array.isArray(posRaw) ? posRaw : []).forEach((p: any) => {
      const mv   = toNum(p?.market_value ?? p?.marketValue);
      const uPL  = toNum(p?.unrealized_pl);
      const uPLd = toNum(p?.unrealized_intraday_pl);
      exposure += mv;
      openPL   += uPL;
      dayPL    += uPLd;
    });

    // Use allocation cap based on settings (default 30% if missing)
    const allocationPct = toNum((settings as any)?.allocationPct, 30);
    const allocCap = equity * (allocationPct / 100);
    const allocationUsedPct = allocCap > 0 ? (exposure / allocCap) * 100 : 0;

    const data: Analytics = {
      equity,
      cash,
      buyingPower,
      exposure,
      allocationUsedPct,
      openPL,
      dayPL,
      openPositions: Array.isArray(posRaw) ? posRaw.length : 0,
      openOrders: Array.isArray(openOrders) ? openOrders.length : 0,
      ts: new Date().toISOString(),
    };

    return { ok: true, data } as const;
  } catch (e: any) {
    return {
      ok: false,
      error: { code: 'ANALYTICS', message: e?.message || 'Failed to compute analytics' },
      ts: new Date().toISOString(),
    } as const;
  }
}
