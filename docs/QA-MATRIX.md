# QA matrix и release gates

Актуально на: 2026-08-30

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
- **EXTERNAL BLOCKER** — продуктовый сценарий не был запущен из-за подтверждённой
  проблемы host/runtime до открытия страницы; такой статус не считается PASS;
- **NOT RUN** — в текущем документальном изменении доказательство не получено.

Документ не обещает «невозможность бага». Релиз считается допустимым, когда
все blocking automated gates зелёные, обязательный manual/external sign-off
выполнен, а открытых critical/high дефектов нет.

## 2. Текущее доказательство этого изменения

### Локальный release candidate — v248

Контракт кандидата: 30 продуктов, 10 live, 20 privacy-safe case; desktop
показывает четыре feature-карточки (DentForma, Klawis, TTYL Platform,
BelfProctor), mobile — все 30 с фильтрами. Hero, navbar и mobile chapter masks
перестроены без изменения нативного scroll-контракта. Quality — тёмный
трёхэтапный lifecycle с шестью фактическими проверками и release decision.

| Gate | Статус | Доказательство |
|---|---|---|
| Generated/site contract | **GREEN (local candidate)** | `validate` → 30 products / 10 live / 20 case / 3 locales; `check:build` → 67 byte-identical generated artifacts; asset version единообразно поднята до `v248` |
| Security/dependencies | **GREEN (local candidate)** | secret scan clean; `npm audit --audit-level=high` → 0 vulnerabilities; `git diff --check` без whitespace error |
| Targeted product regressions | **GREEN (local candidate)** | Catalog/Quality/Services → 21 passed / 5 profile-specific skipped / 0 failed; mobile Hero locale/viewport matrix → green; WebKit menu/catalog critical path → green; 200% text zoom → green |
| Full Windows browser run | **HOST INCIDENT, localized** | 186 passed / 118 profile-specific skipped; BelfProctor axe worker завершился Chromium OOM, затем chapter-order artifact не записался из-за `ENOSPC`. После освобождения ресурсов оба сценария независимо прошли 1/1 в `--workers=1`. Clean full-run переносится в CI того же SHA; flaky или product PASS не заявляется |
| Performance budgets | **GREEN (local candidate)** | desktop budget прошёл в общем gate; первый mobile run имел единичный host long task после memory pressure, чистый isolated mobile run → 1/1 без изменения порогов |
| External live routes | **GREEN (local candidate)** | 10/10 approved HTTPS routes вернули usable HTML |
| Visual capture | **GREEN (local candidate)** | `qa:visual` → 4/4: desktop/mobile main scenes и все 20 desktop/mobile case pages; browser geometry отдельно подтверждает 320×568 Hero, 4/26 desktop Projects, all-30 mobile Projects и отсутствие document overflow |
| Deploy и post-deploy smoke | **NOT RUN** | Выполняются только после clean CI и публикации этого SHA из `main` |

### Подтверждённый production release — v247

Документальный контракт релиза: 30 продуктов, 10 live, 20 case, 60
локализованных case HTML и 61 sitemap URL; desktop first view — DentForma,
Klawis, TTYL Platform, BelfProctor, Softly и GrowthOps AI; mobile — все 30
карточек и category-фильтры. Builder/Scope Preview обязан выдавать composition,
relative complexity, stages, risks и next step без цены и обещания срока;
коммерческие условия обсуждаются индивидуально.

Wedding Invitations Uzbekistan занимает rank 7 и документируется как
`BUILD / sensitive / private case` с private source и platform foundation ниже
RC. Значения 55 governed tasks, 65 passed browser tests и 10 authored art
directions — локальные project-scoped claims с review `2026-08-27`, а не
portfolio gate, remote CI, production или provider-backed evidence.

