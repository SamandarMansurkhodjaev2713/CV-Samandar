# Samandar — Executive AI Code Lab

Interactive developer portfolio for full-stack, AI automation and product engineering work.

**Live demo:** [samandarmansurkhodjaev2713.github.io/CV-Samandar](https://samandarmansurkhodjaev2713.github.io/CV-Samandar/)

## What It Is

This repository contains a static interactive CV/portfolio experience. It presents my work profile as a product-style interface rather than a plain resume page: visual sections, motion, interactive widgets, localized content, code-lab positioning and a more memorable first impression for recruiters, technical leads and partners.

## Positioning

The portfolio is built around the profile I want to communicate:

- full-stack developer;
- AI automation developer;
- product-minded engineer;
- founder-style builder;
- frontend/design-aware engineer.

## Stack

- HTML/CSS/JavaScript
- React production builds loaded as local vendor files
- Three.js for visual/background effects
- Spline runtime integration with fallback behavior
- Ahead-of-time JSX compilation through `build.js`
- Modular CSS and content files

## Architecture

```text
src/
  content/      profile text and i18n-style content
  components/   React components and app shell
  engine/       themes, motion, background effects and scene logic
  robot/        Spline runtime wrapper and fallback
  widgets/      interactive portfolio widgets
  styles/       CSS bundles and section styling
vendor/         pinned local runtime libraries
uploads/        portfolio media assets
```

The source JSX files are compiled ahead of time into plain JavaScript. The browser loads production React files and generated JS directly, avoiding in-browser Babel transpilation.

## Why This Architecture

For a portfolio, perceived performance and polish matter. The architecture keeps the experience static and easy to host, while still allowing interactive visual features. Ahead-of-time JSX compilation reduces runtime overhead, and separating content, engine, widgets and components makes the site easier to iterate without mixing visual effects with profile text.

## Development

After editing any `.jsx` source under `src/components`, run:

```bash
node build.js
```

Then open `index.html` locally or deploy the static files.

## What It Demonstrates

- personal branding and product presentation;
- frontend polish and motion/UI detail;
- performance awareness;
- interactive/static site architecture;
- ability to package technical work for recruiters, technical leads and partners.

## Deployment

This repository deploys automatically to GitHub Pages through GitHub Actions on every push to `main`.
