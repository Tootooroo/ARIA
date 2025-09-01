import { db } from './firebase';
import { getSettings, saveSettings, toggleAutotrade } from './settings';

export type Ok<T>  = { ok: true; data: T; ts: string };
export type Err    = { ok: false; error: { code?: string; message: string }; ts: string };
export type Res<T> = Ok<T> | Err;
const ts = () => new Date().toISOString();
const ok = <T,>(data: T): Ok<T> => ({ ok: true, data, ts: ts() });
const err = (message: string, code = 'ERROR'): Err => ({ ok: false, error: { code, message }, ts: ts() });

export async function handleTradingQuery(intent: string, params: any): Promise<Res<any>> {
  try {
    switch (intent) {
      case 'ping': return ok({ pong: true });

      // -------- Settings (optional cloud) --------
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

      // -------- Activity logs (optional cloud) --------
      case 'appendActivityLogs': {
        const userId = String(params?.userId || '');
        if (!userId) return err('userId required', 'BAD_REQUEST');
        const items: Array<{ ts: number; message: string }> = Array.isArray(params?.items) ? params.items : [];
        if (!items.length) return ok({ appended: 0 });

        if (db) {
          const col = db.collection('users').doc(userId).collection('logs');
          const batch = db.batch();
          for (const it of items) {
            const id = String(it.ts || Date.now());
            batch.set(col.doc(id), { ts: it.ts || Date.now(), message: String(it.message || '') });
          }
          await batch.commit();
        }
        return ok({ appended: items.length });
      }

      case 'activityLogs': {
        const userId = String(params?.userId || '');
        if (!userId) return err('userId required', 'BAD_REQUEST');
        if (!db) return ok({ items: [] });
        const snap = await db
          .collection('users').doc(userId)
          .collection('logs')
          .orderBy('ts', 'desc')
          .limit(500)
          .get();
        return ok({ items: snap.docs.map(d => d.data()) });
      }

      // -------- Explicitly gone routes --------
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
  } catch (e: any) {
    return err(e?.message || 'Server error', 'SERVER');
  }
}