| Gate | Статус | Доказательство |
|---|---|---|
| Generated/site contract | **GREEN (local candidate)** | `validate` → 30 products / 10 live / 20 case / 3 locales; `check:build` → 67 byte-identical generated artifacts; 60 localized case HTML и 61 sitemap URL |
| Security/dependencies/docs | **GREEN (local candidate)** | secret scan clean; `npm audit --audit-level=high` → 0 vulnerabilities; documentation contract → 17/17; `git diff --check` без whitespace error |
| Browser matrix | **GREEN (clean Linux CI)** | Workflow `33125562641` на SHA `b7b6a1f`: полный desktop/mobile/accessibility gate → 188 passed / 118 profile-specific skipped / 0 failed; изолированный performance gate → 2/2. До clean run устаревшее Firefox-ожидание `Показать ещё 23` было заменено вычислением `orderedProducts.length - 6`; targeted Firefox stress дополнительно прошёл 6/6 в трёх последовательных циклах |
| Navigation landing regression | **GREEN (local candidate)** | explicit pinned-section landing исправлен; targeted navigation/cinema suite в двух повторах → 18 passed / 2 profile-specific skipped / 0 failed |
| Performance budgets | **GREEN (local candidate)** | isolated desktop/mobile Chromium → 2/2 без изменения порогов |
| External live routes | **GREEN (local candidate)** | 10/10 approved HTTPS routes вернули usable HTML |
| Visual capture + human review | **GREEN (local candidate)** | `qa:visual` → 4/4; 26 main/menu + 40 full-page case captures + 4 contact sheet = 70 PNG. Четыре sheet просмотрены вручную; hero WebP отдельно подтверждены decode/element-paint. Physical devices не заявляются |
| v247 deploy и post-deploy smoke | **GREEN (production)** | GitHub Pages workflow `33126087905` на SHA `b7b6a1f`: build, deploy и verify-production завершились success. После публикации локальный production smoke → 3/3, независимый live-route check → 10/10 usable HTML. Production URL: `https://samandarmansurkhodjaev2713.github.io/CV-Samandar/` |

### Предыдущий подтверждённый release baseline — v246

| Gate | Статус | Доказательство |
|---|---|---|
| Generated site contract | **GREEN** | local candidate `v246`: `npm run validate` → `OK — 29 products, 10 live routes, 19 case routes, 3 locales`; 57 generated case pages, 58 sitemap URL и 29 responsive project-art sets (2026-08-27) |
| Full browser matrix | **GREEN** | clean Linux workflow `33017513257` на SHA `cef063f`: Chromium desktop/mobile, Firefox, WebKit и reduced motion → 175 passed / 121 profile-specific skipped / 0 failed / 0 flaky за 6.4 min; early-navigation hotfix локально дополнительно прошёл 20/20 без retry (2026-08-27) |
| iPhone WebKit critical path | **GREEN (cloud)** | WebKit project прошёл внутри clean Linux matrix `33017513257`. Локальный Windows launch по-прежнему блокируется до страницы кодом `0xC0E90002` политикой Verified and Reputable Apps; политика не ослаблялась, physical iPhone не заявляется (2026-08-27) |
| Isolated performance budgets | **GREEN** | local candidate и clean workflow: staged React mount; desktop/mobile 2/2 без изменения порогов, cloud 18.3 s (2026-08-27) |
| Mobile/catalog geometry stress | **GREEN** | 27 Hero locale/viewport states; 11 canonical viewport About matrix; all-29 mobile art decode/visibility; all-19 case viewport/deep-link/scroll-spy; desktop expanded-card collision test — 0 failed (2026-08-27) |
| Build determinism | **GREEN** | local candidate `v246`: `npm run check:build` → 64 generated artifacts byte-identical в двух последовательных сборках (2026-08-27) |
| Dependency/secret gates | **GREEN** | local candidate `v246`: `npm audit --audit-level=high` → 0 vulnerabilities; `npm run scan:secrets` → no credential signatures (2026-08-27) |
| External live routes | **GREEN** | workflow и независимый `npm run check:live` → 10/10 approved HTTPS live routes вернули usable HTML, включая Gorilla Five Signals и Echelon Pages (2026-08-27) |
| Deployed production smoke | **GREEN (v246)** | SHA `cef063f`, workflow `33017513257`: build 8m09s, Pages deploy 10s, verify-production 54s — success; независимый `npm run test:production` → 3/3 за 27.9s. Production HTML HTTP 200, 22 refs `v246`, 0 refs иных versions; 57 case routes, exact-card return и 10/10 live routes подтверждены (2026-08-27) |
| Post-deploy synthetic monitor | **GREEN (v246)** | независимый `npm run monitor:production`: desktop ready 4979 ms / LCP 1980 ms / CLS 0.0002 / frame p95 233.4 ms; mobile ready 3757 ms / LCP 988 ms / CLS 0.0000 / frame p95 66.6 ms; 0 budget violations. Это constrained-runner synthetic Chromium evidence, не field RUM и не physical-device proof (2026-08-27) |
| Visual capture + human review | **GREEN** | local candidate `v246`: `npm run qa:visual` → 4/4, затем case decode recapture → 2/2; runtime hotfix не меняет layout/visual assets. Заново созданы и вручную просмотрены 26 main captures, 38 full-page case captures и 4 contact sheets для desktop/mobile (2026-08-26) |
| Manual local browser review | **GREEN (local candidate only)** | Chromium screenshots/contact sheets проверены для Intro/Hero/Index/About/Projects/buttons и всех 19 case routes на desktop/mobile; отдельные DOM geometry sweeps покрыли 320×568, 390×844, 844×390, 920–1920 desktop и 200% text zoom. Это не production/physical-device proof (2026-08-26) |
| Manual production browser journey | **GREEN (v2.13.0 only)** | опубликованный `v232` ранее проверен вручную в Chromium; для `v2.13.2` отдельный physical/manual PASS не заявляется. Production Chromium smoke 3/3 и synthetic desktop/mobile monitor вынесены в отдельные строки |
| NVDA / VoiceOver / physical devices | **NOT RUN** | локальная headless-среда не может честно подтвердить эти проверки |

