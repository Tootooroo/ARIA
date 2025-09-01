import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const LEARN_STATE_KEY = 'learn.state.v4';

type LearnState = {
  completed: string[];
  quizCorrectCount: number;
  quizTotalAnswered: number;
  quizCorrectIds: string[];
  streak: number;
  lastDay: string;
};

type Lesson = {
  id: string;
  title: string;
  bullets: string[];
  duration: string;
  informational?: boolean;
};

/* ----------------------- CURRICULUM ----------------------- */
const LESSONS: Lesson[] = [
  { id: 'accounts-basics', title: 'Accounts & Basics', bullets: ['Cash vs Margin', 'PDT rule', 'Settlement (T+2)'], duration: '6 min', informational: true },
  { id: 'order-types',     title: 'Order Types',       bullets: ['Market vs Limit', 'Stop & Stop-limit', 'Slippage'], duration: '8 min' },
  // broadened to include halts explicitly
  { id: 'tif-micro',       title: 'Time-in-Force & Microstructure', bullets: ['DAY vs GTC', 'Bid/Ask depth', 'Auctions & halts'], duration: '7 min' },
  { id: 'price-drivers',   title: 'What Moves Prices', bullets: ['Earnings & guidance', 'Macro (CPI/FOMC/rates)', 'Rotation/Liquidity'], duration: '8 min', informational: true },
  { id: 'charts-101',      title: 'Chart Reading 101', bullets: ['Trends (HH/HL)', 'S/R zones', 'VWAP & gaps'], duration: '10 min' },
  { id: 'indicators-tools',title: 'Indicators & Tools', bullets: ['MAs 20/50/200', 'ATR sizing', 'Anchors (VWAP)'], duration: '7 min', informational: true },
  { id: 'risk-first',      title: 'Risk First',        bullets: ['Define 1R', 'Size from stop', 'Expectancy & daily cap'], duration: '10 min' },
  { id: 'playbooks',       title: 'Simple Playbooks',  bullets: ['Breakout', 'Pullback', 'Range', 'Management'], duration: '12 min' },
  { id: 'plan-trade',      title: 'Plan the Trade',    bullets: ['Setup→Trigger→Stop→Targets', 'R-multiples', 'Checklists'], duration: '9 min' },
  { id: 'execution',       title: 'Execution & Fills', bullets: ['Route/spread impact', 'Premkt/Post', 'Partial fills'], duration: '8 min' },
  { id: 'journaling',      title: 'Journaling That Works', bullets: ['What to log', 'AAR loop', 'Grade adherence'], duration: '7 min', informational: true },
  { id: 'psychology',      title: 'Psychology & Common Mistakes', bullets: ['FOMO/tilt', 'Rule breaks', 'Recovery protocol'], duration: '8 min', informational: true },
];

const LESSON_IDS = new Set(LESSONS.map(l => l.id));

type QuizItem = {
  id: string;
  q: string;
  choices: string[];
  a: number;
  explain: string; // when correct
  hint: string;    // when wrong
};

