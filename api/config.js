// Gives the browser the Firebase web config. These values identify the Firebase
// project and are meant to be public; privacy comes from the Firestore rules
// (firestore.rules), which let each signed-in user reach only their own data.
import { firebaseConfig } from './_firebase.js';

export default function handler(req, res) {
  const cfg = firebaseConfig();
  res.setHeader('Cache-Control', 'public, max-age=300');
  if (!cfg) return res.status(200).json({ firebase: null });
  const { apiKey, authDomain, projectId, appId, storageBucket, messagingSenderId } = cfg;
  res.status(200).json({ firebase: { apiKey, authDomain, projectId, appId, storageBucket, messagingSenderId } });
}