Production сейчас `v2.14.1 / v246`, SHA `cef063f`, workflow `33017513257`:
browser matrix без flaky, deploy/verify-production, независимый smoke 3/3 и
live check 10/10 зелёные. `v2.14.1 / v242` остаётся предыдущим подтверждённым
rollback baseline с synthetic monitor. Physical device и
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
| 6 | Site contract | `npm run validate` | 30 unique, 10 live, 20 case, 3 locale; все структурные/SEO/privacy/assets invariants выполнены |
| 7 | Browser matrix | `npm test` | validator + все обязательные Playwright projects без failed/flaky результата |
| 8 | Performance isolation | `npm run test:performance` при release rehearsal | оба Chromium performance tests зелёные в serial/worker=1 режиме |
| 9 | Visual capture | `npm run qa:visual` | все 12 main sections, fullscreen menu и 20 case pages сняты в desktop/mobile без capture error |
| 10 | Human/external sign-off | чек-лист раздела 8 | evidence записано по устройству/AT/browser; blocker отсутствует |
| 11 | Deployed production smoke | `npm run test:production` | production main раскрывает 30 карточек без first-party HTTP/runtime errors; все 60 case URL отдают нужную locale; case возвращает к точной карточке без intro |

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
| `accessibility.spec.js` | Axe WCAG 2.2 A/AA для main, всех 20 case и 404; keyboard reachability skip-link/nav/locale | Axe не заменяет screen reader и cognitive/manual review |
| `builder.spec.js` | native choices, composition/complexity/stages/risks/next-step readout, отсутствие цены и обещания срока, RU/EN/UZ handoff, mobile target geometry | deterministic UI contract преимущественно desktop Chromium |
| `builder-estimator.spec.js` | полный combinatorial decision domain, bounded/monotonic relative complexity, stages, risks, next step и отсутствие commercial/duration output | pure Node domain tests; не определяет цену или срок проекта |
| `catalog.spec.js` | 30 canonical cards, no duplicate routes, 10/20 split, утверждённый desktop top-6→30, mobile immediate 30 + category filters, locale parity, exact-card return | route/data contract из registry |
| `contact.spec.js` | отсутствие fake endpoint/success, exact Telegram brief, native validation, mobile reachability | не отправляет реальное сообщение и не доказывает доступность Telegram |
| `cv.spec.js` | APG tabs, facts/actions/locales, real local PDF bytes, narrow/landscape focus and clipping | binary/download проверены; печать и visual PDF требуют manual pass |
| `degraded.spec.js` | pre-React recovery, font fallback, artwork fallback, About без runtime API, optional Three.js failure | controlled fault injection; не моделирует все network/CDN faults |
| `design-system.spec.js` | type system, 12 chapters, menu modal/focus/inert, chapter order, mobile hero/dock, intro contract, shared runtime ownership | включает explicit viewport/language geometry contracts |
| `firefox-smoke.spec.js` | каталог, expand, language, case chapter/locale routing без page errors | smoke, не полный Firefox regression suite |
| `img-fx-lifecycle.spec.js` | one WebGL renderer/subscriber, latest-host race, tier park, context loss/restore, dispose, in-flight load safety | desktop Chromium; real GPU/driver diversity требует devices |
| `landings.spec.js` | 20 generated RU structures, mobile overflow sweep, new-case locale routing, chapter deep links, reload preservation | desktop complete sweep + shared mobile geometry sweep |
| `motion-lifecycle.spec.js` | shared subscribers, stable non-magnetic controls, verification-cursor state, near-viewport parallax, offscreen pause, dispose/re-init, no mobile cursor | engine-independent logic mainly в Chromium |
| `motion-policy.spec.js` | single tier source, subscription cleanup, reactive reduced motion, high/mid/low capability matrix, viewport class | policy contract, не field performance |
| `motion-runtime.spec.js` | strict frame phases, single input stream, subscriber cleanup, reduced scheduling stop | scheduler contract в desktop Chromium |
| `perf-policy-unit.spec.js` | high/low FPS sampling boundaries and sleep behavior | synthetic clock harness; не пользовательская метрика |
| `performance-budget.spec.js` | intro release, LCP/CLS, long tasks, event latency, scroll frames, transfer budgets, adaptive low-tier response | calibrated only for desktop/mobile Chromium; JSON metrics attached per run |
| `process.spec.js` | four-phase evidence ledger, no fake terminal telemetry, full RU/EN/UZ IA, compact layout | content/geometry contract |
| `production-smoke.spec.js` | opt-in deployed main, 60 localized case routes и exact-card return без intro | skipped без `PRODUCTION_SMOKE=1`; использует production base URL и не входит в обычный local `npm test` как выполненный smoke |
| `reduced-motion.spec.js` | reduced intro, no canvas, content visibility, native navigation, complete catalog contract | dedicated reduced-motion project |
| `responsive-matrix.spec.js` | 11 canonical viewports, no overflow, mobile carousel/desktop grid, unobscured focus, 200% text, orientation and breakpoint state | deterministic Chromium reflow matrix; physical browser chrome/safe-area остаются manual |
| `scene-cinema.spec.js` | latest-intent transaction, balanced events, auxiliary lifecycle rejection без `unhandledrejection`, hard timeout recovery, low-tier cut, reduced/back navigation | native View Transition behavior stubbed для deterministic contracts |
| `seo-routing.spec.js` | robots/sitemap/404, main locale URL, canonical/social/hreflang/JSON-LD, localized pre-JS HTML, CSP blocks arbitrary inline script/style | не проверяет crawler cache и external indexing |
| `sound-lifecycle.spec.js` | legacy sound preference не может вернуть скрытый audio runtime, класс или невидимый toggle | не тестирует звук, потому что звукового слоя в продукте нет |
| `stage5-sections.spec.js` | QA stack, Services tabs/accordion/related links/locales, FAQ/Quality truthfulness, phone typography | semantic and geometry contract |
| `visual-release.spec.js` | opt-in screenshots: 12 main sections + fullscreen menu + 20 case pages, desktop/mobile, contact sheets | skipped без `VISUAL_QA=1`; capture ≠ visual approval |
| `webkit-smoke.spec.js` | iPhone WebKit intro release, 30-card journey, menu/EN, localized case, return route | WebKit emulation smoke; physical iPhone остаётся external |

