# Samandar Portfolio Design System

Статус: `v3 / authoritative`
Вертикальный эталон: `intro → hero → signal`
Языки: `RU / EN / UZ`
Тема: только тёмная, material editorial

## 1. Идея

Сайт показывает не «набор технологий», а один контур ответственности:

`BUILD → VERIFY → SHIP`

Samandar проектирует и собирает продукт, проверяет его как QA-инженер и
доводит до production. Каждый визуальный эффект обязан усиливать один из этих
трёх смыслов. Эффект без продуктовой функции удаляется.

Характер:

- тёплая тёмная материальность вместо неона и sci-fi UI;
- editorial-масштаб и инженерная точность;
- доказательства, состояния и реальные маршруты вместо вымышленных метрик;
- заметная режиссура без scroll-jacking;
- одна визуальная система на главной и 15 case pages;
- одинаковая типографическая идентичность в RU, EN и UZ.

## 2. Signature motif — Proof Rail

Proof Rail — калиброванная линия с тремя контрольными точками:

1. `BUILD` — архитектура, интерфейс, код, AI.
2. `VERIFY` — test design, API/UI checks, CI, regression control.
3. `SHIP` — production, наблюдаемость, поддержка результата.

Rail используется только там, где есть реальный маршрут или доказательная
структура:

- финальный beat интро;
- нижняя граница Hero;
- переход в Signal;
- схемы архитектуры на case pages;
- QA/evidence-блоки;
- итог builder-конфигурации.

Rail не является процентом готовности проекта и не имитирует живую телеметрию.

## 3. Token architecture

### 3.1 Reference tokens

Физические значения объявляются один раз в `src/styles/styles.css`:

- бренд: `--bg-*`, `--text-*`, `--accent-*`;
- шаги: `--space-1 … --space-32`;
- форма: `--radius-control/card/panel/pill`;
- движение: `--ease-*`, `--d-*`;
- глубина: `--elevation-*`, `--z-*`.

### 3.2 Semantic tokens

Компоненты используют роли, а не hex:

| Роль | Токен |
|---|---|
| canvas | `--surface-canvas` |
| quiet surface | `--surface-subtle` |
| raised panel | `--surface-raised` |
| inset/evidence | `--surface-inset` |
| primary ink | `--ink-primary` |
| secondary ink | `--ink-secondary` |
| muted metadata | `--ink-muted` |
| primary action | `--action-primary` |
| secondary action | `--action-secondary` |
| proof states | `--proof-build/verify/ship` |
| system states | `--state-positive/caution/negative` |

Новый компонент не имеет права заводить локальную «мини-тему». Уникальность
проекта создаётся product accent, композицией и изображением, а не новым набором
базовых поверхностей.

### 3.3 Material contexts

- `dark/material` — основная система;
- `paper` — CV и Quality;
- `print` — PDF/печать;
- `product-accent` — уникальный акцент case page.

Контекст может переопределить semantic role, но не сам компонент.

### 3.4 RGB rule

Токены `*-rgb` хранят каналы через пробел:

```css
--accent-rgb: 217 119 87;
background: rgb(var(--accent-rgb) / 0.2);
```

Запятая ломает slash-alpha без ошибки браузера.

## 4. Цвет и контраст

База:

| Роль | Значение |
|---|---|
| canvas | `#1F1E1B` |
| subtle | `#28251F` |
| raised | `#2F2B24` |
| primary ink | `#F5F0E6` |
| secondary ink | `#B8AC97` |
| muted ink | `#9C9180` |
| faint ink | `#938A7D` |
| terracotta | `#D97757` |
| brass | `#C89B5E` |

Контракт:

- обычный смысловой текст: не ниже `4.5:1`;
- крупный текст: не ниже `3:1`;
- основной текст и CTA по возможности идут выше `7:1`;
- декоративная телеметрия получает `aria-hidden="true"` и не заменяет смысл;
- light plates используют собственные ink/accent roles;
- фотография всегда имеет измеримый readability veil.

## 5. Типографика

Все шрифты self-hosted в `assets/fonts/`; внешнего font CDN нет.

| Роль | Семейство | Назначение |
|---|---|---|
| Display | Oswald variable | имена, заголовки, section scale |
| Body | Inter variable | тексты и интерфейс |
| Mono | JetBrains Mono variable | telemetry, evidence, metadata |
| Editorial | Cormorant Garamond | смысловой акцент и italic voice |

Все четыре роли покрывают кириллицу и Latin Extended. Русский больше не
проваливается в Georgia, а узбекские строки не получают другой рисунок шрифта.

Правила:

- body не меньше `16px` на контентных экранах;
- функциональный mobile text не меньше `10px`;
- значения `7–9px` допустимы только как декоративная телеметрия;
- Hero mobile подгоняет роли по реальным метрикам загруженного шрифта, а не по
  длине английской строки;
- переносы тестируются отдельно в RU, EN и UZ.

## 6. Motion grammar

