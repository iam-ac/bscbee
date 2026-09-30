import crypto from 'crypto';

const SECRET = process.env.AUTH_SECRET || '';
const UPSTREAMS = [
  'https://bsc-dataseed.binance.org',
  'https://bsc-dataseed1.defibit.io',
  'https://bsc-dataseed2.defibit.io',
  'https://bsc-dataseed3.ninicoin.io',
  'https://bsc-dataseed2.bnbchain.org',
  'https://bsc-dataseed3.bnbchain.org',
];

function verifyToken(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return false;
  const [address, exp, sig] = parts;
  const expected = crypto.createHmac('sha256', SECRET).update(`${address}.${exp}`).digest('hex');
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  return Number(exp) > Math.floor(Date.now() / 1000);
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  if (!SECRET) return { statusCode: 500, body: 'AUTH_SECRET not configured' };
  const headers = event.headers || {};
  const auth = headers.authorization || headers.Authorization || '';
  if (!verifyToken(auth.replace(/^Bearer\s+/i, ''))) return { statusCode: 401, body: 'Unauthorized' };
  const body = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  for (const url of UPSTREAMS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
      });
      if (!res.ok) continue;
      return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: await res.text() };
    } catch {}
  }
  return { statusCode: 502, body: 'Bad Gateway' };
};
