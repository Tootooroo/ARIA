import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { getUserMemory, storeAssistantReply, storeUserMessage } from './memory';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Missing OpenAI API key in environment variables' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;

  try {
    const userId = (req.body.userId || 'default').replace(/[^\w-]/g, '');
    const lastUserMessage = messages?.[messages.length - 1]?.content || '';

    // Store latest user message
    await storeUserMessage(userId, lastUserMessage);

    // Load memory history
    const memory = await getUserMemory(userId);

    // Combine memory with current input
    const promptMessages = [...memory, ...messages];

    // Ask OpenAI
    const openaiRes = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: promptMessages,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const reply = openaiRes.data.choices?.[0]?.message?.content?.trim() || '🤖 (No response)';
    await storeAssistantReply(userId, reply);
    res.status(200).json({ reply });
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