### 6.1 Роли движения

| Роль | Поведение |
|---|---|
| enter | один осмысленный вход секции |
| focus | hover/focus/tap подчёркивает действие |
| transition | нативный scroll или interruptible navigation |
| ambient | редкое фоновое дыхание, не постоянный шум |
| proof | линия проходит реальные checkpoints |
| reduced | конечное состояние без continuous motion |

### 6.2 Timing

- instant: `--d-instant`;
- control: `--d-fast`;
- component: `--d-mid`;
- section: `--d-slow`;
- staged scene: `--d-scene`.

Новые literal duration/easing запрещены. Motion работает через
`--ease-out`, `--ease-emphasized`, `--ease-standard`,
`--ease-overlap`.

### 6.3 Intro contract

- первый вход: `2.4–2.9s`;
- повторный вход: `2.0–2.3s`;
- deep link: без интро;
- hard recovery cap: меньше `3.6s`;
- scroll под curtain заблокирован;
- Hero собирается под последним beat интро;
- состояния: `BUILD → VERIFY → SHIP → ONLINE`;
- boot log, Tashkent telemetry и core pulse существуют как одна композиция;
- `92 → 99` проходит плавно, без скачка к 100.

### 6.4 Hero → Signal

- нативный sticky curtain, scroll остаётся `1:1`;
- mobile Hero занимает около `86svh`, поэтому Signal виден на первом экране;
- отдельная floating scroll-подсказка удалена: направление показывает Proof Rail
  и видимый край Signal;
- Signal не переключает текст автоматически;
- accordion полностью управляется читателем;
- reduced motion меняет движение, но не `aria-expanded`/`aria-hidden`.

## 7. Reference components

### Section heading

- eyebrow/number задают координату;
- display title несёт смысл;
- meta содержит только проверяемый контекст;
- один line-mask entrance, без двойного transform.

### CTA

- один визуально главный action;
- вторичный не конкурирует по заливке;
- mobile target не меньше `48×48px`;
- hover, focus и press должны композироваться, а не перезаписывать transform;
- текст проверяется на длиннейшем locale.

### Project card

- фотография `1536×512`, safe area 84%;
- название, роль, краткий outcome;
- live-проект: primary ведёт на live, GitHub — secondary;
- private/case: primary ведёт на case page;
- возврат из case page приходит к точной исходной карточке.

### Disclosure

- affordance однозначен;
- визуальное и ARIA-состояние имеют один источник истины;
- reduced motion не раскрывает скрытые данные самовольно.

### Evidence

- только реальные ссылки, тестовые артефакты, публичный код и безопасные
  NDA-формулировки;
- никаких фальшивых queued/live/verified состояний;
- диаграмма обязана объяснять архитектурное решение, а не украшать фон.

## 8. Performance and device policy

Цели:

- LCP `≤2.5s desktop`, `≤3.5s mobile`;
- INP `≤200ms`;
- CLS `≤0.05`;
- high: `55–60 FPS`;
- mid: стабильные `≥45 FPS`;
- low/reduced: тот же смысл и композиция без continuous GPU motion.

Деградация снимает стоимость в порядке:

1. image shader;
2. pointer depth;
3. ambient layers;
4. staged decorative details.

Никогда не снимаются текст, CTA, Proof Rail, нативный transition и доступность.

## 9. Source-of-truth and build

- `src/content/product-registry.js` — 24 продукта и routing;
- `src/content/content.js` — главная RU/EN/UZ;
- `src/projects/landings-data.js` + `landings-new.js` — 15 case pages;
- `src/projects/render.js` — единый browser/build renderer;
- `*.jsx` — source, `*.js` — generated;
- `projects/*/index.html` — generated, вручную не редактируется.

После JSX/content/version изменений:

```bash
node build.js
node scripts/validate-site.js --generated
npx playwright test --reporter=line --workers=2
```

`?v=` сначала меняется в `index.html`, затем case pages пересобираются.

## 10. Acceptance gates

Vertical slice считается принятым, когда:

- Builder + QA явно видны в первом viewport;
- intro, Hero и Signal читаются как одна постановка;
- RU/EN/UZ не имеют overflow и случайного fallback;
- desktop 1440×1000 и mobile 390×844 визуально проверены;
- mobile UZ CTA и роли не обрезаются;
- axe не находит critical/serious нарушений;
- Chromium desktop/mobile, iPhone WebKit и reduced-motion проходят gate;
- recovery/deep-link/return-to-card остаются рабочими;
- нет известного P0-дефекта в изменённом контуре.

## 11. Migration rule

Старая часть сайта ещё содержит raw colors/timings. Она мигрирует по сценам,
чтобы не сломать существующую драматургию одним массовым replace. При этом:

- новые raw color/duration/easing не добавляются;
- каждая переработанная секция полностью переводится на semantic roles;
- после миграции последней сцены CI запрещает новые raw values автоматически;
- landing, paper/print и builder получают те же reference roles до релиза.
