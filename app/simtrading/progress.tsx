import Sim from '@/lib/sim';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const LEARN_STATE_KEY = 'learn.state.v4';
const PAPER_ENABLED_KEY = 'paper.enabled';

const STREAK_COUNT_KEY = 'progress.streak.count.v1';
const STREAK_LAST_DAY_KEY = 'progress.streak.lastDay.v1';

const TOTAL_LESSONS = 12;
const QUIZ_BANK_SIZE = 22;

/* ---------------- Local header ---------------- */
function LocalHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}) {
  return (
    <View style={{ marginTop: 6, marginBottom: 6, flexDirection: 'row', alignItems: 'center' }}>
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
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#0f172a' }}>{title}</Text>
        {subtitle ? <Text style={{ color: '#475569', marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

/* ---------------- Small “i” info button ---------------- */
function InfoDot({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} accessibilityRole="button" accessibilityLabel="Section info"
      style={styles.infoDot} activeOpacity={0.85}>
      <Text style={styles.infoDotText}>i</Text>
    </TouchableOpacity>
  );
}

/* ---------------- Thin progress bar ---------------- */
function ProgressThin({
  value, max, height = 10, color = '#16a34a',
}: { value: number; max: number; height?: number; color?: string }) {
  const pct = Math.max(0, Math.min(1, max ? value / max : 0));
  return (
    <View style={{ height, backgroundColor: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: color }} />
    </View>
  );
}

/* ---------------- UI atoms ---------------- */
function Row({ children, style }: any) { return <View style={[styles.row, style]}>{children}</View>; }
function Key({ children }: any) { return <Text style={{ color: '#334155', fontWeight: '600' }}>{children}</Text>; }
function Val({ children }: any) { return <Text style={{ color: '#0f172a', fontWeight: '700' }}>{children}</Text>; }
function Muted({ children, style }: any) { return <Text style={[{ color: '#475569' }, style]}>{children}</Text>; }
function Button({ children, onPress, disabled }: any) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={[styles.button, disabled && { opacity: 0.5 }]} activeOpacity={0.85}>
      <Text style={styles.btnText}>{children}</Text>
    </TouchableOpacity>
  );
}
function Check({ ok, children }: any) {
  return (
    <Row>
      <Muted>{children}</Muted>
      <Text style={{ color: ok ? '#16a34a' : '#dc2626', fontWeight: '800' }}>{ok ? '✓' : '•'}</Text>
    </Row>
  );
}
function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { marginBottom: 0 }]}>{title}</Text>
        {action ? <View>{action}</View> : null}
      </View>
      {children}
    </View>
  );
}

/* ------------- Consistently aligned “i” messages ------------- */
type InfoSection = { heading?: string; items: string[] };
function showInfo(title: string, sections: InfoSection[], footer?: string) {
  const lines: string[] = [];
  sections.forEach((section, idx) => {
    if (idx > 0) lines.push('');
    if (section.heading) lines.push(section.heading);
    section.items.forEach(item => lines.push(`• ${item}`));
  });
  if (footer) {
    lines.push('');
    lines.push(footer);
  }
  Alert.alert(title, lines.join('\n'));
}

/* ---------------- Learn store & streak helpers (FIX) ---------------- */
type LearnStore = {
  completed?: string[];
  quizCorrectCount?: number;
  quizTotalAnswered?: number;
  quizCorrectIds?: string[];
  // old fields can remain here for backwards-compat, but streak now uses separate keys:
  streak?: number;
  lastDay?: string; // 'YYYY-MM-DD'
};

type DayKey = `${number}-${number}-${number}`; // "YYYY-MM-DD"
const pad2 = (n: number) => String(n).padStart(2, '0');

