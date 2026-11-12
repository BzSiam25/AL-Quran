import { firebaseConfig } from '../../api/_firebase.js';
export default function handler() {
  const cfg = firebaseConfig();
  if (!cfg) return Response.json({ firebase: null });
  const { apiKey, authDomain, projectId, appId, storageBucket, messagingSenderId } = cfg;
  return Response.json({ firebase: { apiKey, authDomain, projectId, appId, storageBucket, messagingSenderId } });
}
export const config = { path: '/api/config' };
