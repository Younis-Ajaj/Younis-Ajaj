# Security policy: Nabeeh (نبيه)

## How the site is protected

- **No server, no database, no accounts.** The site is static files on GitHub Pages. There is no login, no admin panel and no database for an attacker to break into.
- **Student data stays on the student's device.** Plans, cards, results and profile live in the browser's `localStorage` and are never sent anywhere. Backups are files the student downloads.
- **Content Security Policy.** Every page sets a strict CSP: scripts load only from the site itself (`script-src 'self'`, no inline scripts, no `eval`), no plugins (`object-src 'none'`), no form submissions to other sites, `base-uri 'none'`, and insecure requests are upgraded to HTTPS.
- **No third-party code.** pdf.js and JSZip are self-hosted in `docs/vendor` (pinned versions 3.11.174 and 3.10.1, with their licences). pdf.js runs with `isEvalSupported: false`. The only external requests are Google Fonts stylesheets and font files.
- **No tracking.** No analytics, ads or cookies. `referrer` is set to `no-referrer`.
- **Clickjacking.** The site breaks out of frames that try to embed it.
- **Safe rendering.** Everything a user types or imports is escaped before it is shown. Uploaded files are capped at 25 MB and backups at 5 MB; file reading happens in the browser.
- **HTTPS.** GitHub Pages serves the site over HTTPS.

## Owner checklist

1. Turn on two-factor authentication for the GitHub account.
2. In the repository's Settings → Pages, keep **Enforce HTTPS** ticked.
3. Protect the publishing branch (Settings → Branches) so only reviewed changes go live.
4. Change the site only through `nabeeh-src/` and rebuild with `python3 nabeeh-src/build_web.py`.

## Reporting a problem

Open a private security advisory in this repository (Security → Advisories → Report a vulnerability). Please do not post security issues publicly.
