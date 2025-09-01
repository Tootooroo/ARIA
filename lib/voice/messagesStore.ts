import type { ChatMessage } from '@/lib/memory';
import { create } from 'zustand';

type Updater =
  | ChatMessage[]
  | ((prev: ChatMessage[]) => ChatMessage[]);

export type MessagesStore = {
  messages: ChatMessage[];

  /** Sets the whole list.
   *  Supports either an array or a functional updater (prev => next). */
  setAll: (next: Updater) => void;

  /** Append one message. */
  addMessage: (m: ChatMessage) => void;

  /** Append many messages atomically. */
  addMany: (arr: ChatMessage[]) => void;

  /** Replace the most recent "(thinking...)" assistant bubble with a real reply.
   *  If not found, appends the reply. */
  replaceThinking: (m: ChatMessage) => void;

  /** Clear all messages. */
  clear: () => void;
};

export const useMessagesStore = create<MessagesStore>((set, get) => ({
  messages: [],

  setAll: (next) =>
    set((state) => ({
      messages:
        typeof next === 'function'
          ? (next as (prev: ChatMessage[]) => ChatMessage[])(state.messages)
          : (next ?? []),
    })),

  addMessage: (m) =>
    set((state) => ({ messages: [...state.messages, m] })),

  addMany: (arr) =>
    set((state) => ({ messages: [...state.messages, ...arr] })),

  replaceThinking: (m) =>
    set((state) => {
      const msgs = state.messages.slice();
      for (let i = msgs.length - 1; i >= 0; i--) {
        const it = msgs[i];
        if (it.role === 'assistant' && it.content === '(thinking...)') {
          msgs[i] = m;
          return { messages: msgs };
        }
      }
      // If no thinking bubble found, append
      return { messages: [...msgs, m] };
    }),

  clear: () => set({ messages: [] }),
}));
