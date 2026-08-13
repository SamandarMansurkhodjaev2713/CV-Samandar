# QA matrix и release gates

Актуально на: 2026-08-13

Тестовый runner: Playwright 1.62.0 + Axe 4.12.1

Конфигурация: `playwright.config.js`

## 1. Принцип доказательства

`GREEN` означает только одно: указанный gate выполнен на том же commit и
завершился с exit code 0, а его report/artifact доступен для проверки. Наличие
теста в репозитории не является доказательством его последнего успешного
прогона.

Статусы в этом документе:

- **GREEN** — есть актуальный результат текущего workspace/commit;
- **AUTOMATED GATE** — блокирующая автоматическая проверка; статус берётся из
  текущего CI run или локального report, а не из документа;
- **MANUAL / EXTERNAL** — проверка требует человека, assistive technology,
  физического устройства или внешней инфраструктуры;
- **NOT RUN** — в текущем документальном изменении доказательство не получено.

Документ не обещает «невозможность бага». Релиз считается допустимым, когда
все blocking automated gates зелёные, обязательный manual/external sign-off
выполнен, а открытых critical/high дефектов нет.

## 2. Текущее доказательство этого изменения

| Gate | Статус | Доказательство |
|---|---|---|
| Generated site contract | **GREEN** | `v233` `npm run validate` → `OK — 25 products, 9 live routes, 16 case routes, 3 locales`; 48 generated case pages и 49 sitemap URL (2026-08-13) |
| Full Playwright matrix | **GREEN** | финальный `v233` `npm test` → 261 scenario, 151 passed / 110 осознанно profile-skipped / 0 failed / 0 flaky за 13.6 min; локальный Windows gate — 1 worker, 0 retry; Chromium desktop/mobile, Firefox, WebKit и reduced-motion (2026-08-13) |
| Isolated performance budgets | **GREEN** | финальный `v233` `npm run test:performance` → desktop/mobile 2/2, serial worker=1; LCP element attribution сохранён в report (2026-08-13) |
| Navigation/reduced stress | **GREEN** | exact-card + locale/background navigation → 30/30 desktop и exact-card → 10/10 mobile; reduced scheduler final-frame contract → 30/30 (2026-08-13) |
| iPhone WebKit critical path | **GREEN** | полный финальный gate 2/2; переходы используют нативный URL contract без blocking exit timer (2026-08-13) |
| Build determinism | **GREEN** | `v233` `npm run check:build` → 54 generated artifacts byte-identical в двух последовательных сборках (2026-08-13) |
| Dependency/secret gates | **GREEN** | `npm audit --audit-level=high` → 0 vulnerabilities; `npm run scan:secrets` → no credential signatures (2026-08-13) |
| External live routes | **GREEN** | `npm run check:live` → 9/9 live-маршрутов вернули usable HTML (2026-08-13) |
| Deployed production smoke | **NOT RUN for v2.13.1** | текущий production `v2.13.0 / v232` на SHA `4d3c423` остаётся зелёным baseline; candidate `v2.13.1 / v233` требует deploy и отдельный post-deploy smoke |
| Scheduled synthetic production monitor | **GREEN** | manual run `31487035854` на `4d3c423`: functional smoke, 9/9 live routes и desktop/mobile vitals success; JSON artifact → 0 failures / 0 violations (2026-08-11) |
| Visual capture + human review | **GREEN** | `v233` `VISUAL_QA=1` → 4/4: 12 main scenes + 16 full-page case на desktop/mobile; четыре contact sheet и увеличенные Hero/Projects просмотрены вручную на текущем workspace (2026-08-13) |
| Manual production browser journey | **GREEN (desktop)** | опубликованный `v232` в Chromium 1280×720: 25 карточек, archive expand, Birthday RU→EN, возврат к `#proj-birthday-agent` без Intro, меню и runtime console errors = 0; mobile production остаётся автоматизированным/визуальным, не ручным physical evidence (2026-08-11) |
| NVDA / VoiceOver / physical devices | **NOT RUN** | локальная headless-среда не может честно подтвердить эти проверки |

Candidate `v2.13.1 / v233` прошёл все локальные automated gates, но ещё не
объявляется production до deploy и отдельного post-deploy smoke. Production
`v2.13.0 / v232` из SHA `4d3c423` остаётся зелёным baseline и прошёл deploy,
verify-production, независимый smoke и synthetic monitor. `v2.12.1` остаётся
предыдущим rollback baseline. Physical device и
assistive-technology проверки остаются отдельным внешним доказательством и не
объявляются выполненными.

