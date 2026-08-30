# Design system портфолио Samandar

Статус: описание текущей реализации.

Область: главная страница, 30 карточек продуктов и 20 проектных case routes.

Локали: RU, EN, UZ.

Визуальный режим: единый тёмный Release Field; CV и Trust содержат светлые
документные поверхности, но не меняют фон всей главы.

Этот документ фиксирует уже реализованную визуальную систему. Он не заменяет исходный код и не является доказательством прохождения ручной проверки или получения Awwwards-награды.

Текущая режиссура V8.1 и её адаптивные/motion-контракты дополнительно описаны в
`docs/ART-DIRECTION-V3.md`.

## 1. Источники истины

| Область | Авторитетный источник |
|---|---|
| порядок и состав 12 сцен | `FULL_MENU_SECTIONS` и фактический DOM в `src/components/app.jsx` |
| компоненты главной | `src/components/*.jsx`; одноимённые `.js` — generated artifacts |
| тексты главной и карточек RU/EN/UZ | `src/content/content.js` |
| идентичность, порядок, маршруты и публичные границы 30 продуктов | `src/content/product-registry.js` |
| содержимое 20 кейсов | `src/projects/landings-data.js` |
| разметка кейсов и общий UI-копирайт | `src/projects/render.js` |
| базовые токены и shell | `src/styles/styles.css` |
| композиции сцен и адаптивность главной | `src/styles/sections.css`, `src/styles/features.css`, `src/styles/cv-doc.css`, V3 layer `src/styles/art-direction.css` и финальный release owner `src/styles/release-polish.css` |
| визуальная система кейсов | `src/projects/landing.css` |
| production CSS главной | generated `src/styles/app.bundle.min.css`; собирается `build.js` из authored sources в фиксированном порядке |
| адаптивные и визуальные проверяемые контракты | `tests/responsive-matrix.spec.js`, `tests/stage5-sections.spec.js`, `tests/landings.spec.js`, `tests/visual-release.spec.js` |

Если текст документа расходится с этими файлами, верен код. Числа `30 / 10 / 20 / 3` дополнительно закреплены в `scripts/validate-site.js` и проверяются до и после сборки.

## 2. Дизайн-намерение

Позиционирование строится вокруг одного инженерного маршрута:

`BUILD → VERIFY → SHIP`

Сайт показывает не перечень технологий, а способность спроектировать продукт, собрать его, проверить как QA-инженер и довести до доступного результата. Визуальный язык соединяет:

- editorial-масштаб и читаемую иерархию;
- тёплую материальность вместо неонового sci-fi интерфейса;
- инженерную точность в сетке, моноширинных метаданных и схемах;
- заметную режиссуру без scroll-jacking;
- честные статусы, доказательства и границы вместо вымышленных метрик.

Signature motif — Proof Rail. Это линия с тремя контрольными состояниями BUILD, VERIFY и SHIP. Она обозначает реальный путь работы, а не процент готовности, live-телеметрию или обещание production-статуса.

В первой сцене Proof Rail материализован как `Release Specimen`: три физических
слоя собраны одной измерительной осью и одним inspection-light. Это предметная
метафора продукта, прошедшего BUILD, VERIFY и SHIP, а не HUD-схема. Сцена
строится HTML/CSS и существует уже в parser frame-zero, поэтому Intro и Hero
используют один объект без raster decode и layout shift.

## 3. Двенадцать сцен главной

Порядок ниже одновременно является порядком DOM, полноэкранного меню, счётчика
и мобильного rail. Компактная инструментальная рейка сознательно показывает
только текущую главу, прогресс и главное действие; язык находится в Index,
который раскрывает все двенадцать глав.

