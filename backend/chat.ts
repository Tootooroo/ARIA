import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { getUserMemory, storeAssistantReply, storeUserMessage } from './memory';

const SYSTEM_PROMPT = `
You are ARIA, a warm, caring, and capable companion.
Adapt to the user's mood; be concise for factual answers.
Never say you're an AI. Prioritize clarity, empathy, and usefulness.
`;

type Msg = { role: 'system' | 'user' | 'assistant'; content: string };

function normalizeMessages(raw: any): Msg[] {
  const arr = Array.isArray(raw) ? raw : [];
  const msgs = arr
    .map((m: any) => ({ role: m?.role, content: String(m?.content ?? '') }))
    .filter(
      (m: any) =>
        (m.role === 'system' || m.role === 'user' || m.role === 'assistant') &&
        m.content.length > 0
    ) as Msg[];
  const sysIdx = msgs.findIndex((m) => m.role === 'system');
  if (sysIdx > 0) {
    const sys = msgs[sysIdx];
    const rest = msgs.filter((_, i) => i !== sysIdx);
    return [sys, ...rest];
  }
  return msgs;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Missing OPENAI_API_KEY' });

  try {
    const hasServerStorePayload = typeof req.body?.text === 'string' && !!req.body?.userId;

    // ===== Path A: server-stored memory (recommended with locked rules)
    if (hasServerStorePayload) {
      const userId = String(req.body.userId || 'default').replace(/[^\w-]/g, '');
      const text = String(req.body.text).trim();
      if (!text) return res.status(400).json({ error: 'text required' });

      await storeUserMessage(userId, text);

      const memory = await getUserMemory(userId, 200);
      const context = memory.slice(-20).map((m) => ({ role: m.role, content: m.content })) as Msg[];

      const openaiRes = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          temperature: 0.7,
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...context, { role: 'user', content: text }],
        },
        { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
      );

      const reply = openaiRes.data?.choices?.[0]?.message?.content?.trim() ?? '🤖 (No response)';
      await storeAssistantReply(userId, reply);
      return res.status(200).json({ reply });
    }

    // ===== Path B: stateless proxy (old callers)
    const messages = normalizeMessages(req.body?.messages);
    if (messages.length === 0) return res.status(400).json({ error: 'messages[] required' });

    const openaiRes = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      { model: 'gpt-4o-mini', temperature: 0.7, messages },
      { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
    );
    const reply = openaiRes.data?.choices?.[0]?.message?.content?.trim() ?? '🤖 (No response)';
    return res.status(200).json({ reply });
  } catch (error: any) {
    console.error('OpenAI Proxy Error:', {
      message: error.message,
      responseData: error?.response?.data,
      status: error?.response?.status,
    });
    return res.status(500).json({
      error: 'Failed to fetch from OpenAI',
      detail: error?.response?.data || error.message,
    });
  }
}