const QUIZ: QuizItem[] = [
  { id: 'q1',  q: 'What is 1R?', choices: ['1% of portfolio', 'Dollar risk per trade', 'One ATR', 'One day return'], a: 1, explain: 'R is the dollars you’ll lose if the stop hits on this trade.', hint: 'Think “per-trade dollar risk”, not a percent.' },
  { id: 'q2',  q: 'A limit buy order…', choices: ['Executes at any price', 'Executes at limit or better', 'Guarantees a fill', 'Only works after hours'], a: 1, explain: 'Limit enforces a max price; it may not fill.', hint: 'Which one caps the price you’ll pay?' },
  { id: 'q3',  q: 'ATR rises. Position size should…', choices: ['Increase', 'Decrease', 'Stay the same', 'Always go short'], a: 1, explain: 'Higher volatility → fewer shares to keep risk ≈ constant.', hint: 'Each share moves more when ATR is higher.' },
  { id: 'q4',  q: 'Stop-loss orders are mainly for…', choices: ['Maximizing gains', 'Capping losses', 'Only shorting', 'Getting rebates'], a: 1, explain: 'Stops cap downside when invalidation triggers.', hint: 'Which tool protects 1R from blowing up?' },
  { id: 'q5',  q: 'Largest single-day moves most often follow…', choices: ['Rumors', 'Earnings & guidance surprises', 'Holidays', 'Ticker length'], a: 1, explain: 'Earnings & guidance reprice forward expectations fastest.', hint: 'Which event updates outlook immediately?' },
  { id: 'q6',  q: 'Bid $10.00, Ask $10.06. Spread is…', choices: ['$0.01', '$0.03', '$0.06', '$0.07'], a: 2, explain: 'Ask − Bid = $0.06.', hint: 'Subtract bid from ask.' },
  { id: 'q7',  q: 'GTC means…', choices: ['Good To Close', 'Good Till Canceled', 'Go To Cash', 'Great Trade Confirmed'], a: 1, explain: 'Persists until filled/canceled.', hint: 'Which one survives overnight?' },
  { id: 'q8',  q: 'MA(50) crossing above MA(200) suggests…', choices: ['Bullish bias', 'Bearish bias', 'No info', 'Guaranteed rally'], a: 0, explain: 'Golden cross = bullish bias, not certainty.', hint: 'It’s about bias, not guarantees.' },
  { id: 'q9',  q: 'Risk 1% on $5,000. 1R equals…', choices: ['$5', '$50', '$500', '$5,000'], a: 1, explain: '1% × 5,000 = $50.', hint: 'Compute 1/100 of $5,000.' },
  { id: 'q10', q: 'A pullback playbook usually buys…', choices: ['Breakdowns', 'After a dip to support', 'Randomly', 'Only after earnings'], a: 1, explain: 'Buy higher-low into support with a trigger.', hint: 'Think “buy the dip” in an uptrend.' },
  { id: 'q11', q: 'Stop is $0.50 away and 1R = $100. Shares ≈', choices: ['50', '100', '150', '200'], a: 3, explain: '$100 ÷ $0.50 = 200 shares.', hint: 'Use R ÷ per-share risk.' },
  { id: 'q12', q: 'DAY vs GTC:', choices: ['DAY cancels at session end; GTC persists', 'Both persist', 'GTC cancels intraday', 'No difference'], a: 0, explain: 'DAY expires; GTC remains.', hint: 'Which one persists?' },
  { id: 'q13', q: 'Price above a rising 200-MA suggests…', choices: ['Long bias', 'Short bias', 'No bias', 'Mean reversion only'], a: 0, explain: 'Structure favors long bias.', hint: 'Think of 200-MA slope.' },
  { id: 'q14', q: 'Best first target when risking 1R on a clean setup?', choices: ['0.5R', '1R', '2R', '5R'], a: 2, explain: '2R keeps R/R healthy and allows scaling out.', hint: 'Common playbook uses 2R as first scale.' },
  { id: 'q15', q: 'Which reduces slippage the most?', choices: ['Market at open', 'Market at close', 'Limit near the inside', 'Random mid-day market'], a: 2, explain: 'Limit near inside quote minimizes surprise fills.', hint: 'Which order controls price best?' },
  { id: 'q16', q: 'After a big earnings gap, you should…', choices: ['Chase immediately', 'Wait for structure/trigger', 'Ignore forever', 'Max size immediately'], a: 1, explain: 'Let price build a flag/pullback and use a defined trigger.', hint: 'You still need setup→trigger→stop.' },
  { id: 'q17', q: 'Expectancy improves most by…', choices: ['Random entries', 'Bigger stops', 'Higher R multiple on winners', 'More trades/day'], a: 2, explain: 'Let winners reach 2R+ while cutting losers at 1R.', hint: 'Win bigger than you lose.' },
  { id: 'q18', q: 'You hit your daily max loss (−3R). Next step?', choices: ['Double size to recover', 'Stop trading for the day', 'Add more indicators', 'Switch to options'], a: 1, explain: 'Protect capital & psychology—live to fight tomorrow.', hint: 'Discipline over revenge.' },
  { id: 'q19', q: 'Best journal note?', choices: ['“Bad luck.”', '“FOMO after green candle; broke rule #3.”', '“Moon vibes.”', '“Next time, yolo.”'], a: 1, explain: 'Actionable notes tied to rules create improvement.', hint: 'Specific + tied to your rules.' },
  { id: 'q20', q: 'Premarket fills have…', choices: ['Tighter spreads', 'Wider spreads & lower liquidity', 'Same as RTH', 'No fills ever'], a: 1, explain: 'Liquidity is thinner → wider spreads & more slippage risk.', hint: 'Think liquidity.' },
  { id: 'q21', q: 'Range strategy usually enters…', choices: ['At range extremes with reversal trigger', 'Mid-range market order', 'At ATH only', 'Only during news'], a: 0, explain: 'Fade extremes with tight invalidation.', hint: 'Where does risk make sense in a range?' },
  { id: 'q22', q: 'If MA(50) is falling but price rallies into it, you…', choices: ['Chase long blindly', 'Assume resistance in a downtrend', 'Ignore trend context', 'Always short only'], a: 1, explain: 'Falling MA often acts as dynamic resistance—look for rejection signals.', hint: 'Consider MA slope + trend context.' },
];

