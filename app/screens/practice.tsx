import Sim, { DEFAULT_PAPER_CASH, Opportunity } from '@/lib/sim';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const PAPER_ENABLED_KEY = 'paper.enabled';

type Quote = {
  bid: number;
  ask: number;
  last: number;
  spread?: number;
  session?: 'RTH' | 'PRE' | 'POST';
};

type PagerAwareProps = {
  isActive?: boolean;
  isSwiping?: boolean;
  setPagerSwipeEnabled?: (enabled: boolean) => void;
};

// ---------- tiny utils ----------
const fmtUSD = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;
const clampNum = (n: any, fallback = 0) => (Number.isFinite(Number(n)) ? Number(n) : fallback);

async function safeStoreGet(key: string) {
  try {
    const ok = await SecureStore.isAvailableAsync();
    if (!ok) return null;
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}
async function safeStoreSet(key: string, val: string) {
  try {
    const ok = await SecureStore.isAvailableAsync();
    if (!ok) return;
    await SecureStore.setItemAsync(key, val);
  } catch {}
}

/* ---------- Local inline header ---------- */
function LocalHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
}: {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
}) {
  return (
    <View style={{ marginTop: 6, marginBottom: 6, flexDirection: 'row', alignItems: 'center' }}>
      {showBack && (
        <TouchableOpacity
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ marginRight: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Back"
          activeOpacity={0.9}
        >
          <Text style={{ fontSize: 28, lineHeight: 28, fontWeight: '900', color: '#0f172a' }}>{'‹'}</Text>
        </TouchableOpacity>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#0f172a' }}>{title}</Text>
        {subtitle ? <Text style={{ color: '#475569', marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

/* ------------- Consistently aligned “i” messages ------------- */
type InfoSection = { heading?: string; items: string[] };
function showInfo(title: string, sections: InfoSection[], footer?: string) {
  const lines: string[] = [];
  sections.forEach((section, idx) => {
    if (idx > 0) lines.push('');           // exactly one blank line between sections
    if (section.heading) lines.push(section.heading);
    section.items.forEach(item => lines.push(`• ${item}`));
  });
  if (footer) {
    lines.push('');
    lines.push(footer);
  }
  Alert.alert(title, lines.join('\n'));
}

export default function PracticeScreen({
  isActive = true,
  isSwiping = false,
  setPagerSwipeEnabled,
}: PagerAwareProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lastTs, setLastTs] = useState<number | null>(null);

  const [paperEnabled, setPaperEnabled] = useState(false);
  const [startCash, setStartCash] = useState(String(DEFAULT_PAPER_CASH));
  const [symbol, setSymbol] = useState('');
  const [qty, setQty] = useState('10');

  // calculators (user-entered)
  const [acct, setAcct] = useState('10000');
  const [riskPct, setRiskPct] = useState('1');
  const [entry, setEntry] = useState('100');
  const [stop, setStop] = useState('95');
  const [rMult, setRMult] = useState('2');

  // ----- Sticky Quick Ticket symbol: auto-seed ONCE only -----
  const symbolRef = useRef(symbol);
  const didAutoSeedSymbol = useRef(false);
  useEffect(() => { symbolRef.current = symbol; }, [symbol]);

  const seedSymbolOnce = useCallback((snap: Opportunity[]) => {
    if (!didAutoSeedSymbol.current && !symbolRef.current && snap.length) {
      setSymbol(snap[0].symbol);
      didAutoSeedSymbol.current = true; // prevent future auto-seeding
    }
  }, []);

  // ---- helpers that feature-detect enhanced Sim engine ----------------------
  const getQuote = useMemo(() => {
    const anySim = Sim as any;
    if (typeof anySim.quote === 'function') {
      return (sym: string): Quote | null => {
        try {
          const q = anySim.quote(sym);
          if (!q) return null;
          return {
            bid: Number(q.bid ?? q.last ?? 0),
            ask: Number(q.ask ?? q.last ?? 0),
            last: Number(q.last ?? 0),
            spread: Number(q.spread ?? Math.max(0, Number(q.ask ?? 0) - Number(q.bid ?? 0))),
            session: q.session,
          };
        } catch {
          return null;
        }
      };
    }
    return (sym: string): Quote | null => {
      const o = opps.find(x => x.symbol?.toUpperCase() === sym?.toUpperCase());
      if (!o) return null;
      const p = Number(o.price) || 0;
      const spread = Math.max(0.01, Math.min(0.02 * p, 0.25));
      return { bid: Math.max(0, p - spread / 2), ask: p + spread / 2, last: p, spread, session: 'RTH' };
    };
  }, [opps]);

  const estimateFees = useCallback((qtyNum: number) => {
    const anySim = Sim as any;
    try {
      if (typeof anySim.feeEstimate === 'function') {
        return Number(anySim.feeEstimate(qtyNum) || 0);
      }
      const perShare = 0.005; // $0.005/share
      const flat = 0.0;
      return flat + perShare * Math.max(0, qtyNum);
    } catch {
      return 0;
    }
  }, []);

  const worstCaseFill = useCallback((side: 'BUY' | 'SELL', sym: string, qtyNum: number) => {
    const anySim = Sim as any;
    try {
      if (typeof anySim.worstCaseFill === 'function') {
        const v = anySim.worstCaseFill(side, sym, qtyNum);
        if (typeof v === 'number' && isFinite(v)) return v;
      }
    } catch {}
    const q = getQuote(sym);
    if (!q) return NaN;
    const slip = (q.spread ?? 0.02) * 0.25;
    return side === 'BUY' ? q.ask + slip : q.bid - slip;
  }, [getQuote]);
  // --------------------------------------------------------------------------

  // Derived risk values
  const rDollars = useMemo(
    () => Math.max(0, (Number(acct) || 0) * (Math.max(0, Number(riskPct) || 0) / 100)),
    [acct, riskPct]
  );

  // Stable: derive from user's typed Entry (no live-tick wobble)
  const worstEntryLong = useMemo(() => Number(entry) || 0, [entry]);

  const perShareRisk = useMemo(
    () => Math.max(0, (worstEntryLong || 0) - (Number(stop) || 0)),
    [worstEntryLong, stop]
  );

  const recShares = useMemo(
    () => (perShareRisk > 0 ? Math.floor(rDollars / perShareRisk) : 0),
    [rDollars, perShareRisk]
  );

  const target = useMemo(
    () => (perShareRisk > 0 ? (worstEntryLong || 0) + (Number(rMult) || 0) * perShareRisk : 0),
    [worstEntryLong, rMult, perShareRisk]
  );

  useEffect(() => {
    const unsub = Sim.on?.(() => {
      const snap = Sim.snapshot();
      setOpps(snap);
      seedSymbolOnce(snap); // auto-seed only once
    });

    (async () => {
      await Sim.load();
      const enabled = await safeStoreGet(PAPER_ENABLED_KEY);
      setPaperEnabled(enabled === '1');
      const snap = Sim.snapshot();
      setOpps(snap);
      seedSymbolOnce(snap); // auto-seed only once
    })();

    const tick = setInterval(() => {
      Sim.tickAll?.();
      setLastTs(Date.now());
    }, 4000);

    return () => {
      clearInterval(tick);
      if (typeof unsub === 'function') unsub();
    };
  }, [seedSymbolOnce]);

  useEffect(() => {
    (async () => {
      await safeStoreSet(PAPER_ENABLED_KEY, paperEnabled ? '1' : '0');
    })();
  }, [paperEnabled]);

  const equity = useMemo(() => {
    const anySim = Sim as any;
    const pos = anySim.paper?.positions || [];
    const posVal = pos.reduce((s: number, p: any) => s + (Number(p.qty) || 0) * (Number(p.last ?? p.price ?? 0) || 0), 0);
    return (anySim.paper?.cash || 0) + posVal;
  }, [opps, lastTs]);

  const refresh = useCallback(() => {
    if (isScanning) return;
    setIsScanning(true);
    Sim.tickAll?.();
    setOpps(Sim.snapshot());
    setLastTs(Date.now());
    setTimeout(() => setIsScanning(false), 400);
  }, [isScanning]);

  const place = useCallback((side: 'BUY' | 'SELL', s?: string, q?: number) => {
    if (!paperEnabled) {
      Alert.alert('Paper Trading Off', 'Turn ON Paper Trading to place simulated orders.');
      return;
    }
    const sym = (s || symbol).trim().toUpperCase();
    const qtyNum = clampNum(q ?? qty, NaN);
    if (!sym || !Number.isFinite(qtyNum) || qtyNum <= 0) return;

    const fillEst = worstCaseFill(side, sym, qtyNum);
    const fees = estimateFees(qtyNum);

    if (Number.isFinite(fillEst) && side === 'BUY') {
      const cost = fillEst * qtyNum + fees;
      const cash = (Sim as any).paper?.cash ?? 0;
      if (cost > cash + 1e-6) {
        Alert.alert('Insufficient Cash', 'Reduce quantity or reset starting cash.');
        return;
      }
    }

    try {
      const res: any = side === 'BUY' ? (Sim as any).buy(sym, qtyNum) : (Sim as any).sell(sym, qtyNum);
      if (res && typeof res === 'object' && res.ok === false) {
        Alert.alert('Order Rejected', String(res.reason || 'Order could not be placed.'));
      }
    } catch (e: any) {
      Alert.alert('Order Error', e?.message || 'There was a problem placing your order.');
    }
  }, [paperEnabled, symbol, qty, estimateFees, worstCaseFill]);

  // Flatten all open positions (paper)
  const flattenAll = useCallback(() => {
    if (!paperEnabled) return;
    const pos = ((Sim as any).paper?.positions || []) as any[];
    if (!pos.length) {
      Alert.alert('No Positions', 'There are no open positions to close.');
      return;
    }
    Alert.alert(
      'Flatten All?',
      'Close all open simulated positions at current prices?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Flatten',
          style: 'destructive',
          onPress: () => {
            pos.forEach((p) => {
              const q = Number(p.qty || 0);
              if (q > 0) (Sim as any).sell?.(p.symbol, q);
              else if (q < 0) (Sim as any).buy?.(p.symbol, Math.abs(q));
            });
            setLastTs(Date.now());
          },
        },
      ]
    );
  }, [paperEnabled]);

  // quick risk check
  const quickQty = Number(qty) || 0;
  const quickMaxLoss = perShareRisk * quickQty + estimateFees(quickQty);
  const withinRisk = quickMaxLoss <= rDollars && quickMaxLoss > 0;

  // ---- Info popups (clean, aligned content) ----------------------
  const onInfo = useCallback((key: string) => {
    if (key === 'learn') {
      showInfo('Learn & Review', [
        { heading: 'Where to start', items: [
          'Lessons — short modules from basics to playbooks.',
          'Journal — log setup, trigger, stop/target, size (R), emotions.',
          'Progress — streaks, quiz accuracy/coverage, badges.',
        ]},
        { heading: 'Goal', items: [
          'Build repeatable habits (risk-first, notes, review).',
        ]},
      ], 'Ask the in-app AI any questions—concepts, sizing math, or “what did I miss?”.');
    } else if (key === 'market') {
      showInfo('Simulated Market', [
        { heading: 'What you see', items: [
          'Price & % — last trade and day change.',
          'Score (0–30) — practice ranking based on trend & momentum.',
          'Mini bars — compact recent price history.',
        ]},
        { heading: 'Actions', items: [
          'Buy — simulate a 1-share market buy.',
          'Prefill — copy the symbol into the Quick Ticket.',
          'Refresh — nudge a price update (auto refresh also runs).',
        ]},
        { heading: 'Reality notes', items: [
          'Fills approximate bid/ask with small slippage.',
          'Spreads may widen pre/post-market; liquidity varies.',
          'Score is an educational heuristic, not a signal.',
        ]},
      ], 'Use the feed to rehearse process, not to predict moves.');
    } else if (key === 'ticket') {
      showInfo('Quick Ticket (Simulation)', [
        { heading: 'Steps', items: [
          'Type symbol (e.g., AAPL). “Normalize Ticker” fixes case/spaces.',
          'Enter quantity.',
          'Tap Buy/Sell — submits a simulated market order (paper ON).',
        ]},
        { heading: 'Safety check', items: [
          'Use Pre-Trade Risk Check to confirm size fits your 1R.',
          'Tighten stop or reduce qty if risk > 1R.',
        ]},
      ]);
    } else if (key === 'paper') {
      showInfo('Paper Trading', [
        { heading: 'What it does', items: [
          'Tracks simulated cash, positions, and P&L.',
          'Lets you practice execution without risking money.',
        ]},
        { heading: 'Controls', items: [
          'Enable — toggle simulation on/off.',
          'Starting Cash — set your practice balance.',
          'Current Cash / Equity — live balances in sim.',
          'Reset Account — clears positions; applies new start.',
          'Flatten All — closes every open simulated position.',
        ]},
        { heading: 'Good practice', items: [
          'Treat it like real: obey stops, size by 1R, journal every trade.',
          'Pause when you hit your daily max loss (e.g., 3R).',
        ]},
      ], 'Build discipline here—your live rules should feel routine first.');
    } else if (key === 'sizing') {
      showInfo('Position Sizing · Risk “R”', [
        { heading: 'Key ideas', items: [
          '1R = dollars you’re willing to lose if the stop hits.',
          'Per-share risk = worst-case entry − stop.',
          'Shares ≈ 1R ÷ per-share risk.',
          'Targets in R (e.g., first scale at 2R).',
        ]},
        { heading: 'Example', items: [
          '$10,000 at 1% → 1R = $100; stop $5 away → ~20 shares.',
        ]},
        { heading: 'Guardrails', items: [
          'Use a daily max loss (e.g., 3R) to avoid tilt.',
        ]},
      ], 'Consistency in 1R beats occasional oversized wins.');
    } else if (key === 'risk') {
      showInfo('Pre-Trade Risk Check', [
        { heading: 'What it does', items: [
          'Estimates max loss at your stop for the ticket size (incl. fees).',
          'Compares that to your 1R from Position Sizing.',
        ]},
        { heading: 'How to read it', items: [
          'Green = within 1R.',
          'Red = exceeds 1R → reduce shares or tighten stop.',
        ]},
        { heading: 'Before you submit', items: [
          'Confirm setup → trigger → stop → targets.',
          'Journal the plan so you can grade adherence later.',
        ]},
      ], 'Great trades start with controlled downside.');
    }
  }, []);
  // ----------------------------------------------------------------

  // positions (optional UI if your engine exposes them)
  const anySim = Sim as any;
  const positions: any[] = Array.isArray(anySim.paper?.positions) ? anySim.paper.positions : [];

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: Math.max(20, insets.bottom + 20),
          }}
          keyboardShouldPersistTaps="handled"
        >
          <LocalHeader
            title="Practice Trading"
            subtitle="Simulated market. Size by R. Journal every trade."
          />

          {/* Learn & Review */}
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.cardTitle}>Learn & Review</Text>
              <InfoDot onPress={() => onInfo('learn')} />
            </View>
            <View style={styles.segmentBar}>
              <NavButton label="Lessons" onPress={() => router.push('/simtrading/learn')} />
              <NavButton label="Journal"  onPress={() => router.push('/simtrading/journal')} />
              <NavButton label="Progress" onPress={() => router.push('/simtrading/progress')} />
            </View>
          </View>

          {/* Simulated Market */}
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.cardTitle}>Simulated Market</Text>
              <View style={{ flexDirection: 'row', gap: 65 }}>
                <InfoDot onPress={() => onInfo('market')} />
                <TouchableOpacity onPress={refresh} style={styles.smallBtn} activeOpacity={0.85}>
                  <Text style={styles.smallBtnText}>{isScanning ? '…' : 'Refresh'}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={{ color: '#64748b', marginBottom: 6 }}>
              {lastTs ? `Updated ${new Date(lastTs).toLocaleTimeString()}` : 'Auto-updates every few seconds'}
            </Text>
            <Text style={{ color: '#64748b', marginBottom: 10 }}>
              Tap <Text style={{ fontWeight: '700', color: '#0f172a' }}>Buy</Text> to simulate. Tap{' '}
              <Text style={{ fontWeight: '700', color: '#0f172a' }}>Prefill</Text> to copy the symbol to the ticket.
            </Text>

            {opps.slice(0, 10).map((o) => (
              <View key={o.symbol} style={styles.oppRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.oppTopLine}>
                    <Text style={styles.sym}>{o.symbol}</Text>
                    <Text style={styles.price} numberOfLines={1}>{fmtUSD(o.price)}</Text>
                    <Text style={[styles.pct, { color: o.changePct >= 0 ? '#16a34a' : '#dc2626' }]} numberOfLines={1}>
                      {o.changePct >= 0 ? '▲' : '▼'} {o.changePct.toFixed(2)}%
                    </Text>
                    <View style={styles.score}><Text style={styles.scoreText}>Score {Math.round(o.score)}</Text></View>
                  </View>
                  <MiniBars data={o.bars} />
                </View>
                <View style={styles.oppCtas}>
                  <TouchableOpacity
                    disabled={!paperEnabled}
                    onPress={() => { didAutoSeedSymbol.current = true; setSymbol(o.symbol); place('BUY', o.symbol, 1); }}
                    style={[styles.actionBtn, styles.actionBuy, !paperEnabled && { opacity: 0.5 }]}
                  >
                    <Text style={styles.actionText}>Buy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { didAutoSeedSymbol.current = true; setSymbol(o.symbol); }}
                    style={[styles.actionBtn, styles.actionPrefill]}
                  >
                    <Text style={styles.actionText}>Prefill</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <Text style={{ color: '#64748b', marginTop: 8 }}>Simulated data for learning.</Text>
          </View>

          {/* Quick Ticket */}
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.cardTitle}>Quick Ticket (Simulation)</Text>
              <InfoDot onPress={() => onInfo('ticket')} />
            </View>
            <View style={styles.rowWrap}>
              <KV label="Symbol">
                <Input
                  value={symbol}
                  onChangeText={(t: string) => { didAutoSeedSymbol.current = true; setSymbol(t); }}
                  autoCapitalize="characters"
                />
              </KV>
              <KV label="Qty"><Input value={qty} onChangeText={(t: string) => setQty(t)} keyboardType="number-pad" /></KV>
            </View>
            <View style={styles.ticketButtons}>
              <SmallPill onPress={() => place('BUY')}  disabled={!paperEnabled} style={styles.pillBuy}  label="Buy" />
              <SmallPill onPress={() => place('SELL')} disabled={!paperEnabled} style={styles.pillSell} label="Sell" />
              <SmallPill onPress={() => symbol && setSymbol(symbol.trim().toUpperCase())} label="Normalize Ticker" />
            </View>
            {!paperEnabled && <Text style={{ color: '#64748b', marginTop: 8 }}>Enable Paper Trading below to place simulated orders.</Text>}
          </View>

          {/* Paper Trading */}
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.cardTitle}>Paper Trading</Text>
              <InfoDot onPress={() => onInfo('paper')} />
            </View>
            <View style={styles.row}><Text style={styles.key}>Enable</Text><Switch value={paperEnabled} onValueChange={setPaperEnabled} /></View>

            {paperEnabled && (
              <>
                <View style={styles.rowWrap}>
                  <KV label="Starting Cash ($)"><Input value={startCash} onChangeText={(t: string) => setStartCash(t)} keyboardType="number-pad" /></KV>
                  <KV label="Current Cash"><Text style={styles.val}>{fmtUSD((Sim as any).paper?.cash || 0)}</Text></KV>
                  <KV label="Equity"><Text style={styles.val}>{fmtUSD(equity)}</Text></KV>
                </View>
                <View style={styles.ticketButtons}>
                  <SmallPill
                    onPress={() => (Sim as any).resetPaper?.(Math.max(1000, Number(startCash) || DEFAULT_PAPER_CASH))}
                    label="Reset Account"
                  />
                  <SmallPill onPress={flattenAll} style={styles.pillDanger} label="Flatten All" />
                </View>
              </>
            )}
          </View>

          {/* Position Sizing (Risk “R”) */}
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.cardTitle}>Position Sizing · Risk “R”</Text>
            <InfoDot onPress={() => onInfo('sizing')} />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['0.5', '1', '2'].map(p => (
                  <TouchableOpacity key={p} onPress={() => setRiskPct(p)} style={[styles.chip, riskPct === p && styles.chipActive]}>
                    <Text style={[styles.chipText, riskPct === p && styles.chipTextActive]}>{p}%</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ color:'#334155', fontWeight:'800' }}>1R = {fmtUSD(rDollars)}</Text>
            </View>

            <View style={styles.rowWrap}>
              <KV label="Account ($)"><Input value={acct} onChangeText={(t: string) => setAcct(t)} keyboardType="decimal-pad" /></KV>
              <KV label="Risk / Trade (%)"><Input value={riskPct} onChangeText={(t: string) => setRiskPct(t)} keyboardType="decimal-pad" /></KV>
              <KV label="Entry ($)"><Input value={entry} onChangeText={(t: string) => setEntry(t)} keyboardType="decimal-pad" /></KV>
              <KV label="Stop ($)"><Input value={stop} onChangeText={(t: string) => setStop(t)} keyboardType="decimal-pad" /></KV>
              <KV label="Target (R)"><Input value={rMult} onChangeText={(t: string) => setRMult(t)} keyboardType="decimal-pad" /></KV>
            </View>

            <RowKV label="Risk $ per trade" value={fmtUSD(rDollars)} />
            <RowKV label="Per-share risk" value={perShareRisk > 0 ? fmtUSD(perShareRisk) : '—'} />
            <RowKV label="Recommended shares" value={recShares > 0 ? String(recShares) : '—'} />
            <RowKV label="Target price (approx)" value={target > 0 ? fmtUSD(target) : '—'} />

            <Text style={{ color: '#64748b', marginTop: 8, lineHeight: 18 }}>
              <Text style={{ fontWeight: '700', color: '#0f172a' }}>What is “R”?</Text> It’s your <Text style={{ fontWeight: '700' }}>dollars at risk</Text> on one trade.
              Example: 1% of a $10,000 account = $100 (1R). If stop is $5 away, size ≈ $100 ÷ $5 = 20 shares.
            </Text>
          </View>

          {/* Pre-Trade Risk Check */}
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.cardTitle}>Pre-Trade Risk Check</Text>
              <InfoDot onPress={() => onInfo('risk')} />
            </View>
            <RowKV label="Ticket symbol / qty" value={`${symbol || '—'} · ${Number(qty) || '—'}`} />
            <RowKV label="Max loss at stop" value={perShareRisk > 0 && Number(qty) > 0 ? fmtUSD(quickMaxLoss) : '—'} />
            <RowKV label="Allowed by 1R" value={rDollars > 0 ? fmtUSD(rDollars) : '—'} />
            <Text style={{ marginTop: 6, fontWeight: '800', color: withinRisk ? '#16a34a' : '#dc2626' }}>
              {withinRisk ? 'Within your 1R risk.' : 'Exceeds your 1R risk—reduce size or tighten stop.'}
            </Text>
          </View>

          {/* Open Positions (optional) */}
          {paperEnabled && positions.length > 0 && (
            <View style={styles.card}>
              <View style={styles.headerRow}>
                <Text style={styles.cardTitle}>Open Positions</Text>
              </View>
              {positions.map((p: any) => {
                const avg = Number(p.avg ?? p.average ?? 0);
                const last = Number(p.last ?? p.price ?? 0);
                const q = Number(p.qty ?? 0);
                const upnl = (last - avg) * q;
                return (
                  <View key={p.symbol} style={[styles.row, { paddingVertical: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '900', color: '#0f172a' }}>{p.symbol}</Text>
                      <Text style={{ color: '#334155' }}>
                        {q} @ {fmtUSD(avg)} · Last {fmtUSD(last)} · P&L {fmtUSD(upnl)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      disabled={!paperEnabled}
                      onPress={() => {
                        if (q === 0) return;
                        if (q > 0) (Sim as any).sell?.(p.symbol, q);
                        else (Sim as any).buy?.(p.symbol, Math.abs(q));
                      }}
                      style={[styles.smallBtn, { backgroundColor: '#ef4444' }]}
                    >
                      <Text style={styles.smallBtnText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {/* Getting Started */}
          <View style={styles.card}>
            <Text style={[styles.cardTitle, { marginBottom: 6 }]}>Getting Started</Text>
            <Text style={{ color:'#334155', marginTop: 4 }}>{'\u2022'} Take the 5 intro lessons (Learn → Lessons).</Text>
            <Text style={{ color:'#334155', marginTop: 4 }}>{'\u2022'} Use Quick Ticket to place a few paper trades.</Text>
            <Text style={{ color:'#334155', marginTop: 4 }}>{'\u2022'} Journal each trade (why entry, stop/target, emotions).</Text>
            <Text style={{ color:'#334155', marginTop: 4 }}>{'\u2022'} Use Position Sizing so every trade risks ≤ 1R.</Text>
          </View>

          <Text style={{ color: '#475569', marginTop: 14, fontSize: 12 }}>
            Educational use only. Not investment advice. Market data is simulated. Trading involves risk.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/* small atoms */
function KV({ label, children }: any) {
  return (
    <View style={{ width: '48%', marginTop: 8 }}>
      <Text style={styles.key}>{label}</Text>
      <View style={{ marginTop: 6 }}>{children}</View>
    </View>
  );
}
function Input(props: any) {
  return (
    <TextInput
      {...props}
      // Prefer onChangeText to avoid RN event wrappers
      onChangeText={(t) => (props.onChangeText ? props.onChangeText(t) : props.onChange?.(t))}
      style={[styles.input, props.style]}
      placeholder={props.placeholder || 'ex. value'}
      onFocus={(e) => {
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        props.onBlur?.(e);
      }}
      autoCapitalize={props.autoCapitalize}
      keyboardType={props.keyboardType}
    />
  );
}
function RowKV({ label, value }: any) {
  return (
    <View style={styles.row}>
      <Text style={styles.key}>{label}</Text>
      <Text style={styles.val}>{value}</Text>
    </View>
  );
}
function SmallPill({ label, onPress, style, disabled }: { label: string; onPress: () => void; style?: any; disabled?: boolean; }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.85}
      style={[styles.smallPill, style, disabled && { opacity: 0.5 }]}>
      <Text style={styles.smallPillText}>{label}</Text>
    </TouchableOpacity>
  );
}
function MiniBars({ data }: { data: number[] }) {
  const d = data?.length ? data : [0.2, 0.5, 0.8, 0.4, 0.7, 1, 0.6, 0.3];
  return (
    <View style={styles.miniBars} accessibilityRole="image" accessibilityLabel="Mini price history bars">
      {d.map((v, i) => (
        <View key={String(i)} style={{ width: 6, height: 34 * Math.max(0.05, Math.min(1, Number(v) || 0)), backgroundColor: '#94a3b8', borderRadius: 2, marginRight: 2 }} />
      ))}
    </View>
  );
}
function InfoDot({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} accessibilityRole="button" accessibilityLabel="Section info"
      style={styles.infoDot} activeOpacity={0.85}>
      <Text style={styles.infoDotText}>i</Text>
    </TouchableOpacity>
  );
}
function NavButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.navBtn}>
      <Text style={styles.navBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 12,
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },

  segmentBar: { flexDirection: 'row', gap: 10, marginTop: 2 },
  navBtn: {
    flex: 1,
    backgroundColor: '#cbd5e1',   // darker for contrast
    borderRadius: 30,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#94a3b8',       // darker border as well
  },
  navBtnText: { fontWeight: '800', color: '#0f172a' },

  infoDot: {
    height: 20, width: 20, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#e2e8f0', borderWidth: 1, borderColor: '#cbd5e1',
  },
  infoDotText: { color:'#0f172a', fontWeight:'800', fontSize: 11, lineHeight: 12 },

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  input: {
    backgroundColor: '#fff',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: Platform.select({ ios: 10, android: 6 }),
    minWidth: 70,
    color: '#0f172a',
  },
  key: { color: '#334155', fontWeight: '600' },
  val: { color: '#0f172a', fontWeight: '700' },

  oppRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  oppTopLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  sym: { fontWeight: '900', color: '#0f172a', marginRight: 8, width: 46 },
  price: { color: '#334155', fontWeight: '700', marginRight: 8, flexShrink: 1 },
  pct: { fontWeight: '700', marginRight: 6 },
  score: { backgroundColor: '#0f172a', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  scoreText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  oppCtas: { gap: 6, marginLeft: 6, width: 110 },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, alignItems: 'center' },
  actionBuy: { backgroundColor: '#0284c7' },    // darker than before
  actionPrefill: { backgroundColor: '#475569' },// darker than before
  actionText: { color: '#fff', fontWeight: '800' },

  smallBtn: { backgroundColor: '#475569', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 }, // darker
  smallBtnText: { color: '#fff', fontWeight: '800' },
  ticketButtons: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' },
  smallPill: { backgroundColor: '#0f172a', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999 },
  smallPillText: { color: '#fff', fontWeight: '800' },
  pillBuy: { backgroundColor: '#0284c7' },  // darker Buy
  pillSell: { backgroundColor: '#dc2626' }, // darker Sell
  pillLight: { backgroundColor: '#475569' },// (kept if needed elsewhere)
  pillDanger: { backgroundColor: '#ef4444' }, // Flatten All

  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: '#eef2f7', borderWidth: 1, borderColor: '#d6dee8' },
  chipActive: { backgroundColor: '#d9e4f5', borderColor: '#b8c9e6' },
  chipText: { fontWeight: '800', color: '#334155' },
  chipTextActive: { color: '#0f172a' },

  miniBars: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 8, height: 36 },
});
