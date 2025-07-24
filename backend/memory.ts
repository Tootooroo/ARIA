import { db } from './firebase';

// --- SHARED TYPE ---
export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
};

// --- STORE USER MESSAGE ---
export async function storeUserMessage(userId: string, content: string) {
  await db.collection('memory').doc(userId).collection('history').add({
    role: 'user',
    content,
    timestamp: Date.now(),
  });
}

// --- STORE ASSISTANT REPLY ---
export async function storeAssistantReply(userId: string, content: string) {
  await db.collection('memory').doc(userId).collection('history').add({
    role: 'assistant',
    content,
    timestamp: Date.now(),
  });
}

// --- GET USER MEMORY (returns ChatMessage[]) ---
export async function getUserMemory(userId: string, limit = 10): Promise<ChatMessage[]> {
  const snapshot = await db
    .collection('memory')
    .doc(userId)
    .collection('history')
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs
    .map((doc) => doc.data())
    .reverse()
    .map((data) => ({
      role: data.role as 'user' | 'assistant',
      content: String(data.content),
      timestamp: Number(data.timestamp),
    })) as ChatMessage[];
}
