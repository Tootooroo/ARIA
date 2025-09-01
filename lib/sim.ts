// lib/sim.ts
// Frontend simulator used by Learn/Practice/Journal/Progress.
// Realism: drift + vol + beta + mean reversion (EMA200), sessions, bid/ask spread,
// worst-case market fills with slippage, and a simple per-share fee.
// Scores are cross-sectionally calibrated to 0–30 (like a live screener).

import * as SecureStore from 'expo-secure-store';

/** ---------- Types surfaced to the app ---------- */
export type Position = { symbol: string; qty: number; avgPrice: number; last: number; pnl: number };
export type Order = {
  id: string;
  side: 'BUY' | 'SELL';
  symbol: string;
  qty: number;
  price: number;       // fill price
  ts: number;
  r?: number;
  fee?: number;        // simple fee per order
  note?: string;
};
export type PaperState = { cash: number; startingCash: number; positions: Position[]; orders: Order[] };
export type Opportunity = { symbol: string; price: number; changePct: number; score: number; bars: number[] };

export const PAPER_KEY = 'paper.state.v3';
export const WATCHLIST_KEY = 'watchlist.v1';
export const DEFAULT_PAPER_CASH = 10000;

/** ---------- Internal market sim ---------- */
type SimRow = {
  symbol: string;
  name: string;
  sector: string;
  shares: number;
  price: number;
  ema200: number;
  lastClose: number;
  changesPct: number;
  drift: number;
  vol: number;
  beta: number;
  bars: number[]; // normalized 0..1 for mini spark
};

type Session = 'RTH' | 'PRE' | 'POST';

const sectors = ['Technology','Financial','Healthcare','Energy','Consumer','Industrial','Utilities'];

const rng = (seedStr: string) => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    return (h >>> 0) / 4294967296;
  };
};

const simState: {
  rows: SimRow[];
  lastTs: number;
  r: () => number;
  dayCount: number;
  session: Session;
} = { rows: [], lastTs: 0, r: rng('TRADE-AUTOPILOT-SIM'), dayCount: 0, session: 'RTH' };

function genSymbol(i: number) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const a = letters[i % 26];
  const b = letters[Math.floor(i/26) % 26];
  const c = letters[Math.floor(i/676) % 26];
  return (a+b+c).slice(0, 3);
}

function initUniverse(count = 80) {
  const r = simState.r;
  const rows: SimRow[] = [];
  for (let i = 0; i < count; i++) {
    const sector = sectors[Math.floor(r()*sectors.length)];
    const symbol = genSymbol(i);
    const base = 10 + Math.floor(r()*290); // 10..300
    const price = base + r()*base*0.2;
    const shares = 50e6 + Math.floor(r()*950e6);

    // seed a 24-bar history for sparklines
    const bars: number[] = [];
    let p = price;
    for (let k = 0; k < 24; k++) {
      const step = (r()-0.5) * 0.02 * base;
      p = Math.max(1, p + step);
      bars.push(p);
    }
    const min = Math.min(...bars), max = Math.max(...bars), span = Math.max(1e-6, max-min);
    const norm = bars.map(x => (x - min) / span);

    rows.push({
      symbol,
      name: `${sector} Co ${i+1}`,
      sector,
      shares,
      price,
      ema200: price,
      lastClose: price,
      changesPct: 0,
      drift: 0.0002 + r()*0.0006,
      vol: 0.012 + r()*0.03,
      beta: 0.5 + r()*0.7,
      bars: norm,
    });
  }
  simState.rows = rows;
  simState.lastTs = Date.now();
  simState.dayCount = 0;
  simState.session = 'RTH';
}

function advanceSession() {
  const idx = { RTH: 0, POST: 1, PRE: 2 }[simState.session] ?? 0;
  simState.session = (['RTH','POST','PRE'] as Session[])[(idx + 1) % 3];
}

function tickOneDay() {
  const r = simState.r;
  // market factor
  const mDrift = 0.0001;
  const mVol = 0.008;
  const mShock = (r() < 0.02) ? (r()-0.5)*0.08 : 0; // 2% chance of big day
  const marketMove = mDrift + mVol*(r()-0.5) + mShock;

  for (const row of simState.rows) {
    // idiosyncratic + mean reversion to ema200 + occasional micro shock
    const reversion = Math.max(-0.02, Math.min(0.02, (row.ema200 - row.price)/Math.max(1e-9,row.ema200)*0.05));
    const shock = (r() < 0.01) ? (r()-0.5)*0.15 : 0;
    const ret = row.drift + row.vol*(r()-0.5) + row.beta*marketMove + reversion + shock;

    const newPrice = Math.max(0.5, row.price * (1 + ret));
    row.ema200     = row.ema200 + (newPrice - row.ema200) * (1/200);
    row.changesPct = ((newPrice - row.lastClose) / Math.max(1e-9,row.lastClose)) * 100;
    row.lastClose  = newPrice;
    row.price      = newPrice;

    // spark bars (momentum-ish) normalized
    const last = row.bars[row.bars.length-1] ?? 0.5;
    const next = Math.max(0.05, Math.min(1, last + (row.changesPct/100)*0.2));
    row.bars = [...row.bars.slice(1), next];
  }
  simState.dayCount++;
  if (simState.dayCount % 30 === 0) advanceSession();
}

