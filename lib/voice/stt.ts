import Voice, {
  SpeechEndEvent,
  SpeechErrorEvent,
  SpeechResultsEvent,
  SpeechStartEvent,
  SpeechVolumeChangeEvent,
} from '@react-native-voice/voice';
import { PermissionsAndroid, Platform } from 'react-native';

export async function requestMicPermissions() {
  if (Platform.OS === 'android') {
    const res = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
    );
    return res === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
}

type Handlers = {
  onPartial?: (text: string) => void; // live UI updates only
  onFinal?: (text: string) => void;   // send AI request here only
  onError?: (msg: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
};

type VoiceTextEvent = { value?: string[] };
type VoiceErr = { error?: { message?: string } | string };

let subs: { remove: () => void }[] = [];
let initialized = false;
let recognizing = false;
let currentHandlers: Handlers | null = null;

function removeRNListeners() {
  subs.forEach((s) => {
    try { s.remove(); } catch {}
  });
  subs = [];
}

function subscribe() {
  const vAny = Voice as any;
  const hasAdd = typeof vAny.addListener === 'function';

  removeRNListeners();

  if (hasAdd) {
    subs = [
      vAny.addListener('onSpeechStart', (_e: SpeechStartEvent) => {
        currentHandlers?.onStart?.();
      }),
      vAny.addListener('onSpeechEnd', (_e: SpeechEndEvent) => {
        currentHandlers?.onEnd?.();
        recognizing = false;
      }),
      vAny.addListener('onSpeechPartialResults', (e: VoiceTextEvent) => {
        const p = e?.value?.[0] ?? '';
        if (p) currentHandlers?.onPartial?.(p); // do NOT send to AI
      }),
      vAny.addListener('onSpeechResults', (e: SpeechResultsEvent | VoiceTextEvent) => {
        const t = (e as VoiceTextEvent)?.value?.[0] ?? '';
        if (t) currentHandlers?.onFinal?.(t); // send to AI ONLY here
      }),
      vAny.addListener('onSpeechError', (e: SpeechErrorEvent | VoiceErr) => {
        const err = (e as VoiceErr)?.error;
        const msg = typeof err === 'string' ? err : err?.message || 'Speech error';
        currentHandlers?.onError?.(msg);
        recognizing = false;
      }),
      vAny.addListener('onSpeechVolumeChanged', (_e: SpeechVolumeChangeEvent) => {}),
    ];
    return;
  }

  // Legacy API fallback
  const prev = {
    onSpeechStart: vAny.onSpeechStart,
    onSpeechEnd: vAny.onSpeechEnd,
    onSpeechPartialResults: vAny.onSpeechPartialResults,
    onSpeechResults: vAny.onSpeechResults,
    onSpeechError: vAny.onSpeechError,
    onSpeechVolumeChanged: vAny.onSpeechVolumeChanged,
  };

  vAny.onSpeechStart = (_e: SpeechStartEvent) => currentHandlers?.onStart?.();
  vAny.onSpeechEnd = (_e: SpeechEndEvent) => {
    currentHandlers?.onEnd?.();
    recognizing = false;
  };
  vAny.onSpeechPartialResults = (e: VoiceTextEvent) => {
    const p = e?.value?.[0] ?? '';
    if (p) currentHandlers?.onPartial?.(p);
  };
  vAny.onSpeechResults = (e: SpeechResultsEvent | VoiceTextEvent) => {
    const t = (e as VoiceTextEvent)?.value?.[0] ?? '';
    if (t) currentHandlers?.onFinal?.(t);
  };
  vAny.onSpeechError = (e: SpeechErrorEvent | VoiceErr) => {
    const err = (e as VoiceErr)?.error;
    const msg = typeof err === 'string' ? err : err?.message || 'Speech error';
    currentHandlers?.onError?.(msg);
    recognizing = false;
  };
  vAny.onSpeechVolumeChanged = (_e: SpeechVolumeChangeEvent) => {};

  subs = [
    {
      remove: () => {
        vAny.onSpeechStart = prev.onSpeechStart ?? undefined;
        vAny.onSpeechEnd = prev.onSpeechEnd ?? undefined;
        vAny.onSpeechPartialResults = prev.onSpeechPartialResults ?? undefined;
        vAny.onSpeechResults = prev.onSpeechResults ?? undefined;
        vAny.onSpeechError = prev.onSpeechError ?? undefined;
        vAny.onSpeechVolumeChanged = prev.onSpeechVolumeChanged ?? undefined;
      },
    },
  ];
}

/** Initialize STT and attach handlers. Safe to call multiple times. */
export async function initSTT(h: Handlers) {
  // Update handlers first so we never run with empty callbacks
  currentHandlers = h ?? currentHandlers;
  if (!initialized) {
    subscribe();
    initialized = true;
  }
}

/** Update handlers without re-subscribing/destroying. */
export function setSTTHandlers(h: Handlers) {
  currentHandlers = h ?? currentHandlers;
}

export async function startSTT(locale = 'en-US') {
  // Ensure we are subscribed but do NOT overwrite handlers with {}
  if (!initialized) {
    subscribe();
    initialized = true;
  }

  if (recognizing) {
    // already running; avoid double-start errors
    return;
  }

  try { await Voice.stop(); } catch {}
  try { await Voice.cancel(); } catch {}

  try {
    recognizing = true;
    await Voice.start(locale);
  } catch (e) {
    recognizing = false;
    // forward an error to any listener
    const msg = e instanceof Error ? e.message : 'Voice start error';
    currentHandlers?.onError?.(msg);
    throw e;
  }
}

export async function stopSTT() {
  try { await Voice.stop(); } catch {}
  recognizing = false;
}

export async function cleanupSTT() {
  try { await Voice.stop(); } catch {}
  try { await Voice.cancel(); } catch {}
  try { removeRNListeners(); } catch {}
  try { await Voice.destroy(); } catch {}
  recognizing = false;
  initialized = false;
  currentHandlers = null;
}
