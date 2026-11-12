const json = (status, body) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...(status === 405 ? { Allow: 'POST' } : {}) } });
import { verifyUser } from '../../api/_firebase.js';

const MODELS = [
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
];

const MAX_BODY_CHARS = 200_000; // stops someone sending huge prompts on your key
const MAX_TURNS = 40;

function isRetryable(status, msg) {
  return status === 429 || status === 503 || status === 404 ||
    /demand|busy|available|overloaded/i.test(msg);
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return json(405, { error: 'Use POST' });
  }

  const uid = await verifyUser({ headers: { authorization: req.headers.get('authorization') } });
  if (!uid) return json(401, { error: 'Explain আর Ask ব্যবহার করতে আগে Google দিয়ে সাইন ইন করুন।', code: 'signin' });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return json(500, { error: 'সার্ভারে GEMINI_API_KEY সেট করা নেই।' });

  let body;
  try { body = await req.json(); } catch { body = null; }
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  const contents = body && body.contents;

  const valid = Array.isArray(contents) && contents.length > 0 && contents.length <= MAX_TURNS &&
    contents.every(c => c && (c.role === 'user' || c.role === 'model') &&
      Array.isArray(c.parts) && c.parts.every(p => p && typeof p.text === 'string'));
  if (!valid) return json(400, { error: 'Invalid request' });
  if (JSON.stringify(contents).length > MAX_BODY_CHARS) return json(413, { error: 'প্রশ্নটা অনেক বড়।' });

  // Stop paying for Gemini if the reader presses Stop or closes the page.
  const ctl = new AbortController();
  req.signal.addEventListener('abort', () => ctl.abort(), { once: true });

  let lastErr = '';
  for (const model of MODELS) {
    if (ctl.signal.aborted) return;
    let upstream;
    try {
      upstream = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({ contents }),
          signal: ctl.signal,
        }
      );
    } catch (e) {
      if (ctl.signal.aborted) return;
      lastErr = e.message || String(e);
      continue;
    }

    if (!upstream.ok) {
      let msg = `Gemini API error (${upstream.status})`;
      try { const j = await upstream.json(); if (j.error?.message) msg = j.error.message; } catch {}
      lastErr = msg;
      if (isRetryable(upstream.status, msg)) continue;
      return json(upstream.status, { error: msg });
    }

    return new Response(upstream.body, { status: 200, headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Gemini-Model': model,
    }});
  }

  return json(503, {
    error: lastErr || 'সার্ভার অতিরিক্ত ব্যস্ত রয়েছে। অনুগ্রহ করে কয়েক সেকেন্ড পর আবার চেষ্টা করুন।',
  });
}

export const config = { path: '/api/gemini' };
