# غذاء نظيف · Clean Nutrition: Bowel-Cancer Prevention App (Jordan)

Hackathon MVP for the **JBCP / King Hussein Cancer Foundation "Future Health Impact Hackathon"**.

You scan a food product (barcode or a photo of the ingredient label). The app then:

- gives a colorectal-cancer (CRC) diet-risk verdict based on published evidence
- suggests healthier swaps at partner shops
- tracks your weekly **Gut Score**
- nudges eligible users toward **free FIT screening**

It is Arabic-first (RTL), with an English toggle.

> **No API keys, no backend.** The app is a static PWA. All state stays in the browser (localStorage).

---

## Quick start

```bash
npm install
npm run dev              # http://localhost:5173
npm run dev -- --host    # also on your LAN, so you can open it on a phone
npm run dev:https        # LAN + self-signed HTTPS (needed for the LIVE camera barcode scanner on phones)
npm run build && npm run preview   # production build, with the service worker
```

On a phone over plain `http://<your-ip>:5173`, the live camera is blocked by the browser, because it requires a secure context. These still work over plain HTTP:

- "Take a photo of the barcode"
- the photo/OCR path
- typing the barcode
- the demo products

For the live camera, use `npm run dev:https` and accept the certificate warning, or use the deployed Vercel URL.

## Environment variables

**None.** The app needs no keys and has no server.

## Deploy to Vercel (static site)

1. Push this repo to GitHub.
2. On vercel.com, choose **Add New → Project** and import the repo.
3. Vercel detects **Vite**: build command `npm run build`, output folder `dist`. Then click **Deploy**.
4. `vercel.json` already rewrites SPA routes (`/dashboard`, `/result/...`) to `index.html` and stops `sw.js` from being cached.

Or use the CLI: `npm i -g vercel && vercel --prod`.

After deploying, open the URL on a phone and choose **Add to Home Screen** to install it as a full-screen PWA.

---

## How a scan works

```
 Demo picker ───────────────┐   (products.json, works offline, always reliable)
 Barcode ─► products.json ──┤
          └► Open Food Facts┤   (public API, no key; best-effort)
          └► not found ─► "try the photo scan"
 Photo ─► Tesseract.js (ara+eng, on-device) ─► user reviews/edits text
          └► classify.js (Arabic/English keyword dictionary) ┤
                                                             ▼
                                   product schema { category, containsNitrites,
                                   fiberPer100g, addedSugarPer100g, ultraProcessed, ... }
                                                             ▼
                              scoring.js: deterministic evidence rules ─► RED / AMBER / GREEN
```

- **The keyword layer only extracts facts. It never decides risk.** The verdict comes from fixed rules in `src/lib/scoring.js`. Each rule carries an evidence tier and a source (WHO/IARC, WCRF/AICR).
- **Best-effort paths:** OCR and Open Food Facts depend on photo quality, internet access and database coverage.
  - The first OCR run downloads several MB of OCR engine and language data from a CDN (about 10 s); after that it is cached.
  - The OCR review screen lets you fix the text, and override the category before scoring.
- **Demo products always work**, offline included.

### Scoring rules (`src/lib/scoring.js`)

| Trigger | Tier | Evidence | Source |
|---|---|---|---|
| processed meat **or** nitrites (E249–E252) | 🔴 RED | Established (IARC Group 1) | WHO/IARC; WCRF |
| red meat | 🟠 AMBER | Probable (IARC Group 2A) | WHO/IARC; WCRF |
| sugary drink **or** added sugar ≥ 10 g/100 g | 🟠 AMBER | Associated | Dietary guidance reviews |
| refined grain **or** ultra-processed | 🟠 AMBER | Diet pattern | WCRF; UPF cohort studies |
| wholegrain **or** fibre ≥ 6 g/100 g | 🟢 GREEN | Probable protective (90 g/day ≈ 17% lower risk) | WCRF CUP 2018 |
| otherwise | 🟢 GREEN (neutral) | General guidance | WCRF |

Guard rails:

