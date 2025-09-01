import { sendMessageToOpenAI } from '@/lib/api';
// ❌ remove these to avoid double-writes (server persists already)
// import { storeAssistantReply, storeUserMessage } from '@/lib/memory';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useAriaStore } from './ariatalking';
import { initSTT, startSTT, stopSTT } from './stt';
import { stopSpeak as stopTTS } from './tts';

type Msg = { role: 'user' | 'assistant'; content: string };

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

function speakWithAnim(text: string, onDone?: () => void) {
  useAriaStore.getState().setAriaTalking(true);
  Speech.speak(text, {
    language: 'en-US',
    rate: Platform.select({ ios: 0.5, android: 1.0 }),
    pitch: 1.0,
    onDone: () => { useAriaStore.getState().setAriaTalking(false); onDone?.(); },
    onStopped: () => { useAriaStore.getState().setAriaTalking(false); onDone?.(); },
    onError: () => { useAriaStore.getState().setAriaTalking(false); onDone?.(); },
  });
}

/**
 * Push-to-talk:
 * - tap to start; tap again to stop
 * - on stop, send buffered text to model and speak reply
 * - ✅ server persists both sides, so we only update local UI store
 */
export function useVoiceFlow(
  addMessage: (m: Msg) => void,
  replaceThinking: (m: Msg) => void,
  userId?: string, // pass Clerk userId from the screen that uses this hook
) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const bufferRef = useRef<string>('');
  const lastPartialRef = useRef<string>('');

  const processFinal = useCallback(async (text: string) => {
    const cleaned = (text || '').trim();
    if (!cleaned) return;

    // show locally (immediate UX)
    addMessage({ role: 'user', content: cleaned });

    // thinking placeholder
    replaceThinking({ role: 'assistant', content: '(thinking...)' });

    try {
      // 👇 send userId so the backend stores under the right doc
      const reply = await sendMessageToOpenAI([{ role: 'user', content: cleaned }], userId);
      const replyStr = typeof reply === 'string' ? reply : String(reply ?? '');

      // replace placeholder in UI
      replaceThinking({ role: 'assistant', content: replyStr });

      // TTS
      setIsSpeaking(true);
      await stopTTS();
      speakWithAnim(replyStr, () => setIsSpeaking(false));
    } catch {
      replaceThinking({
        role: 'assistant',
        content: '⚠️ Something went wrong. Please try again.',
      });
      setIsSpeaking(false);
    }
  }, [addMessage, replaceThinking, userId]);

  useEffect(() => {
    initSTT({
      onStart: () => {},
      onEnd: () => {},
      onError: () => {},
      onPartial: (t) => {
        lastPartialRef.current = t || '';
        if (!bufferRef.current) bufferRef.current = t || '';
      },
      onFinal: (t) => {
        bufferRef.current = (t || bufferRef.current || '').trim();
      },
    });

    return () => {
      stopTTS();
      useAriaStore.getState().setAriaTalking(false);
    };
  }, []);

  const startVoiceFlow = useCallback(async () => {
    if (isSpeaking) {
      await stopTTS();
      useAriaStore.getState().setAriaTalking(false);
    }
    bufferRef.current = '';
    lastPartialRef.current = '';
    await startSTT('en-US');
    setIsListening(true);
  }, [isSpeaking]);

  const stopVoiceFlow = useCallback(async () => {
    try {
      await stopSTT();
      // give native ASR a moment to flush finals
      const deadline = Date.now() + 900;
      while (!bufferRef.current && !lastPartialRef.current && Date.now() < deadline) {
        await sleep(150);
      }
    } finally {
      const text = (bufferRef.current || lastPartialRef.current || '').trim();
      bufferRef.current = '';
      lastPartialRef.current = '';

      if (text) await processFinal(text);
      setIsListening(false);
    }
  }, [processFinal]);

  const toggleVoiceFlow = useCallback(async () => {
    if (isListening) return stopVoiceFlow();
    return startVoiceFlow();
  }, [isListening, startVoiceFlow, stopVoiceFlow]);

  return { startVoiceFlow, stopVoiceFlow, toggleVoiceFlow, isListening, isSpeaking };
}