function todayKeyLocal(): DayKey {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` as DayKey;
}
function daysBetweenKeys(a: DayKey, b: DayKey) {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const A = Date.UTC(ay, am - 1, ad, 0, 0, 0, 0);
  const B = Date.UTC(by, bm - 1, bd, 0, 0, 0, 0);
  return Math.round((B - A) / 86400000);
}

// Read streak from dedicated keys
async function getStreak(): Promise<{ count: number; last?: DayKey }> {
  const c = await SecureStore.getItemAsync(STREAK_COUNT_KEY);
  const l = (await SecureStore.getItemAsync(STREAK_LAST_DAY_KEY)) as DayKey | null;
  return { count: Number(c || 0) || 0, last: l || undefined };
}

/** Increment at most once per local calendar day; reset on 2+ day gap. Safe against hot reloads. */
async function touchStreakToday(): Promise<{ count: number; today: DayKey }> {
  const { count, last } = await getStreak();
  const today = todayKeyLocal();

  if (last === today) {
    // already counted today
    return { count, today };
  }

  let next = count || 0;
  if (!last) next = 1;
  else {
    const gap = daysBetweenKeys(last, today);
    if (gap === 1) next = Math.max(1, next + 1); // consecutive day
    else if (gap >= 2) next = 1;                  // missed days → reset
    // gap < 0 (clock/backdate) → keep count, but still move last to today below
  }

  await SecureStore.setItemAsync(STREAK_COUNT_KEY, String(next));
  await SecureStore.setItemAsync(STREAK_LAST_DAY_KEY, today);
  return { count: next, today };
}

/** Merge patch into learn.state.v4 to avoid clobbering, preserving other fields written by other screens. */
async function mergeLearnState(patch: Partial<LearnStore>) {
  const raw = await SecureStore.getItemAsync(LEARN_STATE_KEY);
  let cur: LearnStore = {};
  try { if (raw) cur = JSON.parse(raw); } catch {}
  const next = { ...cur, ...patch };
  await SecureStore.setItemAsync(LEARN_STATE_KEY, JSON.stringify(next));
}

/* ------------------------------------------------------------------ */

type Badge = { id: string; title: string; earned: boolean; reason: string };

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // ---- Learn state snapshot ----
  const [streak, setStreak] = useState(0);
  const [lessonsDone, setLessonsDone] = useState(0);
  const [quizCorrectCount, setQuizCorrectCount] = useState(0);
  const [quizTotalAnswered, setQuizTotalAnswered] = useState(0);
  const [quizUniqueCorrect, setQuizUniqueCorrect] = useState(0);

  // ---- Live sim stats ----
  const [tradeCount, setTradeCount] = useState((Sim as any).paper?.orders?.length || 0);
  const [posCount, setPosCount] = useState((Sim as any).paper?.positions?.length || 0);
  const [journalCount, setJournalCount] = useState(0);
  const [paperOn, setPaperOn] = useState(false);

  // Load & normalize learn state once (and bump streak safely)
  useEffect(() => {
    (async () => {
      // read the existing learn blob for non-streak stats
      let saved: LearnStore | null = null;
      const raw = await SecureStore.getItemAsync(LEARN_STATE_KEY);
      if (raw) {
        try { saved = JSON.parse(raw) as LearnStore; } catch {}
      }

      // snapshot visible stats
      setLessonsDone(Array.isArray(saved?.completed) ? saved!.completed!.length : 0);
      setQuizCorrectCount(Number(saved?.quizCorrectCount) || 0);
      setQuizTotalAnswered(Number(saved?.quizTotalAnswered) || 0);
      setQuizUniqueCorrect(Array.isArray(saved?.quizCorrectIds) ? saved!.quizCorrectIds!.length : 0);

      // update streak using dedicated keys (prevents accidental double bumps)
      const { count, today } = await touchStreakToday();
      setStreak(count);

      // optional: mirror into learn.state.v4 via merge (so badges/other UIs can still read streak)
      await mergeLearnState({ streak: count, lastDay: today });

      // paper toggle
      const paperFlag = await SecureStore.getItemAsync(PAPER_ENABLED_KEY);
      setPaperOn(paperFlag === '1');
    })();
  }, []);

  // Subscribe to sim changes so stats update live
  useEffect(() => {
    const onSim = () => {
      const orders = ((Sim as any).paper?.orders || []) as any[];
      setTradeCount(orders.length);
      setJournalCount(orders.filter(o => (o?.note || '').trim().length > 0).length);
      setPosCount(((Sim as any).paper?.positions || []).length);
    };
    const unsub = (Sim as any).on?.(onSim);
    onSim();
    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);

  const quizAccuracy = quizTotalAnswered ? quizCorrectCount / quizTotalAnswered : 0;

  // --------- Info handlers (aligned + improved content) ----------
  const onInfoOverview = useCallback(() => {
    showInfo(
      'Overview',
      [
        {
          heading: 'What this tracks',
          items: [
            `Lessons — completed out of ${TOTAL_LESSONS}.`,
            'Quiz Accuracy — correct vs total attempts across time.',
            `Quiz Coverage — unique questions you’ve answered correctly (out of ${QUIZ_BANK_SIZE}).`,
            'Streak — days you opened Learn or Progress (habit builder).',
            'Paper Trades — number of simulated orders placed.',
            'Open Positions — how many positions you currently hold (sim).',
            'Journal Notes — reflections attached to trades.',
          ],
        },
        {
          heading: 'How to use it',
          items: [
            'Prioritize consistency: a 5–10 day streak beats a single marathon.',
            'Use coverage to find blind spots; accuracy to confirm mastery.',
            'Journal immediately after trades: setup, trigger, stop, targets, emotions.',
          ],
        },
      ],
      'All stats update automatically as you learn and practice.'
    );
  }, []);

  const onInfoBadges = useCallback(() => {
    showInfo(
      'Badges',
      [
        {
          heading: 'Milestones (Learn)',
          items: [
            'First Lesson — complete your first lesson.',
            'Foundation (5 Lessons) — complete five lessons.',
            'Course Complete — finish all lessons.',
          ],
        },
        {
          heading: 'Practice & Journal',
          items: [
            'Paper Trader On — enable simulation in Practice.',
            'First Paper Trade — place your first simulated order.',
            'First Journal Note — write your first reflection.',
          ],
        },
        {
          heading: 'Quiz',
          items: [
            'Quiz Apprentice — ≥70% accuracy over 5+ answers.',
            'Quiz Master — ≥80% accuracy over 20+ answers.',
            'Quiz Coverage 50% — get half the bank correct at least once.',
          ],
        },
        {
          heading: 'Consistency',
          items: [
            '7-Day Streak — open Learn/Progress seven days in a row.',
          ],
        },
      ],
      'Badges celebrate healthy habits: deliberate practice, risk discipline, and reflection.'
    );
  }, []);

  const onInfoReadiness = useCallback(() => {
    showInfo(
      'Readiness Tracker (Optional)',
      [
        {
          heading: 'Targets before risking real money',
          items: [
            'Foundations — 8+ lessons completed.',
            'Knowledge — 60%+ quiz coverage & 75%+ accuracy over 15+ answers.',
            'Reps — 30+ paper trades executed.',
            'Reflection — 10+ journal notes written.',
            'Consistency — 10-day learning streak.',
          ],
        },
        {
          heading: 'How to apply it',
          items: [
            'Treat it as a guardrail, not a guarantee or advice.',
            'Pick the weakest row and focus there for the next week.',
            'If the streak breaks, resume—knowledge retained still counts.',
          ],
        },
      ],
      'Move to live only when the whole checklist feels routine—not forced.'
    );
  }, []);
  // -----------------------------------------------------

  // --------- Badges derived from real usage ------------
  const badges: Badge[] = useMemo(() => {
    const cov50 = quizUniqueCorrect >= Math.ceil(QUIZ_BANK_SIZE * 0.5);
    return [
      { id: 'lesson1',       title: 'First Lesson',               earned: lessonsDone >= 1,  reason: 'Complete your first lesson.' },
      { id: 'lesson5',       title: 'Foundation (5 Lessons)',     earned: lessonsDone >= 5,  reason: 'Complete 5 lessons.' },
      { id: 'lessonAll',     title: 'Course Complete',            earned: lessonsDone >= TOTAL_LESSONS, reason: 'Finish all lessons.' },
      { id: 'paperOn',       title: 'Paper Trader On',            earned: paperOn,           reason: 'Enable paper trading in Practice.' },
      { id: 'firstTrade',    title: 'First Paper Trade',          earned: tradeCount >= 1,   reason: 'Place your first simulated order.' },
      { id: 'journal1',      title: 'First Journal Note',         earned: journalCount >= 1, reason: 'Add a note to any trade in Journal.' },
      { id: 'quiz5_70',      title: 'Quiz Apprentice',            earned: quizTotalAnswered >= 5  && quizAccuracy >= 0.70, reason: '≥70% accuracy over 5+ answers.' },
      { id: 'quiz20_80',     title: 'Quiz Master',                earned: quizTotalAnswered >= 20 && quizAccuracy >= 0.80, reason: '≥80% accuracy over 20+ answers.' },
      { id: 'coverage50',    title: 'Quiz Coverage 50%',          earned: cov50,             reason: 'Get half the quiz bank right at least once.' },
      { id: 'streak7',       title: '7-Day Streak',               earned: streak >= 7,       reason: 'Open Learn/Progress 7 days in a row.' },
    ];
  }, [lessonsDone, paperOn, tradeCount, journalCount, quizTotalAnswered, quizAccuracy, quizUniqueCorrect, streak]);

  // --------- Readiness tracker (optional) --------------
  const readiness = [
    { key: 'lessons',       ok: lessonsDone >= 8,                      cur: lessonsDone,           max: 8,                              label: '8+ lessons completed',                          color: '#0ea5e9' },
    { key: 'quizCoverage',  ok: quizUniqueCorrect >= Math.ceil(QUIZ_BANK_SIZE * 0.6), cur: quizUniqueCorrect, max: Math.ceil(QUIZ_BANK_SIZE * 0.6), label: '60% quiz coverage (unique correct)',         color: '#10b981' },
    { key: 'quizAccuracy',  ok: quizTotalAnswered >= 15 && quizAccuracy >= 0.75,       cur: quizAccuracy,      max: 1,                              label: '≥75% quiz accuracy over 15+ answers',        color: '#22c55e' },
    { key: 'paperTrades',   ok: tradeCount >= 30,                      cur: tradeCount,            max: 30,                             label: '30+ paper trades',                              color: '#f59e0b' },
    { key: 'journal',       ok: journalCount >= 10,                    cur: journalCount,          max: 10,                             label: '10+ journal notes',                             color: '#64748b' },
    { key: 'streak',        ok: streak >= 10,                          cur: streak,                max: 10,                             label: '10-day learning streak',                        color: '#6366f1' },
  ] as const;

  const allReady = readiness.every(r => r.ok);

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Math.max(20, insets.bottom + 12) }}
          keyboardShouldPersistTaps="handled"
        >
          <LocalHeader
            title="Progress"
            subtitle="Track learning, activity, and readiness."
            onBack={() => router.back()}
          />

          {/* Overview */}
          <Card title="Overview" action={<InfoDot onPress={onInfoOverview} />}>
            <Row>
              <Key>Lessons</Key>
              <Val>{lessonsDone}/{TOTAL_LESSONS}</Val>
            </Row>
            <ProgressThin value={lessonsDone} max={TOTAL_LESSONS} />

            <Row style={{ marginTop: 10 }}>
              <Key>Quiz Accuracy</Key>
              <Val>{quizCorrectCount}/{quizTotalAnswered}</Val>
            </Row>
            <ProgressThin value={quizCorrectCount} max={Math.max(1, quizTotalAnswered)} color="#22c55e" />

            <Row style={{ marginTop: 10 }}>
              <Key>Quiz Coverage (unique)</Key>
              <Val>{quizUniqueCorrect}/{QUIZ_BANK_SIZE}</Val>
            </Row>
            <ProgressThin value={quizUniqueCorrect} max={QUIZ_BANK_SIZE} color="#10b981" />

            <Row style={{ marginTop: 10 }}>
              <Key>Streak</Key>
              <Val>{streak} days</Val>
            </Row>
            <ProgressThin value={Math.min(streak, 10)} max={10} color="#6366f1" />

            <Row style={{ marginTop: 10 }}>
              <Key>Paper Trades</Key>
              <Val>{tradeCount}</Val>
            </Row>
            <ProgressThin value={Math.min(tradeCount, 30)} max={30} color="#0ea5e9" />

            <Row style={{ marginTop: 10 }}>
              <Key>Open Positions</Key>
              <Val>{posCount}</Val>
            </Row>
            <ProgressThin value={Math.min(posCount, 10)} max={10} color="#f59e0b" />

            <Row style={{ marginTop: 10 }}>
              <Key>Journal Notes</Key>
              <Val>{journalCount}</Val>
            </Row>
            <ProgressThin value={Math.min(journalCount, 10)} max={10} color="#64748b" />
          </Card>

          {/* Badges */}
          <Card title="Badges" action={<InfoDot onPress={onInfoBadges} />}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {badges.map((b) => (
                <View key={b.id} style={[styles.badge, !b.earned && styles.badgeLocked]}>
                  <Text style={[styles.badgeText, !b.earned && styles.badgeTextLocked]}>{b.title}</Text>
                </View>
              ))}
            </View>
            <Muted style={{ marginTop: 8 }}>Earn badges by completing lessons, placing your first paper trade, journaling, and mastering the quiz.</Muted>
          </Card>

          {/* Readiness Tracker (optional) */}
          <Card title="Readiness Tracker (Optional)" action={<InfoDot onPress={onInfoReadiness} />}>
            <Muted>Hit all checkpoints before risking real money:</Muted>

            {readiness.map((r) => (
              <View key={r.key} style={{ marginTop: 8 }}>
                <Check ok={r.ok}>{r.label}</Check>
                <ProgressThin value={r.cur} max={r.max} height={8} color={r.color} />
              </View>
            ))}

            <View style={{ marginTop: 12 }}>
              <Button
                disabled={!allReady}
                onPress={() => {
                  Alert.alert(
                    allReady ? 'Playbook (Coming Soon)' : 'Keep Going',
                    allReady
                      ? 'We’ll compile your setups, risk rules, and lessons learned into a personal PDF playbook.'
                      : 'Work through the checklist to unlock your personal playbook.'
                  );
                }}
              >
                {allReady ? 'Generate Personal Playbook (PDF)' : 'Keep going to unlock Playbook'}
              </Button>
            </View>
          </Card>

          <Muted style={{ marginTop: 14, fontSize: 12 }}>
            Educational use only. Not investment advice.
          </Muted>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
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
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },

  /* info chip (20px) */
  infoDot: {
    height: 20, width: 20, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#e2e8f0', borderWidth: 1, borderColor: '#cbd5e1',
  },
  infoDotText: { color:'#0f172a', fontWeight:'800', fontSize: 11, lineHeight: 12 },

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 4 },

  button: { backgroundColor: '#0f172a', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, marginTop: 10 },
  btnText: { color: '#fff', fontWeight: '700' },

  badge: { backgroundColor: '#0f172a', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, marginRight: 6, marginTop: 6 },
  badgeText: { color: '#fff', fontWeight: '700' },
  badgeLocked: { backgroundColor: '#e2e8f0' },
  badgeTextLocked: { color: '#0f172a' },
});
