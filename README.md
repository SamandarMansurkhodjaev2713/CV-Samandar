# Samandar — Executive AI Code Lab

An interactive portfolio built as a product, not a résumé page.

**Live:** [samandarmansurkhodjaev2713.github.io/CV-Samandar](https://samandarmansurkhodjaev2713.github.io/CV-Samandar/)

---

## What this is

A static site that presents full-stack, AI-automation and QA work as a piece of
software rather than a document: a scored, scroll-driven experience with a
colour journey, per-section motion signatures, living project imagery and 12
in-site product case studies — in three languages.

No framework, no bundler, no runtime dependencies. React ships as a vendored
production build, JSX is compiled ahead of time by `build.js`, and the whole
thing deploys as static files to GitHub Pages.

---

## Highlights

| | |
|---|---|
| **Colour dramaturgy** | The page ground and the atmospheric accent evolve act by act — cool at the start, warm through the work, cool again in the engineering blocks, warmest at contact. Brand tokens stay fixed, so the primary action never changes colour. |
| **Living imagery** | One shared WebGL context follows the pointer between project cards: the illustration ripples under the hand and swells with scroll velocity. Degrades to a sharp still image where WebGL is unavailable. |
| **Frame governor** | Quality tiers come from the frames the device *actually delivers*, not from `navigator.hardwareConcurrency`. Effects are shed in a defined order when the budget is tight. |
| **Nine section signatures** | Each act announces itself in its own language: a radar sweep, a CRT power-on, modules snapping into a rack, a document passing under a scanner bar. |
| **12 product case studies** | Every closed project has a full in-site case page with a hand-authored architecture diagram, an evidence section and an honest-limits block — RU / EN / UZ. |
| **Honest by construction** | Every number on the site is traceable to a public repository; private work states its own boundaries. |

---

## Stack

- Vanilla HTML / CSS / JavaScript
- React 18 (vendored production build) + ahead-of-time JSX compilation
- Three.js — background field and image shaders
- Spline — the hero robot
- GitHub Actions → GitHub Pages

---

## Running locally

```bash
python -m http.server 3007
```

Open `http://localhost:3007`. There is no install step.

After editing any `.jsx`, `landings-data.js` or `render.js`:

```bash
node build.js
```

Bump `?v=` in `index.html` **before** building — the product landings bake that
number into their asset URLs.

---

## Repository map

```
index.html              entry point, script order, intro curtain
build.js                JSX compiler + landing generator
src/
  engine/               perf · acts · motion · img-fx · bg-fx · sound · intro · scene-cinema
  components/           React source (.jsx) and compiled output (.js)
  content/content.js    all copy, RU / EN / UZ
  projects/             landing data, renderer and styles
  robot/                Spline runtime wrapper
  styles/               design tokens and section styles
projects/<slug>/        generated case-study pages — do not edit by hand
docs/DESIGN-SYSTEM.md   engine map, motion grammar, conventions
```

**Working on this?** Read [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md)
first — it documents the engine contracts and several silent traps that have
already cost real debugging time.

---

## Deployment

Every push to `main` deploys to GitHub Pages through GitHub Actions.

---

## Contact

- Telegram — [@killallofthem13](https://t.me/killallofthem13)
- Email — sam4k27@gmail.com
- Tashkent · UTC+5 · reply within 24 hours
