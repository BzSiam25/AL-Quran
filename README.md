# My Quran

An installable Quran reader with Uthmani Arabic text, Bangla and English translations, and transliteration for all 114 surahs. Built with vanilla JavaScript, Firebase, and Vercel.

## Features

- **Multilingual reading** with verse-by-verse Arabic, Bangla, English, and transliteration.
- **Offline access** through a service worker that caches the reader and can download all 114 surahs.
- **Personal study tools** with verse highlights, notes, and reading progress synced through Firebase.
- **AI-assisted study** with verse explanations and Q&A streamed from Gemini through an authenticated serverless endpoint.

| Layer | Technologies |
| --- | --- |
| Reader | HTML, CSS, vanilla JavaScript, JSON |
| Offline and installation | Service Worker, Web App Manifest |
| Identity and storage | Firebase Authentication, Cloud Firestore |
| Serverless API | Vercel Functions, Gemini API, JOSE |

## Folder structure

```
al-quran/
├── index.html            # the whole site (HTML + CSS + JS in one file)
├── data/
│   ├── 1.json ... 114.json   # one file per surah
├── api/
│   ├── gemini.js         # Vercel function: calls Gemini with the secret key (signed-in users only)
│   ├── config.js         # gives the browser the public Firebase web config
│   └── _firebase.js      # shared: reads FIREBASE_CONFIG, verifies sign-in tokens
├── firestore.rules       # privacy rules: each user can reach only users/<their uid>/
├── manifest.webmanifest  # makes the site installable as an app (name, icons, colours)
├── sw.js                 # service worker: offline app shell + surah caching
├── icons/                # app icons (any + maskable, Apple touch icon, favicon)
├── package.json          # one dependency (jose) for checking sign-in tokens
├── vercel.json           # gives the AI function up to 60 s
├── .env.example          # template for local testing (copy to .env, never commit .env)
├── scripts/
│   ├── template.html     # source of index.html (surah list placeholder: __INDEX__)
│   ├── index-data.json   # surah list (name, meaning, type, verse count)
│   └── build_data.py     # rebuilds data/ and index.html from the quran-json package
└── README.md
```

Each `data/N.json` is an array of verses: `[arabic, bangla, english, transliteration]`.

## Install as an app (PWA)

The site is a Progressive Web App: it installs from the browser and opens full-screen like a native app, with its own icon. No app store needed.

- **Android (Chrome)**: tap **Install** in the site header (or ⋮ → *Install app*).
- **iPhone / iPad (Safari)**: tap **Install** for steps, or Share → *Add to Home Screen*.
- **Desktop (Chrome / Edge)**: **Install app** in the header, or the install icon in the address bar.

Offline: the app shell and every surah you open are cached on the device. **Download for offline** (bottom of the home page) saves all 114 surahs (~5 MB). Highlights and notes made offline sync when you're back online. Explain / Ask and sign-in need internet. `/api/*` is never cached.

When you change `index.html` or the icons, bump `VERSION` in `sw.js` so installed apps pick up the update.

## Accounts and privacy

People sign in with Google (Firebase Authentication). Anyone can read the Quran without signing in; highlights, notes, Explain and Ask need an account.

Each person's data is stored in Firestore under `users/<their uid>/`:

| Path | What |
|---|---|
| `marks/<surah:ayah>` | highlight colour and note |
| `explanations/<surah:ayah>` | saved AI explanation (opens instantly next time) |
| `chats/<id>` | Ask conversations (last 40 messages each) |
| `users/<uid>` field `pos` | where they stopped reading |

`firestore.rules` allows read and write only when `request.auth.uid` matches that folder, so no other user can see or change it. Highlights/notes saved in a browser before accounts existed are moved into the account on first sign-in.

## AI features (Explain / Ask) and the Gemini key

The browser never sees the Gemini API key. The page posts the question to `/api/gemini` with the user's Firebase sign-in token. `api/gemini.js` checks the token, adds the key from the `GEMINI_API_KEY` environment variable, tries each model in turn, and streams the answer back. Requests without a valid sign-in are refused, so strangers can't use up your Gemini quota.

**Never put the Gemini key in `index.html`, `template.html` or any committed file.** (The Firebase web config is different: it is public by design and only identifies the project.)

## Firebase setup (once)

1. [console.firebase.google.com](https://console.firebase.google.com) → **Add project** (Google Analytics not needed).
2. **Build → Authentication → Get started → Sign-in method → Google → Enable** → Save.
3. **Authentication → Settings → Authorized domains → Add domain**: your Vercel domain (e.g. `al-quran.vercel.app`).
4. **Build → Firestore Database → Create database** → production mode → a nearby location.
5. **Firestore → Rules**: replace everything with the contents of `firestore.rules` → **Publish**.
6. **Project settings (gear) → Your apps → Web (`</>`)** → register an app → copy the `firebaseConfig` object.
7. In Vercel → Settings → Environment Variables add `FIREBASE_CONFIG` and paste that object (JSON or the JS form Firebase shows both work). Redeploy.

## Run locally

Reading only (no AI), any static server works:

```bash
python -m http.server 8000   # then open http://localhost:8000
```

With Explain / Ask, use the Vercel CLI so `/api/gemini` runs too:

```bash
npm i -g vercel
cp .env.example .env         # then fill in GEMINI_API_KEY and FIREBASE_CONFIG
vercel dev                   # opens on http://localhost:3000
```

## Deploy on Vercel

1. Go to vercel.com, sign in with GitHub, **Add New → Project**, import this repo.
2. Framework preset: **Other**. Leave the build command empty.
3. Under **Environment Variables** add `GEMINI_API_KEY` (your Gemini key) and `FIREBASE_CONFIG` (see Firebase setup).
4. **Deploy.** Vercel can automatically deploy pushes to the configured production branch.

To change the key later: Settings → Environment Variables, edit it, then **Redeploy**.

Static hosts without functions (GitHub Pages, Netlify Drop) still serve the reader, but sign-in, notes and AI need the `/api` routes, so use Vercel.

## Rebuild the data

```bash
npm install quran-json
python scripts/build_data.py
```

To change the design or code, edit `scripts/template.html` and run the script again (or edit `index.html` directly).

## Sources

- Arabic text and translations: [quran-json](https://github.com/risan/quran-json) (Uthmani text from QuranEnc.com)
- Bangla: Muhiuddin Khan · English: Saheeh International · Transliteration: Tanzil.net
- Fonts: Amiri Quran, Amiri, Hind Siliguri (Google Fonts)
