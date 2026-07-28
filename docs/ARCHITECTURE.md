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

## Versioning

Static browser assets use one cache version in `index.html`. A release-changing
source edit requires a single version bump followed by `node build.js`, which
propagates the version to generated case pages.

The protected rollback point is:

```text
tag: pre-awwwards-v210
commit: 6aa3665
```