## 3. Блокирующий automated pipeline

Последовательность соответствует quality/deploy workflows:

| Порядок | Gate | Команда / механизм | Green criterion |
|---:|---|---|---|
| 1 | Locked install | `npm ci` | установка точно по lockfile без ошибки |
| 2 | Dependency audit | `npm audit --audit-level=high` | нет high/critical vulnerability, влияющей на gate |
| 3 | Secret scan | `npm run scan:secrets` | нет secret candidate в публикуемой поверхности |
| 4 | Deterministic build | `npm run check:build` | повторная сборка byte/stage-stable, source и generated не расходятся |
| 5 | Generated drift | CI `git status` для `index.html`, `src/components`, `projects`, `sitemap.xml` | после build нет незакоммиченного generated drift |
| 6 | Site contract | `npm run validate` | 25 unique, 9 live, 16 case, 3 locale; все структурные/SEO/privacy/assets invariants выполнены |
| 7 | Browser matrix | `npm test` | validator + все обязательные Playwright projects без failed/flaky результата |
| 8 | Performance isolation | `npm run test:performance` при release rehearsal | оба Chromium performance tests зелёные в serial/worker=1 режиме |
| 9 | Visual capture | `npm run qa:visual` | все 12 main scenes и 16 case pages сняты в desktop/mobile без capture error |
| 10 | Human/external sign-off | чек-лист раздела 8 | evidence записано по устройству/AT/browser; blocker отсутствует |
| 11 | Deployed production smoke | `npm run test:production` | production main монтирует 25 карточек без first-party HTTP/runtime errors; все 48 case URL отдают нужную locale; case возвращает к точной карточке без intro |

`npm run qa:visual` автоматизирует получение материала, но не является
самостоятельным визуальным PASS: contact sheets должен просмотреть человек.

## 4. Playwright project matrix

| Project | Engine / viewport | Назначение |
|---|---|---|
| `desktop-chromium` | Desktop Chrome, 1440×1000 | полный функциональный, semantic, responsive, motion/WebGL и desktop contract; игнорирует только dedicated reduced/WebKit/Firefox specs |
| `mobile-chromium` | Pixel 7, 412×839 | mobile behavior, geometry, touch/coarse-pointer, all-case overflow sweep и performance |
| `mobile-webkit` | iPhone 13, 390×844 | только `webkit-smoke.spec.js`: first-load intro и критический portfolio journey |
| `desktop-firefox` | Desktop Firefox, 1440×1000 | только `firefox-smoke.spec.js`: каталог, locale, case/chapter routing |
| `reduced-motion` | Desktop Chrome, 1440×1000, `reducedMotion=reduce` | только `reduced-motion.spec.js` |

Общие настройки: fully parallel; timeout 45 s; assertion timeout 7 s; в Linux
CI 2 workers и до 2 retry, локально на Windows 1 worker без retry из-за
доказанной конкуренции двух тяжёлых WebGL contexts при teardown;
trace/screenshot/video сохраняются на failure. Retry не
скрывает flaky: release evidence должен показывать отсутствие flaky outcome.

## 5. Traceability всех automated specs

