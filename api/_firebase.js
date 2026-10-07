// Shared helpers for the API routes (files starting with "_" are not routes on Vercel).
import { createRemoteJWKSet, jwtVerify } from 'jose';

// FIREBASE_CONFIG holds the web config from the Firebase console. It can be pasted
// exactly as Firebase shows it (`const firebaseConfig = { apiKey: "...", ... };`)
// or as JSON. Only string fields are read.
export function firebaseConfig() {
  const raw = process.env.FIREBASE_CONFIG || '';
  const cfg = {};
  for (const m of raw.matchAll(/["']?(\w+)["']?\s*:\s*["']([^"']+)["']/g)) cfg[m[1]] = m[2];
  return cfg.apiKey && cfg.projectId ? cfg : null;
}

const JWKS = createRemoteJWKSet(new URL(
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
));

// Checks the Firebase ID token the browser sends as "Authorization: Bearer <token>".
// Returns the signed-in user's id, or null if the token is missing or not valid.
export async function verifyUser(req) {
  const cfg = firebaseConfig();
  if (!cfg) return null;
  const m = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '');
  if (!m) return null;
  try {
    const { payload } = await jwtVerify(m[1], JWKS, {
      issuer: `https://securetoken.google.com/${cfg.projectId}`,
      audience: cfg.projectId,
    });
    return typeof payload.sub === 'string' && payload.sub ? payload.sub : null;
  } catch {
    return null;
  }
}