/** ---------- Spread & quotes ---------- */
function computeSpread(p: number, session: Session): number {
  const baseBps = session === 'RTH' ? 8 : 18; // wider off-hours
  const minTick = p < 5 ? 0.005 : p < 50 ? 0.01 : 0.02;
  return Math.max(minTick, (baseBps / 10000) * p);
}

/** ---------- Public Sim singleton ---------- */
const Sim = new (class {
  watchlist: string[] = ['AAPL','NVDA','MSFT','TSLA','AMZN','META','GOOGL','AMD','AVGO','NFLX','SHOP','SMCI'];
  paper: PaperState = { cash: DEFAULT_PAPER_CASH, startingCash: DEFAULT_PAPER_CASH, positions: [], orders: [] };
  listeners = new Set<() => void>();

  on(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => { this.listeners.delete(cb); };
  }
  emit() { this.listeners.forEach(cb => cb()); }

  async load() {
    if (!simState.rows.length) {
      initUniverse(80);
      for (let i = 0; i < 250; i++) tickOneDay(); // warmup for realistic EMA
    }
    try {
      const saved = await SecureStore.getItemAsync(PAPER_KEY);
      if (saved) this.paper = { ...this.paper, ...JSON.parse(saved) };
    } catch {}
    try {
      const wl = await SecureStore.getItemAsync(WATCHLIST_KEY);
      if (wl) {
        const arr = JSON.parse(wl);
        if (Array.isArray(arr) && arr.length) this.watchlist = arr;
      }
    } catch {}
    this.emit();
  }
  async persist() {
    try { await SecureStore.setItemAsync(PAPER_KEY, JSON.stringify(this.paper)); } catch {}
    try { await SecureStore.setItemAsync(WATCHLIST_KEY, JSON.stringify(this.watchlist)); } catch {}
  }

  /** advance time a bit (UI calls every few seconds or on demand) */
  tickAll(days = 1) { for (let i = 0; i < days; i++) tickOneDay(); this.markPositions(); this.emit(); }

  /** Cross-sectionally calibrated 0–30 score (trend + momentum). */
  snapshot(): Opportunity[] {
    const rows = simState.rows;
    const rels = rows.map(r => ((r.price - r.ema200) / Math.max(1e-9, r.ema200)) * 100); // % above/below ema200
    const moms = rows.map(r => r.changesPct);                                           // day momentum

    const sRel = [...rels].sort((a,b)=>a-b);
    const sMom = [...moms].sort((a,b)=>a-b);
    const n = Math.max(1, rows.length - 1);

    const pr = (x:number, s:number[]) => {
      // percentile rank via binary search (last <= x)
      let lo=0, hi=s.length-1, idx=0;
      while (lo <= hi) {
        const m = (lo+hi)>>1;
        if (s[m] <= x) { idx = m; lo = m+1; } else hi = m-1;
      }
      return idx / Math.max(1, n);
    };

    const out: Opportunity[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const pctRel = pr(rels[i], sRel);
      const pctMom = pr(moms[i], sMom);
      const composite = 0.6*pctRel + 0.4*pctMom;        // weight trend a bit more
      const score = Math.max(0, Math.min(30, Math.round(30 * composite)));
      out.push({ symbol: r.symbol, price: r.price, changePct: r.changesPct, score, bars: r.bars });
    }
    out.sort((a,b)=>b.score-a.score);
    return out.slice(0, 60);
  }

  /** Quotes/fills/fees */
  quote(symbol: string): { bid: number; ask: number; last: number; spread: number; session: Session } | null {
    const row = this.bySym(symbol);
    if (!row) return null;
    const session = simState.session;
    const spread = computeSpread(row.price, session);
    const last = row.price;
    const bid = Math.max(0.01, last - spread/2);
    const ask = last + spread/2;
    return { bid, ask, last, spread, session };
  }

  worstCaseFill(side: 'BUY' | 'SELL', symbol: string, qty: number): number {
    const q = this.quote(symbol);
    if (!q) return this.price(symbol);
    const slip = q.spread * 0.25; // 25% of spread as conservative slippage
    return side === 'BUY' ? (q.ask + slip) : (q.bid - slip);
    // (For limit/stop orders you could add separate helpers later.)
  }

  feeEstimate(qty: number): number {
    // Simple, transparent: $0.005/share
    return 0.005 * Math.max(0, qty|0);
  }

  /** misc helpers */
  price(sym: string) { const r = this.bySym(sym); return r ? r.price : 100; }
  addToUniverse(sym: string) {
    const S = String(sym || '').trim().toUpperCase();
    if (!S) return;
    if (!this.bySym(S)) {
      const r = simState.r;
      const sector = sectors[Math.floor(r()*sectors.length)];
      const base = 10 + Math.floor(r()*290);
      const price = base + r()*base*0.2;
      const shares = 50e6 + Math.floor(r()*950e6);
      const bars = Array.from({ length: 24 }, () => Math.max(0.05, Math.min(1, 0.4 + (r()-0.5)*0.2 )));
      simState.rows.push({
        symbol: S, name: `${sector} Co`, sector, shares, price,
        ema200: price, lastClose: price, changesPct: 0,
        drift: 0.0002 + r()*0.0006, vol: 0.012 + r()*0.03, beta: 0.5 + r()*0.7, bars,
      });
    }
    if (!this.watchlist.includes(S)) this.watchlist = [S, ...this.watchlist].slice(0, 50);
    this.persist(); this.emit();
  }

  /** paper trading (market orders with realistic fill + fee) */
  buy(sym: string, qty: number) {
    const S = String(sym || '').trim().toUpperCase();
    const q = Math.max(1, Math.floor(Number(qty) || 0));
    const fill = this.worstCaseFill('BUY', S, q);
    const fee = this.feeEstimate(q);
    const cost = fill * q + fee;

    if (!isFinite(fill) || fill <= 0) return { ok: false, reason: 'No quote for symbol.' };
    if (cost > this.paper.cash + 1e-8) return { ok: false, reason: 'Insufficient cash.' };

    this.paper.cash -= cost;
    const i = this.paper.positions.findIndex(p => p.symbol === S);
    if (i >= 0) {
      const p = this.paper.positions[i];
      const newQty = p.qty + q;
      const newAvg = (p.avgPrice * p.qty + fill * q) / Math.max(1, newQty);
      this.paper.positions[i] = { ...p, qty: newQty, avgPrice: newAvg, last: fill, pnl: (fill - newAvg) * newQty };
    } else {
      this.paper.positions.push({ symbol: S, qty: q, avgPrice: fill, last: fill, pnl: 0 });
    }
    this.paper.orders.unshift({
      id: `${Date.now()}.${Math.random().toString(36).slice(2,6)}`,
      side: 'BUY', symbol: S, qty: q, price: fill, fee, ts: Date.now()
    });
    this.persist(); this.emit();
    return { ok: true, fillPrice: fill, fee };
  }

  sell(sym: string, qty: number) {
    const S = String(sym || '').trim().toUpperCase();
    const i = this.paper.positions.findIndex(p => p.symbol === S);
    if (i < 0) return { ok: false, reason: 'No position to sell.' };

    const p = this.paper.positions[i];
    const q = Math.max(1, Math.min(p.qty, Math.floor(Number(qty) || 0)));
    if (q <= 0) return { ok: false, reason: 'Quantity must be > 0.' };

    const fill = this.worstCaseFill('SELL', S, q);
    const fee = this.feeEstimate(q);
    if (!isFinite(fill) || fill <= 0) return { ok: false, reason: 'No quote for symbol.' };

    const proceeds = fill * q;
    this.paper.cash += Math.max(0, proceeds - fee);

    const rem = p.qty - q;
    if (rem <= 0) this.paper.positions.splice(i, 1);
    else this.paper.positions[i] = { ...p, qty: rem, last: fill, pnl: (fill - p.avgPrice) * rem };

    this.paper.orders.unshift({
      id: `${Date.now()}.${Math.random().toString(36).slice(2,6)}`,
      side: 'SELL', symbol: S, qty: q, price: fill, fee, ts: Date.now()
    });
    this.persist(); this.emit();
    return { ok: true, fillPrice: fill, fee };
  }

  resetPaper(start: number) {
    const n = Math.max(1000, Number(start) || DEFAULT_PAPER_CASH);
    this.paper = { cash: n, startingCash: n, positions: [], orders: [] };
    this.persist(); this.emit();
  }

  /** internals */
  private bySym(symbol: string) {
    const S = String(symbol || '').trim().toUpperCase();
    return simState.rows.find(r => r.symbol === S) || null;
  }
  private markPositions() {
    for (let i = 0; i < this.paper.positions.length; i++) {
      const p = this.paper.positions[i];
      const px = this.price(p.symbol);
      this.paper.positions[i] = { ...p, last: px, pnl: (px - p.avgPrice) * p.qty };
    }
  }
})();

export default Sim;
