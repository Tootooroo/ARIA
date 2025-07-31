import Voice, {
  SpeechEndEvent,
  SpeechErrorEvent,
  SpeechResultsEvent,
  SpeechStartEvent,
} from '@react-native-voice/voice';
import { useCallback, useEffect, useRef } from 'react';

type Props = {
  onResult: (text: string) => void;
  onError?: (e: SpeechErrorEvent) => void;
};

export const useVoiceRecognition = ({ onResult, onError }: Props) => {
  const isStarted = useRef(false);
  const isMounted = useRef(true);

  // Guard if Voice module isn't available
  const hasVoice = typeof Voice !== 'undefined' && Voice !== null;
  if (!hasVoice) {
    console.warn('[useVoiceRecognition] Voice module not loaded');
  }

  // Handler for results
  const handleSpeechResults = useCallback(
    (event: SpeechResultsEvent) => {
      if (!isMounted.current) return;
      const text = event.value?.join(' ') || '';
      console.log('[🎙️ Voice Input]:', text);
      if (text.trim()) onResult(text);
    },
    [onResult]
  );

  // Handler for errors
  const handleSpeechError = useCallback(
    (e: SpeechErrorEvent) => {
      if (!isMounted.current) return;
      console.error('[❌ Voice Error]:', e);
      onError?.(e);
    },
    [onError]
  );

  useEffect(() => {
    isMounted.current = true;
    if (!hasVoice) return;

    const onSpeechStart = (_: SpeechStartEvent) => {
      console.log('[🔛 Speech Started]');
      isStarted.current = true;
    };

    const onSpeechEnd = (_: SpeechEndEvent) => {
      console.log('[🛑 Speech Ended]');
      isStarted.current = false;
    };

    try {
      Voice.onSpeechStart = onSpeechStart;
      Voice.onSpeechResults = handleSpeechResults;
      Voice.onSpeechError = handleSpeechError;
      Voice.onSpeechEnd = onSpeechEnd;
    } catch (e) {
      console.warn('[useVoiceRecognition] Failed to attach Voice listeners', e);
    }

    return () => {
      isMounted.current = false;
      isStarted.current = false;
      if (!hasVoice) return;
      try {
        // Only try if Voice is an object and not null
        if (Voice && typeof Voice.removeAllListeners === 'function') {
          Voice.removeAllListeners();
        }
      } catch (e) {
        console.warn('[useVoiceRecognition] Failed to remove listeners', e);
      }
      try {
        if (Voice && typeof Voice.destroy === 'function') {
          Voice.destroy();
        }
      } catch (e) {
        console.warn('[useVoiceRecognition] Failed to destroy Voice', e);
      }
    };
  }, [handleSpeechResults, handleSpeechError, hasVoice]);

  const startRecognition = useCallback(async () => {
    if (!hasVoice) return;
    if (isStarted.current) return;
    try {
      await Voice.start('en-US');
      console.log('[🎤 Listening...]');
      isStarted.current = true;
    } catch (e) {
      console.error('[⚠️ Failed to start recognition]:', e);
      isStarted.current = false;
    }
  }, [hasVoice]);

  const stopRecognition = useCallback(async () => {
    if (!hasVoice) return;
    if (!isStarted.current) return;
    try {
      await Voice.stop();
      console.log('[🛑 Stopped Listening]');
    } catch (e) {
      console.error('[⚠️ Failed to stop recognition]:', e);
    } finally {
      isStarted.current = false;
    }
  }, [hasVoice]);

  return { startRecognition, stopRecognition };
};
