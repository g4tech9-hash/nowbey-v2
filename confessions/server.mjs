import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const DATA_FILE = process.env.DATA_FILE || join(here, 'data', 'confessions.json');
const WHATSAPP_LINK = process.env.WHATSAPP_LINK || '';
const MAX_LEN = 1000;
const MAX_BODY = 10_000;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || randomBytes(9).toString('base64url');
if (!process.env.ADMIN_PASSWORD) {
  console.log(`No ADMIN_PASSWORD set. Using temporary password: ${ADMIN_PASSWORD}`);
}
const ADMIN_HASH = createHash('sha256').update(ADMIN_PASSWORD).digest();

const rate = new Map();
let queue = Promise.resolve();

async function load() {
  if (!existsSync(DATA_FILE)) return [];
  return JSON.parse(await readFile(DATA_FILE, 'utf8'));
}

// Serialises read-modify-write so two requests cannot overwrite each other.
function mutate(fn) {
  const run = queue.then(async () => {
    const items = await load();
    const out = await fn(items);
    await mkdir(dirname(DATA_FILE), { recursive: true });
    await writeFile(DATA_FILE, JSON.stringify(items, null, 2));
    return out;
  });
  queue = run.catch(() => {});
  return run;
}

function cleanText(s) {
  return String(s ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n?/g, '\n')
    .trim()
    .slice(0, MAX_LEN);
}

function send(res, status, body, type = 'application/json; charset=utf-8', headers = {}) {
  const payload = type.startsWith('application/json') ? JSON.stringify(body) : body;
  res.writeHead(status, {
    'Content-Type': type,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
    'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'",
    ...headers,
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error('too large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch {
        reject(new Error('bad json'));
      }
    });
    req.on('error', reject);
  });
}

function isAdmin(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Basic ')) return false;
  const pass = Buffer.from(h.slice(6), 'base64').toString('utf8').split(':').slice(1).join(':');
  const given = createHash('sha256').update(pass).digest();
  return timingSafeEqual(given, ADMIN_HASH);
}

function publicView(c) {
  return { id: c.id, text: c.text, createdAt: c.createdAt };
}

function rateLimited(ip) {
  const now = Date.now();
  const hits = (rate.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_MAX) {
    rate.set(ip, hits);
    return true;
  }
  hits.push(now);
  rate.set(ip, hits);
  return false;
}

async function page(name) {
  return readFile(join(here, 'public', name), 'utf8');
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname;
    const method = req.method;

    if (method === 'GET' && path === '/') {
      return send(res, 200, await page('index.html'), 'text/html; charset=utf-8');
    }

    if (method === 'GET' && path === '/api/config') {
      return send(res, 200, { whatsapp: WHATSAPP_LINK });
    }

    if (method === 'GET' && path === '/api/confessions') {
      const items = (await load()).filter((c) => c.status === 'approved');
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return send(res, 200, items.map(publicView));
    }

    if (method === 'POST' && path === '/api/submit') {
      const ip = req.socket.remoteAddress || 'unknown';
      if (rateLimited(ip)) return send(res, 429, { error: 'Too many submissions. Try again later.' });
      const body = await readBody(req);
      if (body.website) return send(res, 200, { ok: true }); // honeypot: silently accept bots
      const text = cleanText(body.text);
      if (text.length < 10) return send(res, 400, { error: 'Write at least 10 characters.' });
      await mutate((items) => {
        items.push({ id: randomUUID(), text, status: 'pending', createdAt: new Date().toISOString() });
      });
      return send(res, 200, { ok: true, message: 'Sent. It will show once it has been reviewed.' });
    }

    if (path.startsWith('/admin') || path.startsWith('/api/admin')) {
      if (!isAdmin(req)) {
        return send(res, 401, 'Login required', 'text/plain; charset=utf-8', {
          'WWW-Authenticate': 'Basic realm="Confessions admin"',
        });
      }
    }

    if (method === 'GET' && path === '/admin') {
      return send(res, 200, await page('admin.html'), 'text/html; charset=utf-8');
    }

    if (method === 'GET' && path === '/api/admin/confessions') {
      const items = await load();
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return send(res, 200, items);
    }

    const m = path.match(/^\/api\/admin\/confessions\/([0-9a-f-]{36})$/);
    if (m && method === 'POST') {
      const body = await readBody(req);
      const result = await mutate((items) => {
        const item = items.find((c) => c.id === m[1]);
        if (!item) return null;
        if (body.text !== undefined) {
          const text = cleanText(body.text);
          if (text.length < 1) return 'empty';
          item.text = text;
        }
        if (['pending', 'approved', 'rejected'].includes(body.status)) item.status = body.status;
        item.updatedAt = new Date().toISOString();
        return item;
      });
      if (result === null) return send(res, 404, { error: 'Not found' });
      if (result === 'empty') return send(res, 400, { error: 'Text cannot be empty.' });
      return send(res, 200, result);
    }

    if (m && method === 'DELETE') {
      const found = await mutate((items) => {
        const i = items.findIndex((c) => c.id === m[1]);
        if (i === -1) return false;
        items.splice(i, 1);
        return true;
      });
      return found ? send(res, 200, { ok: true }) : send(res, 404, { error: 'Not found' });
    }

    return send(res, 404, { error: 'Not found' });
  } catch (err) {
    const status = err.message === 'too large' ? 413 : err.message === 'bad json' ? 400 : 500;
    if (status === 500) console.error(err);
    return send(res, status, { error: status === 500 ? 'Server error' : err.message });
  }
});

server.listen(PORT, () => console.log(`Confessions running on http://localhost:${PORT}`));
