# Design system & engine map

The map for this site. Read this before adding a section, an effect, or a
colour — most of the traps here have already been paid for once.

---

## 1. The idea

A warm, dark, editorial instrument panel. Everything is one journey: the page
starts cool, warms through the work, cools again in the engineering blocks, and
lands warmest at the point of contact. Nothing is decoration for its own sake —
every effect is drawn from what its section actually *is*.

---

## 2. Tokens

### Brand — never drift

| Token | Value | Used for |
|---|---|---|
| `--accent` / `--accent-rgb` | `#D97757` / `217 119 87` | primary CTA, brand mark |
| `--accent-2` / `--accent-2-rgb` | `#C89B5E` / `200 155 94` | secondary warmth, gradients |
| `--text` `--text-dim` `--text-mute` | bone → ash | body, meta, quiet |

The primary CTA is the **same colour on every screen**. A button that changes
colour as you scroll stops reading as "the button".

### Atmosphere — drifts per act

`acts.js` writes these on `<html>` and CSS transitions them over 1.4s:

| Var | Note |
|---|---|
| `--act-bg` | page ground, ±3–5 per channel around `#1F1E1B` |
| `--act-accent` | `rgb(r, g, b)` — for `color:` |
| `--act-accent-rgb` | **space-separated** `r g b` — for alpha composition |

> ### ⚠ The comma trap — cost us nine invisible signatures
> The stylesheet composes alpha with the modern slash syntax:
> ```css
> background: rgba(var(--act-accent-rgb) / 0.3);
> ```
> That syntax requires **space-separated** channels. With commas it expands to
> `rgba(217, 119, 87 / 0.3)`, which is invalid, so the browser **silently drops
> the declaration** — no console error, no failed assertion. Nine section
> signatures animated perfectly while painting fully transparent.
>
> **Rule:** every `*-rgb` token is space-separated. Test the painted colour, not
> just that the animation is attached.

---

## 3. Engines

Load order matters — it is the order in `index.html`.

| File | Owns | Public API |
|---|---|---|
| `engine/perf.js` | frame budget, quality tier | `__SM_PERF.tier` `.allows(cost)` `.shaderBudget()` `.on(fn)` `.__set(t)` |
| `engine/acts.js` | colour dramaturgy, veils, mouse light, act shutters | `__SM_ACTS.set(id)` `.current()` `.shutter()` |
| `engine/motion.js` | cursor, magnetism, reveals, parallax, centre-stage | `Motion.init()` `.refresh()` `.plxTick()` `.checkVisible()` |
| `engine/img-fx.js` | living project imagery (one shared WebGL context) | `__SM_IMGFX.attach(el)` `.detach()` `.active()` |
| `engine/bg-fx.js` | background WebGL field | `setSection()` `setScroll()` `setAccent()` |
| `engine/sound.js` | opt-in UI sound (OFF by default) | `SMSound.play(name)` `.set(bool)` `.isOn()` |
| `engine/intro.js` | boot curtain | `SMIntro.run()` |
| `engine/scene-cinema.js` | View-Transition section navigation | `SceneCinema.navigate(id)` `.dispose()` |

### Events — the shared nervous system

| Event | Fired by | Consumed by |
|---|---|---|
| `sm:section` | `app.jsx` IntersectionObserver | `acts.js`, `sound.js` |
| `sm:focus-card` | `motion.js` centre-stage | `img-fx.js` (touch) |
| `sm:cinema-start` / `sm:cinema-done` | `scene-cinema.js` | `bg-fx.js` |
| `sm:intro-done` | `intro.js` (+ head-boot safety net) | `bg-fx.js`, `Hero` (letter reveal) |

**Balance rule:** anything that pauses work on `-start` must be released on
`-done` — including when teardown interrupts the transition. An unbalanced pair
leaves the background permanently frozen or the hero name permanently hidden.

---

## 4. The performance contract

`perf.js` measures the frames the device actually delivers and publishes
`html[data-perf="high|mid|low"]`.

- Drops a tier after ~1s of bad frames, earns one back after ~4s of good ones.
  Asymmetric on purpose: flickering between quality levels looks broken.
- The sampler **sleeps** once the picture is stable and wakes on scroll/resize.
- `prefers-reduced-motion` pins `low` and never samples.

Gate expensive work on it, in CSS or JS:

```css
html[data-perf="low"] .my-effect { display: none; }
```
```js
if (window.__SM_PERF.allows("shader")) { /* … */ }
```

What each tier drops, in order: section signatures → parallax depth →
image shaders → everything but the base entrance.

---

## 5. Motion grammar

| Layer | Rule |
|---|---|
| Section entrance | one per section, `data-enter="…"`, plays once via `.sec-in` |
| Section signature | a second, meaning-specific note (scanline, stamp, rack…) |
| Headings | line-mask rise + variable-weight settle (520 → 650) |
| Reveals | `data-reveal` (IO-driven, `motion.js`), never `animation-timeline` |
| Parallax | `data-plx="0.05"` → `--plx` → `transform` |
| Interludes | full-screen rests, **not** sections — no `data-section` |