| Spec | Что доказывает | Scope / важное ограничение |
|---|---|---|
| `accessibility.spec.js` | Axe WCAG 2.2 A/AA для main, всех 16 case и 404; keyboard reachability skip-link/nav/locale | Axe не заменяет screen reader и cognitive/manual review |
| `builder.spec.js` | native choices, честный estimate, RU/EN/UZ handoff, mobile target geometry | deterministic UI contract преимущественно desktop Chromium |
| `builder-estimator.spec.js` | полный combinatorial estimator domain, finite/ordered ranges, monotonic complexity/maturity, AI-layer truth | pure Node domain tests; не проверяет market pricing |
| `catalog.spec.js` | 25 canonical cards, no duplicate routes, 9/16 split, initial 4 + expand 21, locale parity, exact-card return | route/data contract из registry |
| `contact.spec.js` | отсутствие fake endpoint/success, exact Telegram brief, native validation, mobile reachability | не отправляет реальное сообщение и не доказывает доступность Telegram |
| `cv.spec.js` | APG tabs, facts/actions/locales, real local PDF bytes, narrow/landscape focus and clipping | binary/download проверены; печать и visual PDF требуют manual pass |
| `degraded.spec.js` | pre-React recovery, font fallback, artwork fallback, GitHub API fallback, optional Three.js failure | controlled fault injection; не моделирует все network/CDN faults |
| `design-system.spec.js` | type system, 12 chapters, menu modal/focus/inert, chapter order, mobile hero/dock, intro contract, shared runtime ownership | включает explicit viewport/language geometry contracts |
| `firefox-smoke.spec.js` | каталог, expand, language, case chapter/locale routing без page errors | smoke, не полный Firefox regression suite |
| `img-fx-lifecycle.spec.js` | one WebGL renderer/subscriber, latest-host race, tier park, context loss/restore, dispose, in-flight load safety | desktop Chromium; real GPU/driver diversity требует devices |
| `landings.spec.js` | 16 generated RU structures, mobile overflow sweep, new-case locale routing, chapter deep links, reload preservation | desktop complete sweep + shared mobile geometry sweep |
| `motion-lifecycle.spec.js` | shared subscribers, magnetic transform ownership, near-viewport parallax, offscreen pause, dispose/re-init, no mobile cursor | engine-independent logic mainly в Chromium |
| `motion-policy.spec.js` | single tier source, subscription cleanup, reactive reduced motion, high/mid/low capability matrix, viewport class | policy contract, не field performance |
| `motion-runtime.spec.js` | strict frame phases, single input stream, subscriber cleanup, reduced scheduling stop | scheduler contract в desktop Chromium |
| `perf-policy-unit.spec.js` | high/low FPS sampling boundaries and sleep behavior | synthetic clock harness; не пользовательская метрика |
| `performance-budget.spec.js` | intro release, LCP/CLS, long tasks, event latency, scroll frames, transfer budgets, adaptive low-tier response | calibrated only for desktop/mobile Chromium; JSON metrics attached per run |
| `process.spec.js` | four-phase evidence ledger, no fake terminal telemetry, full RU/EN/UZ IA, compact layout | content/geometry contract |
| `production-smoke.spec.js` | opt-in deployed main, 48 localized case routes и exact-card return без intro | skipped без `PRODUCTION_SMOKE=1`; использует production base URL и не входит в обычный local `npm test` как выполненный smoke |
| `reduced-motion.spec.js` | reduced intro, no canvas, content visibility, native navigation, all 25 cards | dedicated reduced-motion project |
| `responsive-matrix.spec.js` | 11 canonical viewports, no overflow, mobile carousel/desktop grid, unobscured focus, 200% text, orientation and breakpoint state | deterministic Chromium reflow matrix; physical browser chrome/safe-area остаются manual |
| `scene-cinema.spec.js` | latest-intent transaction, balanced events, auxiliary lifecycle rejection без `unhandledrejection`, hard timeout recovery, low-tier cut, reduced/back navigation | native View Transition behavior stubbed для deterministic contracts |
| `seo-routing.spec.js` | robots/sitemap/404, main locale URL, canonical/social/hreflang/JSON-LD, localized pre-JS HTML, CSP blocks arbitrary inline script/style | не проверяет crawler cache и external indexing |
| `sound-lifecycle.spec.js` | opt-in sound destroy без orphan listeners/context/classes | не оценивает громкость и UX на реальном устройстве |
| `stage5-sections.spec.js` | QA stack, Services tabs/accordion/related links/locales, FAQ/Quality truthfulness, phone typography | semantic and geometry contract |
| `visual-release.spec.js` | opt-in screenshots: 12 main sections + 16 case pages, desktop/mobile, contact sheets | skipped без `VISUAL_QA=1`; capture ≠ visual approval |
| `webkit-smoke.spec.js` | iPhone WebKit intro release, 25-card journey, menu/EN, localized case, return route | WebKit emulation smoke; physical iPhone остаётся external |

## 6. Structural validator coverage

`npm run validate` — отдельный blocking gate, не дубликат browser tests. Он
проверяет до запуска браузера:

- ровно 25 unique product ID/slug/name/rank/routes;
- split 9 `live` / 16 `case` и approved HTTPS live hosts;
- public GitHub CTA только при public repository alias;
- lifecycle, confidentiality, evidence level, privacy boundary и claims refs;
- 25 project card во всех RU/EN/UZ с одинаковым rank order и route;
- 16 landing definitions, 12 обязательных copy fields, `quick[3]`, flow ≥4;
- 48 generated HTML, self-canonical, full hreflang, localized JSON-LD,
  source/generated body identity и return-to-card link;
- 25 original 1536×512 WebP и responsive 1152×384/768×256 variants с
  зафиксированными byte limits;
- 16 семантически разных architecture diagram kinds;
- NFC, mojibake и mixed-script guards;
- единую motion policy/runtime ownership, script order и lazy Three.js;
- CSP hashes/directives, recovery shell, no-JS fallback и immutable workflow
  security requirements;
