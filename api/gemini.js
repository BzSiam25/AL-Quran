// Vercel serverless function: keeps the Gemini API key on the server.
// The browser posts { contents } here; this function adds the key, tries each
// model in order (falling back when one is busy or unavailable), and streams
// Gemini's server-sent events straight back to the browser.
//
// Only signed-in users can use it: the browser must send its Firebase ID token.
//
// Set GEMINI_API_KEY and FIREBASE_CONFIG in Vercel → Project → Settings → Environment Variables.

import { verifyUser } from './_firebase.js';

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST' });
  }

  const uid = await verifyUser(req);
  if (!uid) return res.status(401).json({ error: 'Explain আর Ask ব্যবহার করতে আগে Google দিয়ে সাইন ইন করুন।', code: 'signin' });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: 'সার্ভারে GEMINI_API_KEY সেট করা নেই।' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  const contents = body && body.contents;

  const valid = Array.isArray(contents) && contents.length > 0 && contents.length <= MAX_TURNS &&
    contents.every(c => c && (c.role === 'user' || c.role === 'model') &&
      Array.isArray(c.parts) && c.parts.every(p => p && typeof p.text === 'string'));
  if (!valid) return res.status(400).json({ error: 'Invalid request' });
  if (JSON.stringify(contents).length > MAX_BODY_CHARS) return res.status(413).json({ error: 'প্রশ্নটা অনেক বড়।' });

  // Stop paying for Gemini if the reader presses Stop or closes the page.
  const ctl = new AbortController();
  req.on('close', () => { if (!res.writableEnded) ctl.abort(); });

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
      return res.status(upstream.status).json({ error: msg });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Gemini-Model': model,
    });
    try {
      for await (const chunk of upstream.body) res.write(chunk);
    } catch (e) {
      // reader left or the stream broke mid-answer; what was sent stays on screen
    }
    return res.end();
  }

  res.status(503).json({
    error: lastErr || 'সার্ভার অতিরিক্ত ব্যস্ত রয়েছে। অনুগ্রহ করে কয়েক সেকেন্ড পর আবার চেষ্টা করুন।',
  });
}