| № | ID | Роль в истории | Motion-сигнатура / композиционный контракт |
|---:|---|---|---|
| 01 | `hero` | продуктовый тезис, авторство и ownership loop | proposition-led Release Specimen; split-stage desktop и самостоятельная mobile/landscape композиция с видимым переходом в Signal |
| 02 | `signal` | причины работать вместе | `emerge`; читатель сам управляет disclosure |
| 03 | `about` | ownership и проверяемый контекст | `develop`; annotated maker's proof с маршрутом Brief → Build → Verify → Release |
| 04 | `projects` | 30 продуктов | `rise`; desktop grid и mobile horizontal gallery |
| 05 | `builder` | Scope Preview будущего проекта | `assemble`; параметры превращаются в composition, relative complexity, stages, risks и next step без цены или обещания срока |
| 06 | `skills` | инженерная и QA-компетенция | `converge`; аналитический холодный акт |
| 07 | `services` | форматы сотрудничества | `slide-left`; первая половина pinned-overlap с CV |
| 08 | `cv` | документированная карьера | `curtain`; светлый документ внутри тёмной главы |
| 09 | `process` | способ работы | `line-stagger`; последовательный delivery pipeline |
| 10 | `faq` | снятие возражений | `transcript`; раскрываемые ответы с явным affordance |
| 11 | `trust` | quality lifecycle и граница релиза | `slide-right`; три тёмных этапа и шесть фактических проверок |
| 12 | `contact` | финальное действие | `rise-bright`; тёплая кульминация и второй pinned-overlap |

Два `Interlude` между крупными актами являются связками, а не самостоятельными секциями: у них нет `data-section`, поэтому они не искажают нумерацию и навигацию.

Scope Preview не является калькулятором или офертой. Он помогает увидеть состав
решения, относительную сложность, этапы, риски и следующий шаг; коммерческие
условия обсуждаются индивидуально после уточнения scope, зависимостей и формата
работы.

## 4. Цвет и материальность

### 4.1 База Ember

| Семантика | Токен | Значение |
|---|---|---|
| canvas | `--surface-canvas` / `--bg-0` | `#1F1E1B` |
| subtle surface | `--surface-subtle` / `--bg-1` | `#28251F` |
| raised surface | `--surface-raised` / `--bg-panel` | `#2F2B24` |
| inset surface | `--surface-inset` / `--bg-2` | `#191815` |
| primary ink | `--ink-primary` / `--text` | `#F5F0E6` |
| secondary ink | `--ink-secondary` / `--text-dim` | `#B8AC97` |
| muted ink | `--ink-muted` / `--text-mute` | `#9C9180` |
| faint ink | `--ink-faint` / `--text-faint` | `#938A7D` |
| primary action | `--action-primary` / `--accent` | `#D97757` |
| secondary action | `--action-secondary` / `--accent-2` | `#C89B5E` |

Компонент использует semantic role, а не собственный случайный hex. Индивидуальность продукта создают фотография, `accent`, содержимое и композиция, но не параллельная мини-тема всего интерфейса.

RGB-токены хранят каналы через пробел, например `217 119 87`, потому что CSS использует slash-alpha: `rgb(var(--accent-rgb) / .2)`.

### 4.2 Драматургия актов

`src/engine/acts.js` меняет плотность и температуру материала при смене
активной сцены, но сохраняет один near-black canvas и один brass/ember accent.
Главы отличаются композицией и смысловым жестом, а не отдельной цветной темой.
Contact получает самый тёплый локальный акцент без разрыва общего мира.

CV остаётся светлой document-поверхностью внутри тёмного chapter shell. Trust
намеренно остаётся тёмным: quality lifecycle относится к основному delivery
контуру и использует brass/ember акценты той же системы, а не отдельную
paper/protocol метафору.

## 5. Типографика

Четыре характерных семейства self-hosted в `assets/fonts/`; внешнего font CDN
нет. Для RU, EN и UZ поставляются отдельные Cyrillic, Latin и Latin Extended
диапазоны. Основной текст использует Inter; system UI остаётся fallback на
случай ошибки загрузки, поэтому читаемость не зависит от внешнего сервиса.

| Роль | Семейство | Использование |
|---|---|---|
| Display | Oswald variable, `300–700` | имена, крупные заголовки, номерные сцены |
| Body | Inter variable, `300–700` | тексты, формы и интерфейс; system UI — fallback |
| Mono | JetBrains Mono variable, `300–600` | статусы, telemetry, evidence, metadata |
| Editorial | Cormorant Garamond, `500` normal/italic | редкий человеческий и документный акцент |

Базовый текст главной — `16px / 1.62`. Размеры заголовков fluid через `clamp()`. Длинные RU/EN/UZ строки проверяются как отдельные layout-сценарии; нельзя оценивать переносы только по английской версии.

