import crypto from 'crypto';

const SECRET = process.env.AUTH_SECRET || '';
const PRIVATE_UPSTREAMS = (process.env.RPC_URLS || '').split(',').map(s => s.trim()).filter(Boolean);
const PUBLIC_UPSTREAMS = [
  'https://bsc-dataseed.binance.org',
  'https://bsc-dataseed1.defibit.io',
  'https://bsc-dataseed2.defibit.io',
  'https://bsc-dataseed3.ninicoin.io',
  'https://bsc-dataseed2.bnbchain.org',
  'https://bsc-dataseed3.bnbchain.org',
  'https://bsc-rpc.publicnode.com',
  'https://bsc.drpc.org',
  'https://rpc.ankr.com/bsc',
];
const LIMIT_PATTERN = /rate limit|too many|limit exceeded|request exceeded|capacity|forbidden/i;

function verifyToken(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return false;
  const [address, exp, sig] = parts;
  const expected = crypto.createHmac('sha256', SECRET).update(`${address}.${exp}`).digest('hex');
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  return Number(exp) > Math.floor(Date.now() / 1000);
}

function shuffle(list) {
  return [...list].sort(() => Math.random() - 0.5);
}

function isLimited(text) {
  try {
    const data = JSON.parse(text);
    const items = Array.isArray(data) ? data : [data];
    return items.some(item => item?.error && LIMIT_PATTERN.test(String(item.error.message || '')));
  } catch {
    return true;
  }
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  if (!SECRET) return { statusCode: 500, body: 'AUTH_SECRET not configured' };
  const headers = event.headers || {};
  const auth = headers.authorization || headers.Authorization || '';
  if (!verifyToken(auth.replace(/^Bearer\s+/i, ''))) return { statusCode: 401, body: 'Unauthorized' };
  const body = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  for (const url of [...shuffle(PRIVATE_UPSTREAMS), ...shuffle(PUBLIC_UPSTREAMS)]) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) continue;
      const text = await res.text();
      if (isLimited(text)) continue;
      return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: text };
    } catch {}
  }
  return { statusCode: 502, body: 'Bad Gateway' };
};