**Native scroll is never hijacked.** `flyTo()` and `SceneCinema` only run on
explicit navigation clicks.

**Anything driven by rAF needs a wall-clock backstop.** rAF stops in a
backgrounded tab; without a `setTimeout` fallback a one-shot teardown can strand
state forever (hit twice: the intro curtain, then the image-shader canvas).

---

## 6. Adding a section

1. `<section data-section="x" id="x" data-enter="…">` inside `app.jsx`.
2. Add the act preset in `acts.js` (`bg` + `accent`).
3. Optional signature in `cursor.css` — **use `::after` for pinned sections**;
   `::before` is already owned by the pin-overlap effect and wins on specificity.
4. Add the label to `EXTRA_SECTION_LABELS` and `MENU_ACCENT` in `app.jsx`.
5. Add the kill-switch entries for `reduced-motion`, `data-motion-lite`,
   `data-perf="low"`.

The nav counter, dock and act engine read the DOM, so they pick it up for free.

---

## 7. Build & deploy

```bash
node build.js     # JSX → JS, and bakes the 12 product landings
```

- **`?v=` must be bumped in `index.html` before `node build.js`** — landings
  bake that number into their asset URLs.
- Bump it with **node, not PowerShell**: PS 5.1 mangles the UTF-8 in
  `index.html`.
- `content.js` is loaded raw (no build step); `*.jsx` must be compiled.
- Landings are generated from `src/projects/landings-data.js` + `render.js` —
  never edit `projects/<slug>/index.html` by hand.

---

## 8. i18n

Three locales, RU default. Some values are **deliberately empty strings**.

> `x || fallback` leaks English into RU/UZ — an empty RU suffix once shipped a
> button reading "Показать ещё 17 more". Always `x != null ? x : fallback`.

---

## 9. Verification

The preview browser is headless: **rAF is frozen, scroll is frozen, CSS
transitions never advance**. So:

- Read **end states** (freeze transitions, toggle the class, read computed).
- Use the sync hooks: `__SM_ACTS.set()`, `Motion.plxTick()`, `__SM_PERF.__set()`.
- Check the **painted colour**, not just that a rule or animation is attached.
- React's `onMouseEnter` is synthesised from delegated events — call handlers
  through the fiber (`__reactProps$…`) instead of dispatching raw mouse events.

---

## Traps found the hard way

Each of these passed a structural check and failed a visual one. The lesson in
all of them is the same: assert the **painted result**, not the presence of a
rule.

| Trap | What it looked like | The rule |
|---|---|---|
| `rgba(var(--x) / a)` needs **space-separated** channels | Nine section signatures painted fully transparent while `animationName` read correctly | Store RGB triples space-separated; a comma-separated value makes the whole declaration invalid and it is dropped silently |
| A mask flush to the box bottom clips the glyph | `clip-path: inset(… 0% …)` cut 25px off every hero letter | With `line-height < 1` the baseline sits *below* the content box — Oswald at 0.76 puts it 0.09em under. Measure, then inset negative |
| `.shell`'s `margin: 0 auto` disables flex stretch | Hero bands shrank to their own text width and floated centred | A flex item with an auto cross-axis margin is never stretched. Give it an explicit `width: 100%` |
| `text-align-last: justify` cannot spread a single word | "FULL-STACK" ignored justification entirely; "AI AUTOMATION" opened one canyon | Justification distributes slack at word boundaries. To track a word to a margin, split it and use `justify-content: space-between` |
| A ratio `threshold` is unreachable on a tall section | The Signal countdown was one added row from never starting | `threshold: 0.35` means 35% of the element's own area. Use an inset `rootMargin` band instead — it is height-independent |
| IntersectionObserver callbacks need a rendering step | A raw IO on a visible element delivered zero entries in 500ms | Callbacks are delivered on the rendering lifecycle, so a non-compositing tab never gets them. `MutationObserver` (microtask) does fire — watch `.sec-in` instead of observing again |
| A transitioned `transform` swallows per-frame parallax | Cards lagged the scroll and burned a style recalc per frame | Put scroll-driven drift on the standalone `translate` property; keep `transform` for the transitioned hover state |
| Act colours and plate colours are not the same clock | Near-white text on a near-white plate during the act transition | The plate is a property of the section; the act is scroll-driven. Declare light-plate ink **on the section**, which also outranks the inherited inline value `acts.js` writes on `<html>` |
| An accent built for a dark ground fails on a light one | `#D97757` measures 7:1 on `#161719` and 2.5:1 on `#E8E6E1` | Light plates get their own darkened accent tokens. Measure the pair, do not eyeball it |
| A transition effect can cost contrast | The mobile dark→light bridge left the Quality eyebrow at 3.9:1 | Resolve any tint fully *above* the first line of text |
