# Architecture

## Source of truth

`src/content/product-registry.js` is the canonical public contract for product
identity, order, routing, repository roles, lifecycle, confidentiality, visual
asset and privacy boundary.

The runtime flow is:

```text
product-registry.js
        │
        ├── content.js ──> 24 cards on the RU / EN / UZ main page
        │
        ├── components-1.jsx ──> card image and accent
        │
        └── landings-data.js + landings-new.js
                  │
                  └── build.js ──> 15 static /projects/<slug>/ pages
```

Rich editorial copy remains scoped to its consumer:

- card summaries live in `content.js`;
- long case narratives live in `landings-data.js` and `landings-new.js`;
- identity, route and public-safety facts must not be duplicated there.

The validator joins those layers by `slug` and rejects drift.

## Build contract

`node build.js` performs these operations in order:

1. validate the canonical registry, all three locales, routes and images;
2. compile JSX sources to browser JavaScript;
3. generate every static case page;
4. validate generated routes and script dependencies.

`node scripts/validate-site.js --generated` can run the complete contract
without recompiling.

The build fails when:

- an id, slug, name, rank, live URL, GitHub URL or case route is duplicated;
- a live product has no live URL;
- a case product has no matching case definition;
- a public GitHub CTA has no public repository role;
- RU, EN or UZ copy is incomplete;
- a card and registry route differ;
- an image is missing, not WebP, larger than 150 KB or not exactly 1536×512;
- a generated case page is absent or does not load the canonical sources.

## Product semantics

Lifecycle and confidentiality are independent:

```text
lifecycle:
  discovery | build | prototype | demo | live_demo | live |
  production | source_incomplete | case_only

confidentiality:
  public | private_source | nda | sensitive
```

`NDA` is never a maturity level. A reachable GitHub Pages demo is not proof of
production use. A public showcase is not automatically source code.

Repository roles are explicit, for example:

```text
source
showcase
entrypoint
predecessor
duplicate_or_legacy
child_implementation
evidence
placeholder
```

One product may have several repositories, but one repository never creates an
extra card merely because it exists.

## Generated files

The following files are generated and must not be edited manually:

- `src/components/*.js` siblings of `.jsx` sources;
- `projects/*/index.html`.

After changing JSX, product data, landing data, rendering or cache version,
always run `node build.js` and confirm a second build produces no diff.

## Privacy rule

Private repository URLs are not stored in public CTA fields. Repository aliases
for private sources contain names and roles only. Every product has a non-empty
`privacyBoundary`; case copy must stay inside that boundary.

Vacation Control Agent has the strictest current gate: no employee names,
spreadsheet rows, company document template, organization identity, bot
username or chat identifiers may enter the public build.

## Quality and recovery contract

The repository uses a locked Playwright + axe-core harness:

```text
npm run build          compile, generate and validate
npm test               full automated gate
npm run test:desktop   desktop Chromium
npm run test:mobile    Android Chromium + iPhone WebKit smoke
npm run test:a11y      WCAG 2A / 2AA / 2.1 AA blocking checks
```

The automated matrix proves:

- all 24 canonical cards, 9 live routes and 15 case routes;
- RU / EN / UZ route and runtime-language parity;
- desktop Chromium and Android Chromium behavior;
- the critical iPhone WebKit journey;
- mobile overflow safety across all case pages;
- keyboard access, reduced motion and critical/serious axe checks;
- exact return from a case page to its originating card;
- useful recovery when the application script fails before React mounts.

`?e2e=1` is a deterministic QA mode, not a separate product build. It keeps
the real DOM, routing and state logic while disabling continuous GPU/rAF
decoration. This prevents compositor timing from changing functional test
results. Production behavior is still reviewed manually without this flag.

The runtime has three failure layers:

1. a `<noscript>` contact surface;
2. a pre-React watchdog for blocked or failed application scripts;
3. a React `ErrorBoundary` for render-time failures.

None of these surfaces exposes stack traces or private implementation detail.
Pull requests run `.github/workflows/quality.yml`; deployment runs the same
locked gate before a Pages artifact can be uploaded.

## Design-system contract

`src/styles/styles.css` is the source of truth for palette and semantic tokens.
Runtime theme code may select a theme identity, but it must not duplicate or
rewrite the token values inline.

`src/styles/fonts.css` declares all production fonts from `assets/fonts/`.
The main page and generated case pages must not request Google Fonts or another
font CDN. The font set must preserve the intended hierarchy in RU, EN and UZ:

```text
Oswald             display
Inter              body and controls
JetBrains Mono     evidence and telemetry
Cormorant Garamond editorial emphasis
```

The global signature motif is the three-state Proof Rail:

```text
BUILD → VERIFY → SHIP
```

It may change composition between scenes, but its order and meaning are stable.
Decoration must not introduce a conflicting process model or fake system state.
The authoritative visual and motion rules are in `docs/DESIGN-SYSTEM.md`;
verified implementation checkpoints are recorded in
`docs/IMPLEMENTATION-LOG.md`.

## Versioning

Static browser assets use one cache version in `index.html`. A release-changing
source edit requires a single version bump followed by `node build.js`, which
propagates the version to generated case pages.

The protected rollback point is:

```text
tag: pre-awwwards-v210
commit: 6aa3665
```
