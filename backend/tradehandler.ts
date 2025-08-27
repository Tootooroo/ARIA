// backend/tradehandler.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleTradingQuery } from './trading';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS + no-cache
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  res.setHeader('Cache-Control', 'no-store');

  // Preflight
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res
      .status(405)
      .json({ ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } });
  }

  // Parse body (supports object or string)
  let body: any = {};
  try {
    if (typeof req.body === 'string') {
      body = req.body.trim() ? JSON.parse(req.body) : {};
    } else if (typeof req.body === 'object' && req.body !== null) {
      body = req.body;
    } else {
      body = {}; // nothing to parse
    }
  } catch {
    return res
      .status(400)
      .json({ ok: false, error: { code: 'BAD_JSON', message: 'Invalid JSON body' } });
  }

  // Support both {intent, params} and legacy {action, ...}
  const intent = body.intent || body.action;
  const params = body.params ?? (body.action ? { ...body } : {});
  if (!intent) {
    return res
      .status(400)
      .json({ ok: false, error: { code: 'MISSING_INTENT', message: 'Missing intent' } });
  }
  delete params.intent;
  delete params.action;

  try {
    const result = await handleTradingQuery(intent, params);
    const status = result.ok ? 200 : 400;
    return res.status(status).json(result);
  } catch (e: any) {
    const message =
      e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Server error';
    return res.status(500).json({ ok: false, error: { code: 'SERVER_ERROR', message } });
  }
}
