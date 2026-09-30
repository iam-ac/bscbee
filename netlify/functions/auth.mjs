import crypto from 'crypto';
import { verifyMessage } from 'ethers';

const SECRET = process.env.AUTH_SECRET || '';
const MESSAGE_PATTERN = /^HoneyBee verify:\n(0x[0-9a-fA-F]{40})\n(\d+)$/;
const TOKEN_TTL = 3600;

function sign(payload) {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  if (!SECRET) return { statusCode: 500, body: 'AUTH_SECRET not configured' };
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: 'Invalid body' };
  }
  const message = String(body.message || '');
  const signature = String(body.signature || '');
  const match = message.match(MESSAGE_PATTERN);
  if (!match || !signature) return { statusCode: 400, body: 'Invalid message' };
  const address = match[1].toLowerCase();
  const timestamp = Number(match[2]);
  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > 300) return { statusCode: 401, body: 'Message expired' };
  let recovered;
  try {
    recovered = verifyMessage(message, signature).toLowerCase();
  } catch {
    return { statusCode: 401, body: 'Invalid signature' };
  }
  if (recovered !== address) return { statusCode: 401, body: 'Address mismatch' };
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL;
  const payload = `${address}.${exp}`;
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: `${payload}.${sign(payload)}`, exp }),
  };
};