Hero proposition анимируется строками, а не отдельными glyph. Обе Oswald-строки
являются цельными phrase spans с одним владельцем transform на строку.
Посимвольный depth/stagger и отдельный italic-output запрещены: они нарушают
baseline при font settling и между browser engines.

## 6. Пространство, форма и слой

Сетка использует базовый шаг 4px:

- `--space-1 … --space-32`: `4 … 128px`;
- `--gap-section`: `clamp(96px, 10vw, 160px)`;
- `--gap-block`: `clamp(40px, 5vw, 72px)`;
- `--pad-card`: `clamp(20px, 2.2vw, 32px)`;
- `--max-w`: `1440px`;
- `--gutter`: `clamp(20px, 4vw, 64px)`;
- `--nav-h`: `60px` плюс safe-area inset.

Форма: control `6px`, card `10px`, panel `16px`, pill `999px`. Скругление следует функции: интерактивный control, карточка, крупная панель или capsule; декоративное смешивание радиусов не допускается.

Каждая секция получает `scroll-margin-top` с учётом fixed navigation. Z-index берётся из `--z-*`; recovery и intro являются отдельными верхними слоями, а не случайными большими числами внутри компонентов.

## 7. Motion grammar

Базовые duration tokens:

- `--d-instant`: `0.12s × --motion`;
- `--d-fast`: `0.20s × --motion`;
- `--d-mid`: `0.46s × --motion`;
- `--d-slow`: `0.90s × --motion`;
- `--d-scene`: `1.25s × --motion`.

Easing tokens: `--ease-out`, `--ease-emphasized`, `--ease-standard`, `--ease-overlap`, `--ease-spring`.

Движение имеет одну из ролей: section entrance, focus feedback, navigation transition, ambient atmosphere или proof progression. Оно не должно скрывать смысл, менять истинность состояния или блокировать нативный скролл. Техническая реализация, tier-policy и бюджеты описаны в `docs/MOTION-PERFORMANCE.md`.

## 8. Продуктовая система

### 8.1 Карточки

В реестре ровно 30 продуктов, отсортированных по `featuredRank`:

- 10 `presentation: "live"`: primary CTA открывает реальный HTTPS live-site;
- 19 `presentation: "case"`: primary CTA открывает локальный case route;
- публичный GitHub, если он разрешён реестром, остаётся отдельным secondary CTA;
- возврат из кейса ведёт к `#proj-<slug>`, раскрывает каталог при необходимости и возвращает позицию чтения к исходной карточке.

Desktop-каталог начинает с шести сильнейших карточек в порядке DentForma, Klawis,
TTYL Platform, BelfProctor, Softly и GrowthOps AI; явная команда раскрывает
остальные 24. Двухколоночная feature-сетка `7/5` чередует крупные и компактные
карточки, но сохраняет одну информационную иерархию. Верхняя кромка, status,
CTA, ambient wash и pager берут уникальный `accent` продукта из registry;
композиция фотографии уточняется независимой `object-position`, поэтому
индивидуальность не зависит только от цвета.

При ширине `≤900px` все 30 карточек доступны сразу, а локализованные
category-фильтры сужают тот же canonical array без дублей. Каталог становится
горизонтальной flex-галереей с нативным scroll snap, видимым краем следующей
карточки и явным pager; она не заменяется вертикальным списком и не перехватывает
вертикальный scroll. Пока Projects является активной сценой, его собственный
pager заменяет общий mobile dock, чтобы два нижних управляющих слоя не
конкурировали. На `320 px` pager обязан оставаться не выше `72 px`, карточка —
не уже читаемой viewport-колонки, а заголовок — иметь auto-height без обрезки.

### 8.2 Обложки

Для каждого продукта обязательны три WebP-файла 3:1:

| Кандидат | Размер | Максимальный вес |
|---|---:|---:|
| основной | `1536×512` | `150 KB` |
| responsive | `1152×384` | `100 KB` |
| responsive | `768×256` | `60 KB` |

Размеры, формат, вес и отсутствие лишних responsive-файлов проверяет `scripts/validate-site.js`. Центральная безопасная зона около 84% — guideline для авторинга, потому что мобильный frame может подрезать края; валидатор проверяет геометрию файла, но не художественную композицию.

Фотография остаётся реальным `<img>` даже при активном ImgFx. WebGL только усиливает изображение и никогда не является единственным носителем содержания.

### 8.3 Case pages

