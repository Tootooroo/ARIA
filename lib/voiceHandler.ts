import { sendMessageToOpenAI } from '@/lib/api';
import { useAriaStore } from '@/lib/ariatalking';
import * as Speech from 'expo-speech';
import { useRef } from 'react';
import { useVoiceRecognition } from './useVoiceRecognition';

//let response = '';
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
        // If you want full context, pass chat history instead of just user text!
        const aiReply = await sendMessageToOpenAI([{ role: 'user', content: text }]);
        
        // Replace the "(thinking...)" with the actual reply if function provided
        if (replaceLastAssistantMessage) {
          replaceLastAssistantMessage({ role: 'assistant', content: aiReply });
        } else {
          appendMessage({ role: 'assistant', content: aiReply });
        }

        useAriaStore.getState().setAriaTalking(true); // <-- Start mouth

        // Speak out the response
        Speech.speak(aiReply, {
          rate: 1.0,
          onDone: () => {
            useAriaStore.getState().setAriaTalking(false); // <-- Stop mouth
            isProcessing.current = false;
            startRecognition(); // Restart listening after speech finishes
          },
          onError: () => {
            useAriaStore.getState().setAriaTalking(false); // <-- Stop mouth
            isProcessing.current = false;
            startRecognition(); // Still restart even if TTS failed
          },
        });
      } catch (err) {
        if (replaceLastAssistantMessage) {
          replaceLastAssistantMessage({
            role: 'assistant',
            content: '⚠️ Error fetching reply',
          });
        } else {
          appendMessage({
            role: 'assistant',
            content: '⚠️ Error fetching reply',
          });
        }
        useAriaStore.getState().setAriaTalking(false); // <-- Stop mouth on error!
        isProcessing.current = false;
        startRecognition();
      }
    },
  });

  const startVoiceFlow = async () => {
    isProcessing.current = false;
    await startRecognition();
  };

  const stopVoiceFlow = async () => {
    await stopRecognition();
    isProcessing.current = false;
  };

  return { startVoiceFlow, stopVoiceFlow };
};