import Sim, { Order } from '@/lib/sim';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type Filter = 'ALL' | 'BUY' | 'SELL';
const LOCKS_KEY = 'journal.locks.v1';

type LocksMap = Record<string, boolean>; // orderId -> locked (true = locked)

/* ---------------- Local header ---------------- */
function LocalHeader({
  title,
  subtitle,
  showBack = true,
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

/* ---------------- Locks persistence ---------------- */
async function loadLocks(): Promise<LocksMap> {
  try {
    const ok = await SecureStore.isAvailableAsync();
    if (!ok) return {};
    const raw = await SecureStore.getItemAsync(LOCKS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
async function saveLocks(map: LocksMap) {
  try {
    const ok = await SecureStore.isAvailableAsync();
    if (!ok) return;
    await SecureStore.setItemAsync(LOCKS_KEY, JSON.stringify(map));
  } catch {}
}

/* ---------------- Small “i” button ---------------- */
function InfoDot({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} accessibilityRole="button" accessibilityLabel="Section info"
      style={styles.infoDot} activeOpacity={0.85}>
      <Text style={styles.infoDotText}>i</Text>
    </TouchableOpacity>
  );
}

export default function Journal() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [locks, setLocks] = useState<LocksMap>({}); // id -> locked

  // subscribe to sim orders
  useEffect(() => {
    const handle = () => setOrders([...(Sim as any).paper?.orders || []]);
    const unsub = Sim.on?.(handle);
    Sim.load().then(handle);
    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);

  // load saved locks
  useEffect(() => {
    loadLocks().then((m) => setLocks(m));
  }, []);

  const lockNote = useCallback(async (id: string) => {
    const next = { ...locks, [id]: true };
    setLocks(next);
    await saveLocks(next);
  }, [locks]);

  const unlockNote = useCallback(async (id: string) => {
    const next = { ...locks, [id]: false };
    setLocks(next);
    await saveLocks(next);
  }, [locks]);

  // persist note text in Sim
  function setNote(id: string, note: string) {
    const list = (Sim as any).paper?.orders || [];
    const idx = list.findIndex((o: Order) => o.id === id);
    if (idx >= 0) {
      list[idx].note = note;
      Sim.persist?.();
      setOrders([...list]);
    }
  }

  const visibleOrders = useMemo(() => {
    const sorted = [...orders].sort((a, b) => b.ts - a.ts);
    if (filter === 'ALL') return sorted;
    return sorted.filter(o => o.side === filter);
  }, [orders, filter]);

  const onInfoJournal = useCallback(() => {
    Alert.alert(
      'How to use your trading journal',
      [
        'Log a short, structured note for every BUY/SELL so you can spot patterns and improve:',
        '',
        '• Setup & context — what pattern/conditions made this valid?',
        '• Trigger — the exact entry rule you used.',
        '• Stop & invalidation — the price/logic that proves you wrong.',
        '• Targets — plan in R (e.g., 2R first scale).',
        '• Size in R — confirm position fits your 1R risk.',
        '• Why now — your thesis in one sentence.',
        '• Emotions — before/during/after (FOMO, hesitation, tilt).',
        '• Adherence — did you follow your rules? Grade A/B/C.',
        '• Takeaway — one concrete change for next time.',
        '',
        'Workflow: add your note, then tap ✔ Save to lock it. Tap ✎ Edit only when you truly need to revise; ✕ Clear wipes the note.',
        'Pro tip: keep notes brief (3–6 lines) but consistent. Review weekly to find repeated mistakes and wins.',
      ].join('\n')
    );
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Math.max(20, insets.bottom + 12) }}
          keyboardShouldPersistTaps="handled"
        >
          <LocalHeader
            title="Journal"
            subtitle="Journal every trade. Reflect, improve, repeat."
            onBack={() => router.back()}
          />

          {/* Recent trades + filter + info */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { marginBottom: 0 }]}>Recent Paper Trades</Text>
              <InfoDot onPress={onInfoJournal} />
            </View>

            <View style={styles.chipsRow}>
              {(['ALL', 'BUY', 'SELL'] as Filter[]).map(key => {
                const active = filter === key;
                return (
                  <TouchableOpacity key={key} onPress={() => setFilter(key)} activeOpacity={0.85}>
                    <View style={[styles.chip, active && styles.chipActive]}>
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {key === 'ALL' ? 'All' : key === 'BUY' ? 'Buy' : 'Sell'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {visibleOrders.length === 0 && (
              <Text style={{ color: '#475569' }}>No trades yet. Place one to see it logged here.</Text>
            )}

            {visibleOrders.map(o => {
              // Default: locked on first view; only explicit false means "editing"
              const locked = locks[o.id] !== false;

              return (
                <View key={o.id} style={styles.order}>
                  <View style={styles.orderHeader}>
                    <Text style={styles.side}>
                      {o.side === 'BUY' ? '🟦 BUY' : '🟥 SELL'} {o.qty}{' '}
                      <Text style={styles.sym}>{o.symbol}</Text>
                    </Text>
                    <Text style={styles.price}>${o.price.toFixed(2)}</Text>
                  </View>
                  <Text style={styles.time}>{new Date(o.ts).toLocaleString()}</Text>

                  {/* Toolbar: default shows only ✎ Edit; while editing shows ✕ Clear + ✔ Save */}
                  <View style={styles.toolbar}>
                    {locked ? (
                      <TouchableOpacity
                        onPress={() => unlockNote(o.id)}
                        style={styles.toolbarBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.toolbarText}>✎ Edit</Text>
                      </TouchableOpacity>
                    ) : (
                      <>
                        <TouchableOpacity
                          onPress={() => setNote(o.id, '')}
                          style={[styles.toolbarBtn, styles.toolbarDanger]}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Text style={styles.toolbarText}>✕ Clear</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => lockNote(o.id)}
                          style={[styles.toolbarBtn, styles.toolbarPrimary]}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Text style={[styles.toolbarText, { color: '#fff' }]}>✔ Save</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>

                  <TextInput
                    placeholder={locked ? 'Tap ✎ Edit to add your note…' : 'Add a brief note (setup, trigger, stop/target, size in R, emotions, adherence)…'}
                    value={o.note || ''}
                    onChangeText={t => !locked && setNote(o.id, t)}
                    style={[styles.input, locked && styles.inputLocked]}
                    multiline
                    editable={!locked}
                  />
                </View>
              );
            })}
          </View>

          {/* Improved checklist */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Review Checklist</Text>
            {[
              'Was the position size within your 1R risk?',
              'Did your entry follow the plan/trigger (not impulse)?',
              'Did you honor the initial stop and targets?',
              'What evidence confirmed/invalidated the setup?',
              'What made you make that choice?',
              'One concrete change for next time (rule or process).',
            ].map((x, i) => (
              <Text key={i} style={{ color: '#334155', marginTop: 4 }}>
                • {x}
              </Text>
            ))}
          </View>

          <Text style={{ color: '#475569', marginTop: 14, fontSize: 12 }}>
            Educational use only. Not investment advice.
          </Text>
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
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 8 },

  /* info chip (20px) */
  infoDot: {
    height: 20, width: 20, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#e2e8f0', borderWidth: 1, borderColor: '#cbd5e1',
  },
  infoDotText: { color:'#0f172a', fontWeight:'800', fontSize: 11, lineHeight: 12 },

  chipsRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  chip: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#e2e8f0', borderColor: '#e2e8f0' },
  chipText: { color: '#0f172a', fontWeight: '700' },
  chipTextActive: { color: '#0f172a' },

  order: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)', paddingTop: 10, marginTop: 10 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  side: { fontWeight: '800', color: '#0f172a' },
  sym: { fontWeight: '900', color: '#0f172a' },
  price: { color: '#334155', fontWeight: '700' },
  time: { color: '#64748b', marginBottom: 6 },

  /* toolbar */
  toolbar: { flexDirection: 'row', gap: 8, marginBottom: 6, justifyContent: 'flex-end' },
  toolbarBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#e2e8f0' },
  toolbarPrimary: { backgroundColor: '#0f172a' },
  toolbarDanger: { backgroundColor: '#ef4444' },
  toolbarText: { fontWeight: '800', color: '#0f172a' },

  input: {
    backgroundColor: '#fff',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    minHeight: 72,
    color: '#0f172a',
  },
  inputLocked: {
    backgroundColor: '#f8fafc',
  },
});