- robots, intentional 404 и sitemap из 49 URL.

Validator не проверяет внешний uptime, реальное поведение assistive technology,
визуальную композицию или скорость на физическом устройстве.

## 7. Performance gate: только заданные кодом budgets

Ниже перечислены thresholds из `performance-budget.spec.js`, а не результаты
текущего прогона:

| Signal | Blocking budget |
|---|---|
| Intro release | ≤ 5500 ms + вычисляемый host-delay allowance |
| LCP | desktop ≤ 3800 ms; mobile ≤ 4200 ms |
| CLS | ≤ 0.1 |
| Max long task | ≤ `max(1600 ms, baselineP95 × 6)` |
| Total long tasks | ≤ `max(5200 ms, baselineP95 × 25)` |
| Max observed interaction event | ≤ 800 ms |
| Scroll frame p95 | ≤ `max(40 ms desktop / 45 ms mobile, baselineP95 × 2.5)` |
| Frames over 40 ms | ≤ 8% только при baseline p95 ≤ 25 ms; иначе policy обязана перейти в `low` |
| JavaScript transfer | ≤ 900,000 bytes |
| CSS transfer | ≤ 500,000 bytes |

Каждый run прикладывает `performance-metrics` JSON. Документ не хранит
измеренные LCP/FPS/transfer значения: они должны читаться из report конкретного
commit и среды.

## 8. Manual / external matrix

Эти проверки нельзя честно объявить выполненными локальным headless runner.

| Область | Обязательная среда | Что проверить | Evidence |
|---|---|---|---|
| NVDA | Windows + актуальный NVDA, Chrome и Firefox | landmarks/headings, skip link, menu dialog/inert/focus return, Services/CV tabs, mobile-style accordion с клавиатуры, form errors, route/language context | дата, версии, короткий протокол и blocker list |
| VoiceOver desktop | macOS + Safari + VoiceOver | rotor order, headings/links/buttons, modal focus trap, chapter navigation, case language switch, announcement clarity | дата, macOS/Safari/VO versions, протокол |
| VoiceOver mobile | physical iPhone + iOS Safari | swipe order, touch targets, menu, carousel discoverability, orientation, safe areas, case reading order | device/iOS, portrait+landscape notes, video/screenshots при дефекте |
| TalkBack | physical Android + Chrome | focus order, carousel, fixed dock, forms, locale controls, reduced animation preference | device/Android/Chrome, протокол |
| Physical visual QA | минимум iPhone и Android; desktop Chrome/Safari/Firefox | 12 main sections, 16 case pages, RU/EN/UZ long copy, 200% text, zoom, orientation, no clipping/overlap/flicker | approved contact sheets + issue log |
| Real performance | representative mid/high devices, normal and constrained network | intro, scroll stability, thermal behavior, background/foreground restore, adaptive tier | recorded device/network + trace; без invented aggregate |
| Live routes | внешняя сеть | все 9 live URL, HTTPS, redirects, no auth trap/404, expected project identity | timestamped route report |
| External CTA | GitHub/Telegram | public repos открываются, private URLs не раскрываются, Telegram handoff понятен | timestamped checklist |
| Social previews | Telegram, LinkedIn/X debugger/crawler | canonical, title, description, 3:1 case artwork, cache refresh | preview screenshots/URLs |
| CV/PDF | браузерный viewer и печать | читаемость 2 страниц, download filename, print layout, ссылки и факты | viewed/printed PDF checklist |
| Privacy/content review | product owner / NDA owner при необходимости | ни одна RU/EN/UZ формулировка не раскрывает boundary и не повышает maturity без evidence | signed content review |

Если среда недоступна, статус — `NOT RUN`, а не `PASS BY PROXY`. Axe, WebKit
emulation и responsive viewport не подменяют NVDA, VoiceOver и physical device.

## 9. Release decision record

Перед production commit/tag нужно сохранить:

1. commit SHA и asset version;
2. `npm ci`, audit и secret-scan outcome;
3. deterministic build + generated-drift outcome;
4. validator output с 25 / 9 / 16 / 3;
5. Playwright report без failed/flaky;
6. отдельный performance JSON для desktop/mobile Chromium;
7. visual contact sheets и human approval;
8. manual/external matrix с явными `PASS`, `FAIL` или `NOT RUN`;
9. production smoke для root, 48 case URLs, 404, sitemap и 9 live routes;
10. список известных дефектов и release decision.

Релиз блокируется при любом failed automated gate, critical/high дефекте,
утечке private data/URL, route/locale drift, недоступной основной CTA или
непроверенном обязательном external sign-off.
