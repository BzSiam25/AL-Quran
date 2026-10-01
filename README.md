# Al Quran

A personal Quran reading website: Arabic (Uthmani) text with Bangla and English translations and transliteration for all 114 surahs, with highlights, notes, and AI explanations and Q&A.

Built with plain **HTML, CSS and vanilla JavaScript** (no framework). Quran data is stored as **JSON**.

## Folder structure

```
al-quran/
├── index.html            # the whole site (HTML + CSS + JS in one file)
├── data/
│   ├── 1.json ... 114.json   # one file per surah
├── scripts/
│   ├── template.html     # source of index.html (surah list placeholder: __INDEX__)
│   ├── index-data.json   # surah list (name, meaning, type, verse count)
│   └── build_data.py     # rebuilds data/ and index.html from the quran-json package
└── README.md
```

Each `data/N.json` is an array of verses: `[arabic, bangla, english, transliteration]`.

## Run locally

The page loads surahs with `fetch()`, so open it through a local server, not by double-clicking the file:

```bash
cd al-quran
python -m http.server 8000
# then open http://localhost:8000
```

Or with Node: `npx serve .`

## Deploy

It is a static site, so any static host works: drag the folder into Netlify, or push it to GitHub and enable GitHub Pages, or `vercel deploy`.

## What works where

| Feature | On claude.ai | Self-hosted |
|---|---|---|
| Reading, search, language toggles, font size | ✅ | ✅ |
| Highlights and notes | ✅ synced to your Claude account | ✅ saved in this browser only (localStorage) |
| Explain / Ask (AI) | ✅ uses Claude | ⛔ hidden (needs a backend, e.g. Gemini via a serverless function) |

The AI and sync features use claude.ai artifact capabilities (`window.claude`). When the page runs anywhere else, `window.claude` is absent, so those buttons stay hidden and notes fall back to localStorage automatically.

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
