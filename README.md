# Al Quran

A personal Quran reading website: Arabic (Uthmani) text with Bangla and English translations and transliteration for all 114 surahs, with highlights, notes, and AI explanations and Q&A.

Built with plain **HTML, CSS and vanilla JavaScript** (no framework). Quran data is stored as **JSON**.

## Folder structure

```
al-quran/
├── index.html            # the whole site (HTML + CSS + JS in one file)
├── data/
│   ├── 1.json ... 114.json   # one file per surah
├── api/
│   └── gemini.js         # Vercel function: calls Gemini with the secret key (model fallback + streaming)
├── vercel.json           # gives the AI function up to 60 s
├── .env.example          # template for local testing (copy to .env, never commit .env)
├── scripts/
│   ├── template.html     # source of index.html (surah list placeholder: __INDEX__)
│   ├── index-data.json   # surah list (name, meaning, type, verse count)
│   └── build_data.py     # rebuilds data/ and index.html from the quran-json package
└── README.md
```

Each `data/N.json` is an array of verses: `[arabic, bangla, english, transliteration]`.

## AI features (Explain / Ask) and the Gemini key

The browser never sees the Gemini API key. The page posts the question to `/api/gemini`, and `api/gemini.js` (a Vercel serverless function) adds the key from the `GEMINI_API_KEY` environment variable, tries each model in turn, and streams the answer back.

**Never put the key in `index.html`, `template.html` or any committed file.**

## Run locally

Reading only (no AI), any static server works:

```bash
python -m http.server 8000   # then open http://localhost:8000
```

With Explain / Ask, use the Vercel CLI so `/api/gemini` runs too:

```bash
npm i -g vercel
cp .env.example .env         # then put your key in .env
vercel dev                   # opens on http://localhost:3000
```

## Deploy (Vercel, free)

1. Go to vercel.com, sign in with GitHub, **Add New → Project**, import this repo.
2. Framework preset: **Other**. Leave the build command empty.
3. Under **Environment Variables** add `GEMINI_API_KEY` = your key.
4. **Deploy.** Every push to `main` redeploys automatically.

To change the key later: Settings → Environment Variables, edit it, then **Redeploy**.

Static hosts without functions (GitHub Pages, Netlify Drop) still serve the reader, highlights and notes; only Explain / Ask will show an error there.

Highlights and notes are saved in the browser (localStorage), per device.

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
