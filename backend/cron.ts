// backend/http/cron.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { evaluateAndTrade } from './strategy';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function unauthorized(res: VercelResponse) {
  return res.status(401).json({ ok: false, error: 'unauthorized' });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS / no-cache
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  res.setHeader('Cache-Control', 'no-store');

  // Preflight
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(405).json({ ok: false, error: 'method not allowed' });
  }

  // Optional auth: set CRON_SECRET to require a bearer token
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : req.query.token;
    if (token !== secret) return unauthorized(res);
  }

  const started = Date.now();
  try {
    // Optional: run a single user if provided ?userId=...
    const userId = (req.query.userId as string | undefined) ?? undefined;

    // Today: single run (env creds or per-user if provided)
    // Future: iterate known userIds and call evaluateAndTrade(userId) per user
    const out = await evaluateAndTrade(userId);

    const tookMs = Date.now() - started;
    return res.status(200).json({
      ok: true,
      ran: true,
      userId: userId || null,
      tookMs,
      ts: new Date().toISOString(),
      ...out, // logs, opened, openOrders, equity, dayPL (from strategy)
    });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      error: e?.response?.data?.message || e?.message || 'cron failed',
    });
  }
}
