# Project image system

## Purpose

Project covers are not screenshots and do not imitate product interfaces. Each
cover is a quiet editorial still life that turns one product principle into one
physical metaphor. The set may vary in material, silhouette and accent colour,
but it must feel photographed in the same studio.

The production contract is enforced by `scripts/validate-site.js`:

- exactly one WebP per canonical product;
- exactly `1536 × 512` pixels (`3:1`);
- no file larger than `150,000` bytes;
- every registry path must resolve;
- the full set currently contains 24 covers.

## Art direction

All covers share these constants:

- deep warm near-black environment based on `#1F1E1B`;
- one large soft key light from the upper left;
- real paper, stone, metal, ceramic, glass, felt or mineral texture;
- honest imperfections, restrained highlights and a physical contact shadow;
- 85 mm editorial-product-photography character and shallow depth of field;
- one compact subject or one tightly coupled object group;
- the complete semantic subject inside the central 80%;
- the central 84% remains safe when a narrow card crops the side edges;
- no embedded product name: naming and explanation remain accessible HTML.

The common negative direction forbids text, letters, numbers, logos,
watermarks, UI screenshots, interface mockups, charts, diagrams, people,
faces, hands, neon, holograms, HUD overlays, glowing circuit boards, lens
flares, rainbow gradients, visual clutter, plastic CGI sheen, cartoons and
vector illustration.

## Canonical subjects

| File | Product | Physical metaphor |
| --- | --- | --- |
| `klawis.webp` | Klawis | Cotton-paper answer anchored by one brass source thread |
| `softly.webp` | CoupleOS / Softly | Two independent river stones with warmth in the space between them |
| `growthops-ai.webp` | GrowthOps AI | Repeatable machined modules on one production rail |
| `ttyl.webp` | TTYL Platform | A sealed steel enclosure with one controlled teal seam |
| `dostupnoe-pravo.webp` | Доступное Право | A precise status sequence of heavy cards, one moving forward |
| `ai-classroom.webp` | AI Classroom Intelligence | An optical lens that refracts an observable evidence field |
| `car-superapp.webp` | CAR Superapp | A precision brake disc as service mechanics made tangible |
| `helion.webp` | Helion | A planetary limb defined by a thin, scalable atmospheric edge |
| `stones.webp` | Stones | A split geological sample exposing layers of time |
| `sentinel.webp` | Sentinel Edge | A quiet ceramic sensor with one live lime signal at its base |
| `cardioguard.webp` | CardioGuard | A heartbeat formed as physical relief rather than a drawn chart |
| `task-manager.webp` | Task Manager | A spoken rhythm frozen into solid brass bars |
| `marketbot.webp` | Marketbot | Many offer tiles converging into one selected result |
| `izatullo.webp` | IZATULO / BEL ALMA | Anthracite shown honestly through its fractured material |
| `forge.webp` | Forge / Learning OS | The same volume before and after precise machining |
| `belfproctor.webp` | BelfProctor | A sealed evidence capsule, deliberately neutral and non-surveillant |
| `laplacefx.webp` | LaplaceFX | A sober analog gauge measuring inside a bounded tolerance zone |
| `bioflux.webp` | BioFlux Observer | An industrial flow section with one explicit physical threshold |
| `vfs-killer.webp` | VFS Killer | A clean physical pass through one narrow steel gateway |
| `med-exe.webp` | med-exe | Precision calipers as exact calculation without medical cliché |
| `3d-landing.webp` | 3D Landing | Space treated as a physical sculptural material |
| `vacation-control.webp` | Vacation Control Agent | A policy-controlled shutter with exactly one approved open slot |
| `b24-sales-analyst.webp` | B24 Sales Analyst | A deterministic measurement carriage aligned to one physical notch |
| `chat-app.webp` | ChAT | Two self-contained local peers joined by one reliable short bridge |

## Generation and post-processing

Generation creates source PNGs only. Source art belongs in the ignored local
directory `tmp/project-image-sources/`; generated tool UUIDs must never be used
as production filenames. A selected source is renamed to the canonical slug
before processing.

Run from the repository root:

```powershell
python scripts/process-project-images.py
npm run validate
```

`process-project-images.py` performs a centred 3:1 crop, a Lanczos resize to
1536 × 512 and a per-file WebP quality search. It chooses the highest quality
that fits the 150 KB budget, writes through a temporary file and verifies the
format and dimensions before atomically replacing the production asset.

The centred crop is permitted only when the source was authored with the
complete subject in the safe zone. Do not use the script to rescue a badly
composed source; regenerate that source instead.

## Runtime and accessibility rules

- Project-card images are decorative because the adjacent HTML already names,
  explains and links the product; use `alt=""` and keep the frame hidden from
  the accessibility tree.
- Case-page hero images follow the same rule because the semantic hero copy is
  immediately adjacent.
- The original `<img>` is always the reliable fallback. Optional WebGL image
  motion may overlay it only after a frame is actually painting.
- Never hide product meaning inside the image.
- Never include private names, customer data, metrics, chat identifiers,
  screenshots or internal architecture in a generated cover.
- A cover change is incomplete until desktop and mobile cards, one public live
  transition and one private case-page hero have been visually checked.

## Review gate

Before accepting a new cover, verify all of the following:

1. The metaphor describes the product even when colour is removed.
2. The scene still reads at card-thumbnail size.
3. The object remains complete after the mobile side crop.
4. Materials look physically plausible and avoid glossy CGI.
5. No text-like artefacts or pseudo-UI are present.
6. The composition is not a duplicate of another product.
7. The registry path, dimensions, format and byte budget pass validation.
8. The card and case-page fallbacks remain useful with WebGL disabled.
