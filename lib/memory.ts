import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit as limitFn,
  orderBy,
  query
} from 'firebase/firestore';
import { db } from './firebaseclient';

// --- SHARED TYPE ---
export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
};

// --- STORE USER MESSAGE ---
export async function storeUserMessage(userId: string, content: string) {
  await addDoc(
    collection(doc(collection(db, 'memory'), userId), 'history'),
    {
      role: 'user',
      content,
      timestamp: Date.now(),
    }
  );
}

// --- STORE ASSISTANT REPLY ---
export async function storeAssistantReply(userId: string, content: string) {
  await addDoc(
    collection(doc(collection(db, 'memory'), userId), 'history'),
    {
      role: 'assistant',
      content,
      timestamp: Date.now(),
    }
  );
}

// --- GET USER MEMORY (returns ChatMessage[]) ---
export async function getUserMemory(userId: string, limit = 10): Promise<ChatMessage[]> {
  const q = query(
    collection(doc(collection(db, 'memory'), userId), 'history'),
    orderBy('timestamp', 'desc'),
    limitFn(limit)
  );
  const snapshot = await getDocs(q);

  // Reverse so oldest is first
  return snapshot.docs
    .map(doc => doc.data())
    .reverse()
    .map(data => ({
      role: data.role as 'user' | 'assistant',
      content: String(data.content),
      timestamp: Number(data.timestamp),
    }));
}