Каждый из 20 кейсов имеет три физически сгенерированные страницы: RU в `/projects/<slug>/`, EN в `/projects/<slug>/en/`, UZ в `/projects/<slug>/uz/`. Итого — 60 статических HTML-файлов.

Единая структура содержит:

1. Thesis;
2. Context;
3. System;
4. Evidence;
5. Boundaries.

Кейс также обязан иметь три quick facts, стек, system flow минимум из четырёх узлов, QA-подход и честную публичную границу. Общая design system едина, но акцент, фотография, схема и аргументация принадлежат конкретному продукту.

## 9. Навигация и интерактивность

- fixed navigation сохраняет brand, язык, chapter counter и menu trigger;
- menu trigger имеет локализованную видимую метку `МЕНЮ / MENU / MENYU` на
  desktop и самостоятельную 44×44+ icon-позу на touch;
- при ширине `>1160px` видны семь primary links; в диапазоне `901–1160px` они заменяются компактным chapter counter;
- fullscreen menu всегда повторяет реальный порядок двенадцати DOM-сцен;
- mobile command dock появляется после Signal, но скрывается на Contact;
- в коротком landscape `≤900×520` нижний dock скрыт: верхний counter остаётся доступным и не перекрывает контент;
- disclosure обязан иметь согласованные визуальное и ARIA-состояния;
- keyboard focus не должен уходить под nav, sticky chapter bar или mobile dock;
- smart cursor существует только для fine pointer и не заменяет нативный focus ring.
- cursor отвечает контексту: action-reticle появляется только над реальным
  действием, а навигационные burger/close не дублируют собственную анимацию
  отдельным click-ripple;
- low/reduced tier сохраняет типографику, пространственную композицию и
  нативный scroll, но не выполняет full-document geometry sweep, blur navigation
  и вычисления для уже отключённых transform owners.

## 10. Responsive contracts

Главный breakpoint каталога и mobile shell — `900px`; case layout перестраивается на `980px`, а узкая case-композиция — на `700px`. Внутренние breakpoint-правила могут быть более точными, но не должны противоречить этим продуктовым контрактам.

Автоматическая sweep-матрица главной содержит:

`320×568`, `360×800`, `375×812`, `390×844`, `430×932`, `768×1024`, `844×390`, `1024×768`, `1280×800`, `1440×1000`, `1920×1080`.

Она проверяет отсутствие horizontal overflow, сохранность shell, desktop/mobile режим галереи, видимость следующей карточки, keyboard focus, 200% text reflow, открытую навигацию при rotation и сохранение состояния раскрытого каталога. Это автоматический contract, а не заявление о ручной проверке каждого физического устройства.

## 11. Accessibility и reduced motion

- первый keyboard target на свежем входе — skip link к `#main`;
- интерактивные элементы имеют `:focus-visible`;
- основные Hero touch targets проверяются как минимум `44px`;
- fullscreen menu управляет `aria-hidden`, `inert`, focus containment и Escape;
- active navigation использует `aria-current`;
- изображения имеют текстовый fallback, а декоративные слои скрыты от accessibility tree;
- `prefers-reduced-motion: reduce` сохраняет все 30 карточек, тексты, CTA и нативную навигацию;
- reduced mode отключает continuous scheduler и optional Three.js, но не раскрывает скрытые пользователем данные и не меняет семантическое состояние disclosure;
- автоматический axe gate покрывает WCAG 2.2 A/AA ruleset, однако он не заменяет NVDA, VoiceOver и проверку на физических устройствах.

## 12. Правила изменения системы

1. Сначала меняется source-of-truth, затем запускается `npm run build`.
2. `.jsx` редактируется; generated `.js` вручную не меняется.
3. `projects/**/index.html` не редактируются вручную: их выпускает `build.js`.
4. Новый продукт сначала получает запись в canonical registry, затем card copy, route/case data и три изображения.
5. Новый visual token добавляется только если существующая semantic role не выражает задачу.
6. Новая motion-функция подписывается на общий runtime и policy; отдельный perpetual RAF запрещён.
7. Любая новая responsive композиция проверяется на overflow, focus obstruction, RU/EN/UZ и reduced motion.
8. Автоматический тест подтверждает только заявленный им контракт; непроведённая ручная проверка не документируется как выполненная.
