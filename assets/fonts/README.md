# Local fonts

Self-hosted subsets used by the portfolio:

- Oswald variable, 300–700;
- Inter variable, 300–700;
- JetBrains Mono variable, 300–600;
- Cormorant Garamond, 500 normal/italic.

The files are Google Fonts WOFF2 builds for Cyrillic, Latin and Latin Extended.
All four families are distributed under the SIL Open Font License 1.1; see
`OFL.txt`.

The CSS declarations and exact Unicode ranges live in
`src/styles/fonts.css`. Do not replace them with a Google Fonts `<link>`:
self-hosting is part of the first-paint, privacy and offline/recovery contract.