- Labaneh, plain dairy and traditional staples (hummus, za'atar, freekeh, lentils and so on) are never flagged by the refined/ultra-processed rule.
- The app never uses the word "organic"; it says "healthier option".
- The app never says a product "causes cancer". Copy always talks about regular intake and diet patterns.

### Editing the keyword dictionary

All Arabic and English keywords live in **`src/lib/dictionary.js`**. That covers nitrites, processed meat, red meat, wholegrain, refined grain, sugar, drinks, flavour enhancers, ultra-processing markers, dairy, snacks, and the Open Food Facts category mapping. Text is normalised before matching (Arabic diacritics, alef/ya/ta-marbuta variants, Arabic-Indic digits), so you can add plain keywords.

### Weekly Gut Score

Covers the last 7 days: `100 − 10 × (processed/red-meat scans) + 5 × (days with a wholegrain/high-fibre scan)`, clamped to 0–100. The tip targets your weakest area.

### Screening nudge

Shown when **age ≥ 45 or family history = yes**, or when **Demo mode** is on (it sets age to 50). The buttons are:

- **Request a free home FIT kit**: a mock confirmation with a reference number.
- **Share with family**: uses the Web Share API, falling back to WhatsApp and then to the clipboard.

---

## 2-minute demo script

**Before you go on stage:**

1. Open the app, answer the 3 onboarding questions (any age), then go to **⚙️ Settings**.
2. Turn on **Demo mode**, so the screening nudge always appears.
3. Optional: tap **Load a sample week of scans** so the Gut Score looks lived-in.

To start completely fresh, use **Reset everything**.

| Time | Action | What to say |
|---|---|---|
| 0:00 | Home screen (Arabic) | "CRC is the #1 cancer in Jordanian men, and only 8.1% of cases are caught early. We meet people where they decide: the grocery aisle." |
| 0:15 | **Scan → Demo products → لانشون (Luncheon meat)** | Result: 🔴 **RED**, "linked to higher risk with regular intake". Scroll to **Why?**: IARC Group 1, *Established*, with the source. "Our AI doesn't judge. Fixed, transparent evidence rules do." |
| 0:40 | **See better alternatives** | Tuna, chickpeas and labaneh, at similar prices, each with a partner shop in Khalda or Weibdeh and its distance. |
| 0:55 | Back → **Scan → Wholewheat bread** (or type barcode `6251000000066`) | 🟢 **Healthier option**: "Wholegrains probably protect; 90 g a day is linked to about 17% lower risk." |
| 1:10 | **Gut Score** tab | Score ring, meat count, fibre days, 7-day strip and the tip of the week. |
| 1:25 | **Screening nudge** on the same screen | "Diet lowers risk, but only screening finds polyps early." Tap **Request a free FIT kit** to show the confirmation, then **Share with family** to show the share sheet with a message for a parent. |
| 1:45 | Tap **EN** at the top | The whole app switches to English (LTR). |
| 1:50 | Open **`/dashboard`** (About → dashboard) | An anonymized view for KHCC/MOH: scans by area, high-risk diet patterns, and screening requests by Amman neighbourhood. |

Optional live extras (best-effort, needs internet):

- **Barcode:** type `5449000000996`. It resolves via Open Food Facts to a cola, AMBER for sugar.
- **Photo:** photograph any ingredient label, fix the text if needed, then tap **Analyse**.
- **Warning signs:** Home → "Any worrying symptoms?" Answering "yes" to anything shows "Please see a doctor soon", with no food advice.

Demo barcodes (placeholders) run from `6251000000011` to `6251000000202`. See `src/data/products.json`.

---

## Project structure

```
public/             PWA icons (generated by scripts/gen-icons.mjs), favicon
src/
  pages/            Onboarding, Home, Scan, Result, Alternatives, GutScore,
                    FitKit, WarningSigns, Dashboard, About, Settings
  components/       Layout (top bar + bottom nav), RiskBadge, ScreeningNudge,
                    Disclaimer, ScoreRing, BarChart, ProductRow,
                    BarcodeScanner (ZXing), PhotoScanner (Tesseract)
  lib/              scoring.js (verdict), classify.js + dictionary.js (extraction),
                    openFoodFacts.js, ocr.js, gutScore.js, eligibility.js,
                    catalog.js, storage.js, share.js
  data/             products.json (20 seed products), shops.json (mock), dashboard.json (mock)
  i18n/             ar.js (default, RTL), en.js, index.jsx (context, t(), pick())
```

**Stack:** React 19 + Vite, vite-plugin-pwa (Workbox), react-router, @zxing/browser, tesseract.js and lucide-react, with plain CSS using logical properties so it is RTL-safe.

## Data and evidence

- Jordan Cancer Registry 2024: CRC is the #1 cancer in men and #2 overall (1,130 cases, 11.5%); 8.1% are diagnosed at a localized stage; the median age at diagnosis is 61.
- IARC Monographs vol. 114 (red and processed meat).
- WCRF/AICR Continuous Update Project, Colorectal Cancer (2018).
- WHO sugars guideline (2015).

Prices are **approximate**. Partner shops and dashboard figures are **mock data**. Barcodes in `products.json` are placeholders.

> ⚠️ **This is a nutrition awareness tool, not medical advice or diagnosis.**