## 6. Structural validator coverage

`npm run validate` — отдельный blocking gate, не дубликат browser tests. Он
проверяет до запуска браузера:

- ровно 30 unique product ID/slug/name/rank/routes;
- split 10 `live` / 20 `case` и approved HTTPS live hosts;
- public GitHub CTA только при public repository alias;
- lifecycle, confidentiality, evidence level, privacy boundary и claims refs;
- 30 project card во всех RU/EN/UZ с одинаковым rank order и route;
- 20 landing definitions, 12 обязательных copy fields, `quick[3]`, flow ≥4;
- 60 generated HTML, self-canonical, full hreflang, localized JSON-LD,
  source/generated body identity и return-to-card link;
- 30 original 1536×512 WebP и responsive 1152×384/768×256 variants с
  зафиксированными byte limits;
- 19 семантически разных architecture diagram kinds;
- NFC, mojibake и mixed-script guards;
- единую motion policy/runtime ownership, script order и lazy Three.js;
- CSP hashes/directives, recovery shell, no-JS fallback и immutable workflow
  security requirements;
- robots, intentional 404 и sitemap из 61 URL.

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
| Frames over 40 ms | при baseline p95 ≤ 25 ms — ≤ 8%; на стабильном constrained runner scroll может превышать его собственный baseline не более чем на 8 п.п.; severe baseline или материальная scroll-регрессия требуют `low` |
| JavaScript transfer | ≤ 900,000 bytes |
| CSS transfer | ≤ 500,000 bytes |

