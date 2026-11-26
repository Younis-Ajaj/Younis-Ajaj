# Security policy: Younis (يونس)

## How the site is protected

- **No server, no database, no accounts.** The site is static files on GitHub Pages. There is no login, no admin panel and no database for an attacker to break into.
- **Student data stays on the student's device.** Plans, cards, results and profile live in the browser's `localStorage` and are never sent anywhere. Backups are files the student downloads.
- **Content Security Policy.** Every page sets a strict CSP: scripts load only from the site itself (`script-src 'self'`, no inline scripts, no `eval`), no plugins (`object-src 'none'`), no form submissions to other sites, `base-uri 'none'`, and insecure requests are upgraded to HTTPS.
- **No third-party code.** pdf.js 3.11.174, JSZip 3.10.1 and the official Anthropic TypeScript SDK 1.12.0 are self-hosted in `docs/vendor` with their licences, and the fonts are self-hosted in `docs/fonts`. pdf.js runs with `isEvalSupported: false`. The only external request is api.anthropic.com, and only when a student uses an AI feature (`connect-src` allows nothing else).
- **Optional AI tutor, student's own key.** The key is kept only in that browser (session storage, or local storage if the student ticks "remember"), is sent only to api.anthropic.com, is never written into backups, and is removed by "Erase all my data". Course text, mistakes and progress numbers leave the device only when the student uses an AI feature, and only to Anthropic.
- **No tracking.** No analytics, ads or cookies. `referrer` is set to `no-referrer`.
- **Clickjacking.** The site breaks out of frames that try to embed it.
- **Safe rendering.** Everything a user types or imports, and everything an AI model returns, is escaped before it is shown (the Markdown renderer escapes first, then adds formatting). Uploaded files are capped at 25 MB and backups at 5 MB; file reading happens in the browser.
- **Camera and photos (Lens).** The camera starts only when the student presses "Open camera", and stops when they leave the page or hide the tab. Photos and translated files stay in the page's memory: they are never written to storage, and they leave the device only when the student presses Analyse or Translate, straight to Anthropic. Limits: 5 photos, 40 scanned pages, 200,000 characters per translation.
- **University data.** The university list (`docs/data/unis/`, Hipo dataset, MIT licence) and the verified study plans (`docs/data/catalog/`, scraped from the universities' official websites with `younis-study/tools/fetch_aau.py`) are static files served from the site itself.
- **AI web search.** "Search the university's site" runs Anthropic's server-side web search restricted to that university's own domain (`allowed_domains`). The returned JSON is validated (lengths, numbers, `https`-only links), shown as escaped text with its sources, and labelled for the student to check. Content from web pages can never run code or trigger actions.
- **HTTPS.** GitHub Pages serves the site over HTTPS.

## Owner checklist

1. Turn on two-factor authentication for the GitHub account.
2. In the repository's Settings → Pages, keep **Enforce HTTPS** ticked.
3. Protect the publishing branch (Settings → Branches) so only reviewed changes go live.
4. Change the site only through `younis-study/` and rebuild with `python3 younis-study/build_web.py`.
5. Before publishing a change, run the end-to-end checks: `npm install playwright axe-core` then `node younis-study/tests/e2e.js` (82 checks, including CSP, accessibility, phone layout, time zones, camera-photo analysis, translation and the university catalog).

## Reporting a problem

Open a private security advisory in this repository (Security → Advisories → Report a vulnerability). Please do not post security issues publicly.
