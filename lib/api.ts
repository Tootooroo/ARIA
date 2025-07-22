import axios from 'axios';

const API_URL = 'https://ai-companion-juy3y390e-totoros-projects-592ad49a.vercel.app/api/chat'; // replace with deployed URL

export const sendMessageToOpenAI = async (
  messages: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> => {
  try {
    const res = await axios.post(API_URL, { messages });

    const data = res.data;
    return data.reply?.trim() || '🤖 (No response)';
  } catch (error) {
    console.error('API Proxy Error:', error);
    return '⚠️ Sorry, there was a problem connecting to the AI.';
  }
};