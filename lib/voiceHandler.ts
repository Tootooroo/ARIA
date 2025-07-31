import { sendMessageToOpenAI } from '@/lib/api';
import { useAriaStore } from '@/lib/ariatalking';
import * as Speech from 'expo-speech';
import { useCallback, useRef } from 'react';
import { useVoiceRecognition } from './useVoiceRecognition';
import { startWakeWordDetection } from './voiceWakeService';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export const useVoiceFlow = (
  appendMessage: (msg: ChatMessage) => void,
  replaceLastAssistantMessage?: (msg: ChatMessage) => void
) => {
  const isProcessing = useRef(false);

  const { startRecognition, stopRecognition } = useVoiceRecognition({
    onResult: async (text: string) => {
      if (isProcessing.current || !text?.trim()) return;
      isProcessing.current = true;

      appendMessage({ role: 'user', content: text });
      appendMessage({ role: 'assistant', content: '(thinking...)' });

      try {
        const aiReply = await sendMessageToOpenAI([{ role: 'user', content: text }]);
        
        const replyMsg: ChatMessage = { role: 'assistant', content: aiReply };
        if (replaceLastAssistantMessage) {
          replaceLastAssistantMessage(replyMsg);
        } else {
          appendMessage(replyMsg);
        }

        // Stop recognition before speaking
        await stopRecognition();

        useAriaStore.getState().setAriaTalking(true); 

        Speech.speak(aiReply, {
          rate: 1.0,
          onDone: () => {
            useAriaStore.getState().setAriaTalking(false);
            isProcessing.current = false;
            startWakeWordDetection();
          },
          onError: () => {
            useAriaStore.getState().setAriaTalking(false); 
            isProcessing.current = false;
            startWakeWordDetection();
          },
        });
      } catch (err) {
        const warning: ChatMessage = { role: 'assistant', content: '⚠️ Error fetching reply' };
        if (replaceLastAssistantMessage) {
          replaceLastAssistantMessage(warning);
        } else {
          appendMessage(warning);
        }
        // Clean up
        await stopRecognition();
        useAriaStore.getState().setAriaTalking(false);
        isProcessing.current = false;
        startWakeWordDetection();
      }
    },
  });

  // Memoize start/stop to stable identities
  const startVoiceFlow = useCallback(async () => {
    isProcessing.current = false;
    await startRecognition();
  }, [startRecognition]);

  const stopVoiceFlow = useCallback(async () => {
    await stopRecognition();
    isProcessing.current = false;
  }, [stopRecognition]);

  return { startVoiceFlow, stopVoiceFlow };
};