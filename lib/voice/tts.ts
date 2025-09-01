import * as Speech from 'expo-speech';

let speakTimeout: ReturnType<typeof setTimeout> | null = null;

// Simple observable so other modules (e.g., useVoiceFlow) can track speaking state.
type Listener = (speaking: boolean) => void;
const listeners = new Set<Listener>();
let speaking = false;

function emitSpeaking(next: boolean) {
  if (speaking === next) return;
  speaking = next;
  listeners.forEach((fn) => {
    try { fn(speaking); } catch {}
  });
}

/** Subscribe to TTS speaking state. Returns an unsubscribe function. */
export function onTTSChange(listener: Listener) {
  listeners.add(listener);
  // fire current state immediately
  try { listener(speaking); } catch {}
  return () => listeners.delete(listener);
}

/** Read current speaking state (no subscription). */
export function isSpeaking() {
  return speaking;
}

/**
 * Speaks the given text aloud.
 * Cancels any ongoing speech first to avoid overlap.
 */
export async function speak(text: string, lang = 'en-US') {
  if (!text || text.trim().length < 2) return; // skip empty/short text

  // Clear any scheduled speak to debounce rapid calls
  if (speakTimeout) {
    clearTimeout(speakTimeout);
    speakTimeout = null;
  }

  // Debounce by 200ms — avoids speaking partial fragments
  speakTimeout = setTimeout(() => {
    try {
      // Stop any ongoing speech before starting
      Speech.stop();

      Speech.speak(text, {
        language: lang,
        rate: 1.0,
        pitch: 1.0,
        onStart: () => emitSpeaking(true),
        onDone: () => emitSpeaking(false),
        onStopped: () => emitSpeaking(false),
        onError: () => emitSpeaking(false),
      });
    } catch (err) {
      console.warn('TTS error:', err);
      emitSpeaking(false);
    }
  }, 200);
}

/**
 * Stops any ongoing speech immediately.
 */
export async function stopSpeak() {
  try {
    if (speakTimeout) {
      clearTimeout(speakTimeout);
      speakTimeout = null;
    }
    Speech.stop();
  } catch (err) {
    console.warn('StopSpeak error:', err);
  } finally {
    emitSpeaking(false);
  }
}
