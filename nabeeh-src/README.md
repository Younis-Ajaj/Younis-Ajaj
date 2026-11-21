# Nabeeh (نبيه) source

The site is built from these parts, so edit them here, not in `docs/`.

- `python3 build_web.py` builds the standalone website into `../docs` (served by GitHub Pages).
- `bash build.sh` builds the single-file Claude artifact version as `exam-plan.html`.

Parts: `00-head` fonts, `10/15-style` CSS, `20-body` + `25-landing` markup, `30/35-i18n` Arabic and English text,
`40-core` state and routing, `50-plan` planner, `60-today` dashboard and focus room, `70-tutor` tutor and file reading,
`75-site` landing, onboarding, prayer times, `80-rest` review, progress, grades and start-up.