export default function Learn() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [state, setState] = useState<LearnState>({
    completed: [],
    quizCorrectCount: 0,
    quizTotalAnswered: 0,
    quizCorrectIds: [],
    streak: 0,
    lastDay: '',
  });

  const [openId, setOpenId] = useState<string | null>(LESSONS[0].id);

  // Quiz UI state
  const [qIdx, setQIdx] = useState(0);
  const q = useMemo(() => QUIZ[qIdx % QUIZ.length], [qIdx]);
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);

  // ----- persistence / streak -----
  useEffect(() => {
    (async () => {
      const saved = await SecureStore.getItemAsync(LEARN_STATE_KEY);
      if (saved) {
        try {
          const parsed: LearnState = JSON.parse(saved);
          setState(sanitize(parsed));
        } catch {}
      }
      bumpStreak();
    })();
  }, []);

  useEffect(() => {
    (async () => {
      await SecureStore.setItemAsync(LEARN_STATE_KEY, JSON.stringify(sanitize(state)));
    })();
  }, [state]);

  function sanitize(s: LearnState): LearnState {
    const uniqueLessons = Array.from(new Set(s.completed)).filter(id => LESSON_IDS.has(id));
    const uniqueCorrectIds = Array.from(new Set(s.quizCorrectIds));
    return { ...s, completed: uniqueLessons, quizCorrectIds: uniqueCorrectIds };
  }

  function bumpStreak() {
    const today = new Date().toISOString().slice(0, 10);
    setState(S => {
      if (S.lastDay === today) return S;
      const next = S.lastDay ? S.streak + 1 : 1;
      return { ...S, streak: next, lastDay: today };
    });
  }

  function completeLesson(id: string) {
    if (!LESSON_IDS.has(id)) return;
    setState(S => (S.completed.includes(id) ? S : { ...S, completed: [...S.completed, id] }));
  }

  // ----- quiz flow -----
  function choose(i: number) {
    if (picked !== null) return; // locked
    setPicked(i);
    const ok = i === q.a;
    setResult(ok ? 'correct' : 'incorrect');
  }
  function tryAgain() {
    setPicked(null);
    setResult(null);
  }
  function nextQuestion() {
    setState(S => {
      const alreadyHad = S.quizCorrectIds.includes(q.id);
      const addCorrect = result === 'correct' && !alreadyHad;
      return {
        ...S,
        quizTotalAnswered: S.quizTotalAnswered + 1,
        quizCorrectCount: S.quizCorrectCount + (result === 'correct' ? 1 : 0),
        quizCorrectIds: addCorrect ? [...S.quizCorrectIds, q.id] : S.quizCorrectIds,
      };
    });
    setQIdx(i => (i + 1) % QUIZ.length);
    setPicked(null);
    setResult(null);
  }

  // ----- per-section resets -----
  function resetLessons() {
    setState(S => ({ ...S, completed: [] }));
  }
  function resetQuiz() {
    setState(S => ({ ...S, quizCorrectIds: [], quizCorrectCount: 0, quizTotalAnswered: 0 }));
    setPicked(null);
    setResult(null);
    setQIdx(0);
  }

  // header stats (keep the tiny line under the header)
  const completedCount = state.completed.length;
  const donePct = LESSONS.length ? Math.round((completedCount / LESSONS.length) * 100) : 0;

  // resources info
  const onInfoResources = () => {
    Alert.alert(
      'Helpful Resources',
      [
        'When to use these',
        '• Quick definitions & refreshers while learning.',
        '• Safety-first guidance (regulators) on fraud & risk.',
        '• Structured fundamentals (articles & videos) for deeper dives.',
        '',
        'How to get the most value',
        '• Cross-check terms here before changing your plan.',
        '• Take notes in Journal: what you learned & how it affects your playbook.',
        '• Prefer primary/official sources for rules and procedures.',
        '',
        'Reminder',
        '• Educational only—always follow your written plan and risk rules.',
        '• Stuck? Ask the AI any questions as well.',
      ].join('\n')
    );
  };  

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Math.max(20, insets.bottom + 12) }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ marginRight: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Back"
              activeOpacity={0.9}
            >
              <Text style={styles.backIcon}>{'‹'}</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.pageTitle}>Lessons</Text>
              <Text style={styles.subtitle}>
                From zero to fluent: fundamentals.
              </Text>
            </View>
          </View>

          <Text style={styles.meta}>{donePct}% complete · {completedCount}/{LESSONS.length} lessons</Text>

          {/* Lessons */}
          <Card title="Lessons" action={<MiniButton onPress={resetLessons}>Reset</MiniButton>}>
            {LESSONS.map((L, idx) => {
              const done = state.completed.includes(L.id);
              const open = openId === L.id;
              return (
                <View key={L.id} style={[styles.lessonBlock, idx > 0 && styles.lessonDivider]}>
                  <TouchableOpacity
                    onPress={() => setOpenId(open ? null : L.id)}
                    activeOpacity={0.9}
                    style={styles.lessonHeader}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lessonTitle}>
                        {L.title} <Text style={styles.muted}>· {L.duration}</Text>
                      </Text>
                      <Text style={styles.muted}>• {L.bullets.join(' • ')}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: done ? '#16a34a' : '#0f172a' }]}>
                      <Text style={styles.badgeText}>{done ? 'Done' : 'Start'}</Text>
                    </View>
                  </TouchableOpacity>

                  {open && (
                    <View style={styles.lessonBody}>
                      {L.id === 'accounts-basics'  && <AccountsBasics   onSolved={() => completeLesson(L.id)} informational={L.informational} />}
                      {L.id === 'order-types'      && <OrderTypes       onSolved={() => completeLesson(L.id)} />}
                      {L.id === 'tif-micro'        && <TifMicro         onSolved={() => completeLesson(L.id)} />}
                      {L.id === 'price-drivers'    && <PriceDrivers     onSolved={() => completeLesson(L.id)} informational={L.informational} />}
                      {L.id === 'charts-101'       && <Charts101        onSolved={() => completeLesson(L.id)} />}
                      {L.id === 'indicators-tools' && <IndicatorsTools  onSolved={() => completeLesson(L.id)} informational={L.informational} />}
                      {L.id === 'risk-first'       && <RiskFirst        onSolved={() => completeLesson(L.id)} />}
                      {L.id === 'playbooks'        && <Playbooks        onSolved={() => completeLesson(L.id)} />}
                      {L.id === 'plan-trade'       && <PlanTrade        onSolved={() => completeLesson(L.id)} />}
                      {L.id === 'execution'        && <Execution        onSolved={() => completeLesson(L.id)} />}
                      {L.id === 'journaling'       && <Journaling       onSolved={() => completeLesson(L.id)} informational={L.informational} />}
                      {L.id === 'psychology'       && <Psychology       onSolved={() => completeLesson(L.id)} informational={L.informational} />}
                    </View>
                  )}
                </View>
              );
            })}
          </Card>

          {/* Quiz — thin progress bar (correct-only), locked picks, hints, manual advance */}
          <Card title="Check Your Understanding" action={<MiniButton onPress={resetQuiz}>Reset</MiniButton>}>
            <Row>
              <TextMuted>Answered Correctly</TextMuted>
              <TextMuted>{state.quizCorrectIds.length}/{QUIZ.length}</TextMuted>
            </Row>
            <ProgressThin value={state.quizCorrectIds.length} max={QUIZ.length} />
            <Text style={[styles.question, { marginTop: 10 }]}>{q.q}</Text>
            <View style={{ marginTop: 6 }}>
              {q.choices.map((c, i) => (
                <TouchableOpacity key={i} onPress={() => choose(i)} activeOpacity={picked === null ? 0.9 : 1}>
                  <View
                    style={[
                      styles.tag,
                      picked === i && (result === 'correct' ? styles.tagPickedCorrect : styles.tagPicked),
                      picked !== null && picked !== i && styles.tagDisabled,
                    ]}
                  >
                    <Text style={[styles.tagText, picked === i && styles.tagTextPicked]}>{c}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {result && (
              <Text style={[styles.explain, result === 'correct' ? styles.correct : styles.incorrect]}>
                {result === 'correct' ? `✔ ${q.explain}` : `✖ ${q.hint}`}
              </Text>
            )}

            <View style={[styles.row, { marginTop: 10 }]}>
              {result === 'incorrect' ? (
                <Button onPress={tryAgain} style={{ backgroundColor: '#ef4444' }}>Try Again</Button>
              ) : <View style={{ height: 0 }} /> }
              <Button onPress={nextQuestion} style={{ marginLeft: 'auto', backgroundColor: '#0f172a' }}>
                Next Question
              </Button>
            </View>

            <Text style={[styles.muted, { marginTop: 6 }]}>
              Progress bar only advances when each question is answered correctly.
            </Text>
          </Card>

          {/* Resources */}
          <Card title="Helpful Resources" action={<InfoDot onPress={onInfoResources} />}>
            <Link label="Investor.gov — Introduction to Investing" href="https://www.investor.gov/introduction-investing" />
            <Link label="CFTC — Learn & Protect (Risk & Futures)" href="https://www.cftc.gov/LearnAndProtect" />
            <Link label="Investopedia — Trading Basics" href="https://www.investopedia.com/trading-4689743" />
            <Link label="Khan Academy — Finance & Capital Markets" href="https://www.khanacademy.org/economics-finance-domain/core-finance" />
          </Card>

          <Text style={[styles.muted, { marginTop: 14, fontSize: 12 }]}>
            Educational use only. Not investment advice.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/* ---------------- Reusable text atoms ---------------- */
function SubTitle({ children, style }: { children: React.ReactNode; style?: any }) {
  return <Text style={[styles.infoTitle, style]}>{children}</Text>;
}
function P({ children, style }: { children: React.ReactNode; style?: any }) {
  return <Text style={[styles.paragraph, style]}>{children}</Text>;
}
function B({ children }: { children: React.ReactNode }) {
  return <Text style={styles.bold}>{children}</Text>;
}
function Explain({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return <Text style={[styles.explain, ok ? styles.correct : styles.incorrect]}>{children}</Text>;
}
function TextMuted({ children }: { children: React.ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

/* ---------------- LESSON BODIES (no duplicate titles) ---------------- */
function AccountsBasics({ onSolved, informational }: { onSolved: () => void; informational?: boolean }) {
  return (
    <View>
      <SubTitle>Overview</SubTitle>
      <P><B>Cash</B> accounts settle on <B>T+2</B>. Reusing unsettled proceeds can trigger good-faith violations.</P>
      <P><B>Margin</B> boosts buying power but adds interest, <B>maintenance</B> requirements, and liquidation risk. Limit leverage while learning.</P>
      <P><B>PDT rule (U.S.)</B>: more than <B>3 day trades in 5 rolling days</B> requires ≥$25k equity. Swings aren’t day trades.</P>
      {informational && <Button onPress={onSolved} style={{ marginTop: 8 }}>Mark Complete</Button>}
    </View>
  );
}

function OrderTypes({ onSolved }: { onSolved: () => void }) {
  const [pick, setPick] = useState<number | null>(null);
  const ok = pick === 1;
  useEffect(() => { if (ok) onSolved(); }, [ok, onSolved]);

  return (
    <View>
      <SubTitle>Overview</SubTitle>
      <P><B>Market</B> favors speed (slippage). <B>Limit</B> enforces max/min price. <B>Stop</B> triggers a market order at a level. <B>Stop-limit</B> caps post-trigger price but may miss.</P>
      <SubTitle style={{ marginTop: 8 }}>Scenario</SubTitle>
      <P>You refuse to pay above <B>$100</B>. Bid/Ask <B>$99.90 × $100.10</B>. Choose the best order:</P>
      {['Market Buy (fastest)', 'Limit Buy at $100 (price cap)', 'Stop Buy at $101 (breakout trigger)'].map((c, i) => (
        <Choice key={i} label={c} picked={pick === i} onPress={() => setPick(i)} />
      ))}
      {pick !== null && <Explain ok={ok}>{ok ? 'Correct—limit caps the price at $100 or better.' : 'Market has no cap; stop-buy triggers higher and can overpay.'}</Explain>}
    </View>
  );
}

function TifMicro({ onSolved }: { onSolved: () => void }) {
  const [pick, setPick] = useState<number | null>(null);
  const ok = pick === 0;
  useEffect(() => { if (ok) onSolved(); }, [ok, onSolved]);

  return (
    <View>
      <SubTitle>Overview</SubTitle>
      <P><B>DAY</B> cancels at session end; <B>GTC</B> persists. Spreads widen at open/close and in thin names. <B>Auctions</B> can gap price—and <B>halts</B> (LULD/regulatory) pause trading; avoid market orders right at the bell or during extreme volatility.</P>
      <SubTitle style={{ marginTop: 8 }}>Quick Check</SubTitle>
      {[
        'DAY cancels at session end; GTC persists until filled/canceled',
        'Both persist across sessions',
        'GTC cancels intraday',
      ].map((c, i) => (
        <Choice key={i} label={c} picked={pick === i} onPress={() => setPick(i)} />
      ))}
      {pick !== null && <Explain ok={ok}>{ok ? 'Right—GTC remains until you cancel it.' : 'Not quite—only GTC persists overnight.'}</Explain>}
    </View>
  );
}

function PriceDrivers({ onSolved, informational }: { onSolved: () => void; informational?: boolean }) {
  return (
    <View>
      <SubTitle>Overview</SubTitle>
      <P><B>Earnings & guidance</B> drive the biggest single-day repricings. <B>Macro surprises</B> (CPI, FOMC, jobs) shift rates and risk appetite. <B>Rotation/liquidity</B> shape multi-day trends.</P>
      <P><B>Practice:</B> build a weekly earnings calendar; log implied move and gap history for your watchlist.</P>
      {informational && <Button onPress={onSolved} style={{ marginTop: 8 }}>Mark Complete</Button>}
    </View>
  );
}

function Charts101({ onSolved }: { onSolved: () => void }) {
  const series = [98, 100, 101, 103, 105];
  const [pick, setPick] = useState<number | null>(null);
  const ok = pick === 0;
  useEffect(() => { if (ok) onSolved(); }, [ok, onSolved]);

  return (
    <View>
      <SubTitle>Overview</SubTitle>
      <P><B>Trend</B>: HH/HL (up) vs LH/LL (down). <B>S/R</B>: zones where supply/demand flips. <B>Volume</B> confirms participation. <B>VWAP</B> is an intraday anchor. <B>Gaps</B> = information shocks.</P>
      <SubTitle style={{ marginTop: 8 }}>Identify the trend</SubTitle>
      <P>Closes: {series.join(', ')} — what’s the dominant trend?</P>
      {['Uptrend (higher highs & higher lows)', 'Downtrend', 'Sideways range'].map((c, i) => (
        <Choice key={i} label={c} picked={pick === i} onPress={() => setPick(i)} />
      ))}
      {pick !== null && <Explain ok={ok}>{ok ? 'Correct—HH/HL sequence = uptrend.' : 'Look for the stepping pattern of highs/lows—this set trends up.'}</Explain>}
      <P style={{ marginTop: 6 }}><B>Tip:</B> Price above a <B>rising</B> 50/200-MA supports long bias; below a <B>falling</B> 50/200-MA supports short bias.</P>
    </View>
  );
}

function IndicatorsTools({ onSolved, informational }: { onSolved: () => void; informational?: boolean }) {
  return (
    <View>
      <SubTitle>Overview</SubTitle>
      <P>Use <B>moving averages</B> (20/50/200) to read structure, <B>ATR</B> to scale size by volatility, and <B>VWAP</B> as an intraday anchor. Indicators support decisions—price & risk rules lead.</P>
      {informational && <Button onPress={onSolved} style={{ marginTop: 8 }}>Mark Complete</Button>}
    </View>
  );
}

function RiskFirst({ onSolved }: { onSolved: () => void }) {
  const [acct, setAcct] = useState('10000');
  const [riskPct, setRiskPct] = useState('1');
  const [entry, setEntry] = useState('100');
  const [stop, setStop] = useState('95');
  const [ans, setAns] = useState('');

  const rDollars = Math.max(0, (Number(acct) || 0) * ((Number(riskPct) || 0) / 100));
  const perShare = Math.max(0, (Number(entry) || 0) - (Number(stop) || 0));
  const shares = perShare > 0 ? Math.floor(rDollars / perShare) : 0;
  const ok = Number(ans) === shares && shares > 0;

  useEffect(() => { if (ok) onSolved(); }, [ok, onSolved]);

  return (
    <View>
      <SubTitle>Overview</SubTitle>
      <P><B>1R</B> is your dollar risk per trade. Size so <B>(entry − stop) × shares ≤ 1R</B>. Keep a daily max loss (e.g., 3R) to avoid tilt. Watch for <B>correlation risk</B> (multiple positions moving together) — don’t multiply 1R across highly correlated names.</P>
      <Row>
        <KV label="Account ($)"><Input value={acct} onChangeText={setAcct} keyboardType="decimal-pad" /></KV>
        <KV label="Risk %"><Input value={riskPct} onChangeText={setRiskPct} keyboardType="decimal-pad" /></KV>
      </Row>
      <Row>
        <KV label="Entry ($)"><Input value={entry} onChangeText={setEntry} keyboardType="decimal-pad" /></KV>
        <KV label="Stop ($)"><Input value={stop} onChangeText={setStop} keyboardType="decimal-pad" /></KV>
      </Row>
      <Row>
        <KV label="Your shares"><Input value={ans} onChangeText={setAns} keyboardType="number-pad" placeholder="ex. 20" /></KV>
        <View style={{ width: '48%', marginTop: 8, justifyContent: 'flex-end' }}>
          <Text style={styles.muted}>1R=${rDollars.toFixed(2)} · /share=${perShare.toFixed(2)}</Text>
        </View>
      </Row>
      {ans.length > 0 && <Explain ok={ok}>{ok ? 'Great—risk is ≈1R at that size.' : `Close—≈ ${shares} shares keeps risk ≈1R with these inputs.`}</Explain>}
      <P style={{ marginTop: 6 }}>Expectancy = <B>Win-rate × Avg-Win</B> − <B>(1 − Win-rate) × Avg-Loss</B>. Aim for Avg-Win in R {'>'} Avg-Loss with consistent 1R.</P>
    </View>
  );
}

function Playbooks({ onSolved }: { onSolved: () => void }) {
  const [p1, setP1] = useState<number | null>(null);
  const [p2, setP2] = useState<number | null>(null);
  const ok = p1 === 0 && (p2 === 1 || p2 === 2);

  useEffect(() => { if (ok) onSolved(); }, [ok, onSolved]);

  return (
    <View>
      <SubTitle>Checklist</SubTitle>
      <P>Write rules you can execute: <B>setup → trigger → stop → targets → manage</B>. Journal & grade adherence (A/B/C).</P>
      <SubTitle style={{ marginTop: 8 }}>Breakout Scenario</SubTitle>
      <P>Range 48–50 for 10 days. Today closes at 50.30 on higher volume. Is it a valid breakout?</P>
      {['Yes—close above range on volume', 'No—still in range', 'No—needs a moving average cross'].map((c, i) => (
        <Choice key={i} label={c} picked={p1 === i} onPress={() => setP1(i)} />
      ))}
      <P style={{ marginTop: 8 }}>Initial stop placement?</P>
      {['Above today’s high', 'Below the breakout candle low', 'Below the range low (~47.9–49.8 buffer)', 'At VWAP'].map((c, i) => (
        <Choice key={i} label={c} picked={p2 === i} onPress={() => setP2(i)} />
      ))}
      {(p1 !== null || p2 !== null) && <Explain ok={ok}>{ok ? 'Nice—valid breakout; stop below structure.' : 'Confirm breakout and keep stop under structure, not above.'}</Explain>}
      <P style={{ marginTop: 6 }}>Pullback rules: buy higher-low into support with a trigger; stop under swing low; partials at 1R/2R, trail under higher lows.</P>
    </View>
  );
}

function PlanTrade({ onSolved }: { onSolved: () => void }) {
  const [pick, setPick] = useState<number | null>(null);
  const ok = pick === 2; // plan with trigger/stop/2R first scale
  useEffect(() => { if (ok) onSolved(); }, [ok, onSolved]);

  return (
    <View>
      <SubTitle>Overview</SubTitle>
      <P>Every trade: <B>setup</B> (why) → <B>trigger</B> (level) → <B>stop</B> (invalidation) → <B>targets</B> in R → <B>manage</B> (scale/exit rules).</P>
      <SubTitle style={{ marginTop: 8 }}>Pick the best plan</SubTitle>
      {[
        '“Buy if looks strong; stop somewhere below; sell when comfy.”',
        '“Enter randomly at open; stop 1%; scale at feelings.”',
        '“Breakout over 50.30 on volume; stop 49.80; first scale 2R; trail under HLs.”',
      ].map((c, i) => (
        <Choice key={i} label={c} picked={pick === i} onPress={() => setPick(i)} />
      ))}
      {pick !== null && <Explain ok={ok}>{ok ? 'Exactly—specific trigger, invalidation, and R-based targets.' : 'You need a specific trigger, stop, and R-based targets.'}</Explain>}
    </View>
  );
}

function Execution({ onSolved }: { onSolved: () => void }) {
  const [pick, setPick] = useState<number | null>(null);
  const ok = pick === 1;
  useEffect(() => { if (ok) onSolved(); }, [ok, onSolved]);

  return (
    <View>
      <SubTitle>Overview</SubTitle>
      <P>Slippage = <B>spread</B> + <B>impact</B>. Premarket/postmarket are thinner → wider spreads. Reduce slippage with <B>limit orders</B> near the inside and avoid market at the bell.</P>
      <SubTitle style={{ marginTop: 8 }}>Scenario</SubTitle>
      <P>Premarket spread is wide. You want a tight entry if price ticks your trigger.</P>
      {['Market buy as soon as it prints', 'Place a limit near the inside and wait for a tick', 'Set a stop-market and hope'].map((c, i) => (
        <Choice key={i} label={c} picked={pick === i} onPress={() => setPick(i)} />
      ))}
      {pick !== null && <Explain ok={ok}>{ok ? 'Correct—control price with a patient limit near the inside.' : 'Market orders in thin sessions often slip hard.'}</Explain>}
    </View>
  );
}

function Journaling({ onSolved, informational }: { onSolved: () => void; informational?: boolean }) {
  return (
    <View>
      <SubTitle>Overview</SubTitle>
      <P>Log: setup, trigger, stop/targets, size (R), emotions before/during/after, adherence grade, and what to change next. Review weekly to refine rules.</P>
      {informational && <Button onPress={onSolved} style={{ marginTop: 8 }}>Mark Complete</Button>}
    </View>
  );
}

function Psychology({ onSolved, informational }: { onSolved: () => void; informational?: boolean }) {
  return (
    <View>
      <SubTitle>Overview</SubTitle>
      <P>Common traps: FOMO, revenge trading, moving stops, oversizing after wins, boredom trading. Use a <B>halt protocol</B>: breathe, step away 5–10 min, reread rules, reduce size or stop for the day.</P>
      {informational && <Button onPress={onSolved} style={{ marginTop: 8 }}>Mark Complete</Button>}
    </View>
  );
}

/* ---------------- UI atoms ---------------- */
function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        {action ? <View style={{ marginLeft: 8 }}>{action}</View> : null}
      </View>
      {children}
    </View>
  );
}
function Row({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.row, style]}>{children}</View>;
}
function Button({ children, onPress, style }: { children: React.ReactNode; onPress: () => void; style?: any }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.button, style]} activeOpacity={0.9}>
      <Text style={styles.btnText}>{children}</Text>
    </TouchableOpacity>
  );
}
function MiniButton({ children, onPress }: { children: React.ReactNode; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.miniButton}>
      <Text style={styles.miniBtnText}>{children}</Text>
    </TouchableOpacity>
  );
}
function Choice({ label, picked, onPress }: { label: string; picked: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <View style={[styles.tag, picked && styles.tagPicked]}>
        <Text style={[styles.tagText, picked && styles.tagTextPicked]}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}
function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ width: '48%', marginTop: 8 }}>
      <Text style={styles.key}>{label}</Text>
      <View style={{ marginTop: 6 }}>{children}</View>
    </View>
  );
}
function Input(props: any) {
  return <TextInput {...props} style={[styles.input, props.style]} placeholder={props.placeholder || 'ex. value'} />;
}
function Link({ label, href }: { label: string; href: string }) {
  return (
    <TouchableOpacity onPress={() => Linking.openURL(href)} activeOpacity={0.9}>
      <View style={styles.tag}><Text style={styles.tagText}>{label}</Text></View>
    </TouchableOpacity>
  );
}
function ProgressThin({ value, max }: { value: number; max: number }) {
  const pct = Math.max(0, Math.min(1, max ? value / max : 0));
  return (
    <View style={{ height: 6, backgroundColor: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: '#16a34a' }} />
    </View>
  );
}
/* info dot (20px) */
function InfoDot({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} accessibilityRole="button" accessibilityLabel="Section info"
      style={styles.infoDot} activeOpacity={0.85}>
      <Text style={styles.infoDotText}>i</Text>
    </TouchableOpacity>
  );
}

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 6 },
  backIcon: { fontSize: 28, lineHeight: 28, fontWeight: '900', color: '#0f172a' },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#0f172a' },
  subtitle: { color: '#475569', marginTop: 2 },

  meta: { color: '#475569', marginTop: 6 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 8 },

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },

  button: { backgroundColor: '#0f172a', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, marginTop: 10 },
  btnText: { color: '#fff', fontWeight: '700' },

  miniButton: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, backgroundColor: '#e2e8f0' },
  miniBtnText: { fontSize: 12, fontWeight: '800', color: '#0f172a' },

  input: {
    backgroundColor: '#fff',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minWidth: 70,
    color: '#0f172a',
  },
  key: { color: '#334155', fontWeight: '600' },

  lessonBlock: { paddingVertical: 8 },
  lessonDivider: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  lessonHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lessonTitle: { fontWeight: '800', color: '#0f172a', fontSize: 16, marginBottom: 2 },
  lessonBody: { marginTop: 8 },

  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeText: { color: '#fff', fontWeight: '800' },

  tag: { backgroundColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  tagPicked: { backgroundColor: '#0f172a' },
  tagPickedCorrect: { backgroundColor: '#16a34a' },
  tagDisabled: { opacity: 0.55 },
  tagText: { color: '#0f172a', fontWeight: '800' },
  tagTextPicked: { color: '#fff' },

  infoTitle: { fontWeight: '800', color: '#0f172a', marginBottom: 4, fontSize: 16 },
  paragraph: { color: '#475569', lineHeight: 20 },
  bold: { fontWeight: '800', color: '#0f172a' },
  explain: { marginTop: 8, paddingVertical: 6 },
  correct: { color: '#16a34a' },
  incorrect: { color: '#dc2626' },

  muted: { color: '#475569' },
  question: { fontWeight: '800', color: '#0f172a', fontSize: 16 },

  /* info dot */
  infoDot: {
    height: 20, width: 20, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#e2e8f0', borderWidth: 1, borderColor: '#cbd5e1',
  },
  infoDotText: { color:'#0f172a', fontWeight:'800', fontSize: 11, lineHeight: 12 },

  // alias
  margintop: { marginTop: 8 },
});