Каждый run прикладывает `performance-metrics` JSON. Документ не хранит
измеренные LCP/FPS/transfer значения: они должны читаться из report конкретного
commit и среды.

## 8. Manual / external matrix

Эти проверки нельзя честно объявить выполненными локальным headless runner.
Пошаговый evidence-шаблон и обязательный journey находятся в
[physical mobile/AT protocol](PHYSICAL-AT-QA-PROTOCOL.md).

| Область | Обязательная среда | Что проверить | Evidence |
|---|---|---|---|
| NVDA | Windows + актуальный NVDA, Chrome и Firefox | landmarks/headings, skip link, menu dialog/inert/focus return, Services/CV tabs, mobile-style accordion с клавиатуры, form errors, route/language context | дата, версии, короткий протокол и blocker list |
| VoiceOver desktop | macOS + Safari + VoiceOver | rotor order, headings/links/buttons, modal focus trap, chapter navigation, case language switch, announcement clarity | дата, macOS/Safari/VO versions, протокол |
| VoiceOver mobile | physical iPhone + iOS Safari | swipe order, touch targets, menu, carousel discoverability, orientation, safe areas, case reading order | device/iOS, portrait+landscape notes, video/screenshots при дефекте |
| TalkBack | physical Android + Chrome | focus order, carousel, fixed dock, forms, locale controls, reduced animation preference | device/Android/Chrome, протокол |
| Physical visual QA | минимум iPhone и Android; desktop Chrome/Safari/Firefox | 12 main sections, fullscreen menu, 20 case pages, RU/EN/UZ long copy, 200% text, zoom, orientation, no clipping/overlap/flicker | approved contact sheets + issue log |
| Real performance | representative mid/high devices, normal and constrained network | intro, scroll stability, thermal behavior, background/foreground restore, adaptive tier | recorded device/network + trace; без invented aggregate |
| Live routes | внешняя сеть | все 10 live URL, HTTPS, redirects, no auth trap/404, expected project identity | timestamped route report |
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
4. validator output с 30 / 10 / 20 / 3, 60 case HTML и 61 sitemap URL;
5. catalog evidence: desktop top-6 в утверждённом порядке и mobile immediate
   30 + filters;
6. Scope Preview evidence: пять обязательных результатов без денег/срока и
   индивидуальные commercial terms;
7. Playwright report без failed/flaky;
8. отдельный performance JSON для desktop/mobile Chromium;
9. visual contact sheets и human approval;
10. manual/external matrix с явными `PASS`, `FAIL` или `NOT RUN`;
11. production smoke для root, 60 case URLs, 404, sitemap и 10 live routes;
12. список известных дефектов и release decision.

Релиз блокируется при любом failed automated gate, critical/high дефекте,
утечке private data/URL, route/locale drift, недоступной основной CTA или
непроверенном обязательном external sign-off.
