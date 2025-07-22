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
      if (onError) onError(e);
    },
    [onError]
  );

  useEffect(() => {
    isMounted.current = true;

    const onSpeechStart = (_: SpeechStartEvent) => {
      console.log('[🔛 Speech Started]');
      isStarted.current = true;
    };

    const onSpeechEnd = (_: SpeechEndEvent) => {
      console.log('[🛑 Speech Ended]');
      isStarted.current = false;
    };

    // Attach listeners
    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechResults = handleSpeechResults;
    Voice.onSpeechError = handleSpeechError;
    Voice.onSpeechEnd = onSpeechEnd;

    // Cleanup on unmount
    return () => {
      isMounted.current = false;
      Voice.destroy().then(Voice.removeAllListeners);
      isStarted.current = false;
    };
  }, [handleSpeechResults, handleSpeechError]);

  const startRecognition = async () => {
    if (isStarted.current) return;
    try {
      await Voice.start('en-US');
      isStarted.current = true;
      console.log('[🎤 Listening...]');
    } catch (e) {
      console.error('[⚠️ Failed to start recognition]:', e);
      isStarted.current = false;
    }
  };

  const stopRecognition = async () => {
    try {
      await Voice.stop();
      isStarted.current = false;
      console.log('[🛑 Stopped Listening]');
    } catch (e) {
      console.error('[⚠️ Failed to stop recognition]:', e);
    }
  };

  return { startRecognition, stopRecognition };
};