// api/cron.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import backendHandler from '../backend/cron';

export default function handler(req: VercelRequest, res: VercelResponse) {
  return backendHandler(req, res);
}
