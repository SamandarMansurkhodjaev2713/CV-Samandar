# Implementation log

Этот журнал фиксирует не намерения, а уже проверенные контрольные точки
Awwwards-переработки. План и критерии готовности находятся в
`MASTER-IMPLEMENTATION-PLAN.md`; архитектурные контракты — в
`ARCHITECTURE.md`.

## Контрольная точка v210

- исходный commit: `6aa3665`;
- защищённый tag: `pre-awwwards-v210`;
- рабочая ветка: `codex/awwwards-rebuild`;
- количественный, Lighthouse- и browser-baseline:
  `BASELINE-v210.md`.

## Каталог и архитектурный фундамент

- GitHub-аудит: 39 доступных репозиториев;
- публичный каталог: 24 канонических продукта без дублей;
- 9 прямых live-маршрутов;
- 15 внутренних case-маршрутов;
- 24 изображения 1536×512 WebP, каждое не тяжелее 150 KB;
- единый `product-registry.js`, build-time validation и генерация визиток;
- RU / EN / UZ входят в обязательный build-контракт;
- CI не публикует артефакт до успешной валидации и браузерных тестов.

Контрольные commits:

- `adace5d` — канонический каталог и продуктовые страницы;
- `a8efe7d` — тестовый, CI- и recovery-контур.

## Дизайн-система и vertical slice

Проверенный срез: `Intro → Hero → Signal`.

Реализовано:

- тёмный материальный editorial-язык Builder + QA;
- signature-мотив `BUILD → VERIFY → SHIP`;
- семантические colour, spacing, type, elevation, motion и z-index tokens;
- локальные Oswald, Inter, JetBrains Mono и Cormorant Garamond с
  кириллицей и латиницей;
- интро с boot-log, Tashkent telemetry и core pulse;
- первый визит около 2–3 секунд, повторный короче, deep-link bypass;
- scroll lock на время интро с гарантированным освобождением;
- Hero заранее собирается под последним тактом интро;
- Builder + QA читается в первом экране на RU / EN / UZ;
- Signal не меняет раскрытие самостоятельно;
- полноэкранное меню гарантированно находится выше контента и принимает
  реальные pointer-события.

Автоматическая контрольная матрица после среза:

- registry: 24 продукта, 9 live, 15 case, 3 локали;
- 60 Playwright-сценариев: 41 успешно, 19 осознанно пропущены по
  нерелевантным проектам/движкам;
- desktop Chromium, mobile Chromium и критический путь iPhone WebKit;
- axe critical/serious, keyboard, reduced motion, degraded runtime,
  возврат к исходной карточке и отсутствие mobile overflow.

Визуальные сравнения находятся в `screenshots/audit-stage3/`. Эта папка
хранится как QA-доказательство и не входит в Pages deployment artifact.

## Motion-runtime checkpoint

Проверенная инженерная часть глобальной оболочки:

- один реактивный источник tier/reduced-motion/save-data/visibility;
- один общий scroll/pointer/viewport input stream;
- один фазовый планировщик `measure → compute → mutate → render`;
- authored cursor, magnetic controls, parallax и reveal без частных RAF;
- shader с ограниченным LRU-кэшем, context-loss recovery и полным dispose;
- interruptible latest-intent-wins переход с hard timeout 1800 ms;
- hidden tab, runtime dispose/re-init, responsive resize и tier change не
  оставляют скрытый контент или orphaned subscribers;
- source-validator блокирует возврат конкурирующих циклов и listeners.

Целевой lifecycle-набор: 32 сценария, 18 успешно, 14 осознанно пропущены на
нерелевантном viewport/engine.

Полный regression gate `v215`: 92 сценария, 59 успешно, 33 осознанно пропущены,
0 падений. Дважды выполненная сборка детерминирована; source/generated drift и
ошибки `git diff --check` отсутствуют.

Production-mode browser QA дополнительно подтвердил:

- desktop Hero, Signal и полноэкранное меню без overflow и console errors;
- mobile Hero и прокручиваемое меню на 390×844 без имитации cursor;
- TTYL case-page без mobile overflow и touch-target меньше 44 px;
- возврат `TTYL → #proj-ttyl` пропускает intro, раскрывает полный каталог и
  помещает исходную карточку в видимую область.

Следующий шаг: визуальная режиссура меню, section navigation и переходов поверх
уже проверенного runtime, затем последовательная переработка всех сцен.

## Intro and navigation checkpoint

Проверенная глобальная оболочка `v217`:

- frame-zero интро появляется из `head` до исполнения application bundle;
- прогресс зависит от готовности shell, локальных шрифтов и Hero-media;
- первый сеанс сохраняет режиссуру 2–3 секунды, повторный — тот же характер в
  более коротком ритме;
- deep link полностью обходит интро, reduced motion сохраняет композицию без
  canvas и длительного движения;
- hard timeout выводит либо уже собранный сайт, либо полезную recovery-сцену;
- поздно загрузившееся приложение безопасно заменяет recovery;
- scroll lock, `inert`, `aria-hidden` и `aria-busy` освобождаются ровно один
  раз на всех путях;
- полноэкранное меню стало настоящим modal dialog: внешний shell inert, фокус
  замкнут внутри, Escape возвращает его на trigger;
- переход из меню после закрытия фокусирует заголовок выбранной главы;
- skip link минует cinematic interception и переводит фокус в `main`;
- desktop navigation не обрезает ссылки на 920–1160 px, а переключается на
  компактный счётчик;
- один DOM-порядок из 12 глав питает menu, counter и mobile rail;
- mobile Hero на 320–430 px и 844×390 сохраняет две CTA, минимум 44 px,
  Proof Rail и видимый handoff в Signal без лишних свайпов;
- mobile dock появляется только после Signal и не закрывает его первые строки;
- safe-area и горизонтальный overflow проверены на портретных и landscape
  размерах.

Контрольная автоматическая матрица этапа:

- design shell desktop: 10/10 применимых проверок;
- design shell mobile: 8/8 применимых проверок;
- accessibility: 6/6, без critical/serious axe violations;
- reduced motion: 1/1;
- iPhone WebKit: 2/2, включая реальный first-load intro;
- полный единый gate `v217`: 113 сценариев, 71 успешно, 42 осознанно
  пропущены на нерелевантных viewport/engine, 0 падений;
- сборка: 24 продукта, 15 case routes, 3 локали;
- пользовательский `_otvety_extracted.txt` не изменялся и не входит в commit.

Полный контракт описан в `docs/INTRO-NAVIGATION.md`.

Следующий этап: двенадцать отдельных сцен главной и конфигуратор. Работа идёт
сверху вниз, но каждый блок принимается только после desktop/mobile,
keyboard/reduced-motion, visual и regression-проверок.

## Main, catalog and case-system checkpoint

После последовательных product/UX/visual проходов:

- все 12 сцен главной приведены к одной editorial-системе, но имеют разные
  композиции и enter-signature;
- Builder выдаёт проверяемый диапазон, границы и handoff, а не имитацию оферты;
- Stack связывает full-stack, AI и реальный QA-инструментарий;
- Services, Method, FAQ, Quality и Contact больше не повторяют каталог;
- CV имеет APG-tabs, корректные факты, канонический двухстраничный PDF и
  устойчивый keyboard focus в portrait/landscape;
- каталог содержит 24 уникальные карточки: 9 live и 15 case;
- 24 предметные WebP-обложки используют responsive sources и branded fallback;
- 15 приватных кейсов имеют индивидуальные hero, system diagram, evidence,
  QA и boundary, полностью сгенерированные в RU/EN/UZ;
- возврат из кейса раскрывает каталог, фокусирует точную карточку и не
  проигрывает intro повторно.

Контрольные commits этапа: 59e18ed, a74b89d, a631172, a77eeee.

## Release hardening checkpoint

Локально подтверждено до финального asset bump:

- desktop Chromium: 112 passed, 5 project-specific skipped, 0 failed;
- mobile Chromium: 30 passed, 87 project-specific skipped, 0 failed;
- iPhone WebKit: 2/2; desktop Firefox: 2/2; reduced motion: 1/1;
- performance budget: desktop и mobile 2/2;
- SceneCinema stress: 40/40 повторов;
- responsive orientation/text-zoom stress: 10/10;
- CV focus/landscape stress: 20/20;
- WCAG axe для главной, 15 кейсов и 404 — без A/AA violations в
  автоматизированном наборе;
- secret scan — чисто; dependency audit — 0 vulnerabilities;
- 9/9 внешних live URL вернули пригодный HTML;
- schema validation: 24 продукта, 9 live, 15 case, 3 локали;
- две последовательные сборки дают 51 байтово идентичный generated artifact.

Исправленные предрелизные дефекты:

- WebKit больше не повышает локальные HTTP-ресурсы до HTTPS через избыточный
  upgrade-insecure-requests;
- short-landscape dock не перекрывает CV и project focus;
- CV и project gallery возвращают focused control в безопасную viewport-зону;
- SceneCinema timeout и performance-cut проверяются как независимые контракты;
- build пропускает byte-identical записи и повторяет кратковременно
  заблокированную Windows-запись;
- production-smoke отделяет first-party failure от честного GitHub API
  rate-limit fallback.

## Visual release QA

В ignored tmp/release-qa сформированы и просмотрены:

- 12 сцен главной × desktop/mobile — 24 viewport capture;
- 15 case pages × desktop/mobile — 30 full-page capture;
- 4 contact sheet.

Full-page case capture выполняет реальный scroll-sweep перед снимком. Это
устранило ложные пустые главы, которые появляются, если compositor screenshot
не активирует IntersectionObserver. Повторная ревизия revealed-v2 подтверждает
полный ритм от hero до final CTA; точечно просмотрены GrowthOps AI, TTYL и ChAT,
включая мобильную TTYL.

Реальные NVDA/VoiceOver и physical Safari/iOS/Chrome/Android не заявляются как
выполненные: они остаются внешним ручным release-gate и явно отражаются в
QA-матрице.

## Production contract

Добавлен отдельный post-deploy gate:

- production main монтирует 24 карточки без first-party/runtime errors;
- все 45 RU/EN/UZ case URL возвращают локализованный статический shell;
- case → exact card сохраняет hash и пропускает intro;
- 9 внешних live URL проверяются после Pages deploy.

Сам production deploy и его smoke пока не заявлены: следующий шаг — финальный
asset bump, полный повтор обязательной матрицы, release commit, push в main,
GitHub Actions и проверка фактически развернутого URL.

## Final local release candidate — v229

Дата локальной приёмки: 2026-08-10.

После финального asset bump и повторного полного аудита подтверждено:

- `npm test`: 147 passed, 106 осознанно skipped по нерелевантным
  browser-project/opt-in сценариям, 0 failed и 0 flaky за 7.1 минуты;
- `npm run test:performance`: desktop Chromium 1/1 и mobile Chromium 1/1;
- отдельный iPhone WebKit critical path: 2/2;
- `npm run check:build`: 51 generated artifact байтово идентичны в двух
  последовательных сборках;
- `npm run validate`: 24 продукта, 9 live, 15 case, 3 локали;
- `npm audit --audit-level=high`: 0 vulnerabilities;
- `npm run scan:secrets`: credential signatures не найдены;
- `npm run check:live`: 9/9 внешних live URL вернули usable HTML;
- `git diff --check`: whitespace errors отсутствуют;
- свежий `npm run qa:visual`: 4/4 capture packages, 54 кадра и 4 contact
  sheet; вручную просмотрены все contact sheet и full-page TTYL/ChAT на
  desktop/mobile.

Редкие lifecycle-гонки были не скрыты retry, а воспроизведены и закрыты:

- intro и mobile deep-link выдержали 20 применимых повторов под четырьмя
  параллельными workers;
- offscreen motion pause/resume выдержал 20/20 повторов;
- Contact mobile geometry, landing locale switch, reduced-motion history и
  mobile dock выдержали 40/40 применимых повторов;
- первый deep-link теперь удерживает viewport по фактической геометрии и
  отдаёт его пользовательскому жесту или более новой SceneCinema-транзакции;
- видимость анимационных зон имеет IntersectionObserver primary path и
  детерминированный shared-scroll fallback;
- RU/EN/UZ на case-страницах являются настоящими ссылками и работают до
  подключения JavaScript; enhancement сохраняет текущую главу.

Ограничения зафиксированы честно: physical iPhone/Android, Safari на реальном
устройстве, NVDA/VoiceOver/TalkBack и smoke нового production commit ещё не
выполнены. Следующий шаг — release commit, quality workflow, deploy в `main`,
обязательный verify-production и тег только на фактически развёрнутом SHA.

## Production release evidence — v229

Дата публикации: 2026-08-10.

Release sequence:

- `6500a7f` — основной Awwwards release commit;
- первый CI `31335961279` безопасно остановил публикацию из-за Windows/LF CSP
  drift;
- `1de0bd5` нормализовал generated output и CSP hashing в LF; чистый
  Linux/Node 20 checkout подтвердил две byte-identical сборки;
- второй CI `31336340469` прошёл весь build/test/performance gate, но GitHub
  runner отклонил сокращённый SHA официального `actions/deploy-pages` до
  выполнения deploy;
- `155c73c` закрепил полный 40-символьный immutable SHA action;
- GitHub Actions run `31336811572` завершил `build`, `deploy` и
  `verify-production` со статусом success.

Фактический production подтверждён двумя независимыми контурами:

- встроенный `verify-production`: все 45 case URL, главная, точный возврат к
  TTYL и 9 внешних live URL — PASS;
- локальный `npm run test:production`: 3/3 PASS;
- локальный `npm run check:live`: 9/9 PASS;
- hard fetch с cache-busting query: HTTP 200, asset version `v229`, актуальный
  product-registry link и ожидаемый CSP hash.

Добавлен пострелизный контроль без клиентского трекинга:

- `npm run monitor:production` измеряет production desktop/mobile Chromium и
  сохраняет JSON с LCP, CLS, long tasks, frame pacing, transfers и ошибками;
- первый калиброванный прогон: desktop ready 4035 ms, LCP 1196 ms, CLS 0.0223;
  mobile ready 3557 ms, LCP 900 ms, CLS 0.0030 — оба PASS;
- `.github/workflows/production-monitor.yml` повторяет smoke, synthetic vitals
  и 9 live URL каждые шесть часов; evidence хранится 14 дней;
- `docs/AWWWARDS-SUBMISSION.md` фиксирует concept, truthful credits,
  technology story, key scenes, submission copy и media shot list.

Synthetic monitor не заявляется как field RUM. Physical iPhone/Android,
реальные Safari/Chrome mobile и NVDA/VoiceOver/TalkBack по-прежнему требуют
внешнего ручного sign-off; до него этап 14 не отмечается полностью завершённым.

## Final WebKit recovery hardening

Финальный повтор полной матрицы не был принят с единичным падением. Trace
показал точную последовательность на перегруженном WebKit runner:

1. intro hard deadline наступал непосредственно перед React commit;
2. recovery честно разблокировал документ и показал fallback;
3. готовая оболочка монтировалась позже и запускала promotion;
4. дополнительный fade-таймер promotion голодал на том же main thread;
5. панель уже имела opacity 0, но оставалась в DOM, а `#root` — в `inert`.

Исправлен продуктовый контракт, а не test timeout: после появления настоящего
shell recovery-панель удаляется синхронно, accessibility tree и input
восстанавливаются в той же операции. Добавлен детерминированный regression с
искусственно задержанным `app.js`.

Доказательство после исправления:

- runtime cache version повышена `v229 → v230`, чтобы опубликованный браузер не
  мог сохранить старый `app.js` под прежним URL;
- late-shell regression — 1/1;
- WebKit first-load intro stress — 10/10 под двумя workers;
- полный `npm test` — 148 passed, 107 осознанно skipped, 0 failed, 0 flaky за
  7.7 минуты;
- изолированные performance budgets — desktop/mobile 2/2;
- deterministic build — 51/51 byte-identical;
- docs contract — 16/16 обязательных документов;
- validate — 24 продукта, 9 live, 15 case, RU / EN / UZ;
- audit/secret scan/diff check — зелёные.

Все перечисленные full-matrix, performance и deterministic-build результаты
повторены после bump и относятся к финальному `v230` candidate.

Первый ручной запуск production-monitor `31339495796` прошёл полностью и
сохранил JSON artifact. Его единственная annotation указывала на deprecated
Node 20 runtime старых official actions. По официальным GitHub release refs
все workflows переведены на verified immutable commits: checkout `v7.0.1`,
setup-node `v7.0.0`, upload-artifact `v7.0.1`, configure-pages `v6.0.0`,
upload-pages-artifact и deploy-pages `v5.0.0`. `node-version: 20` для сборки
сайта не менялся; Node 24 используется только внутренним action runtime.

## Final release proof — v2.12.0

Release tag `v2.12.0` указывает на фактически опубликованный commit
`4f6af33b39791e6053b9eb47e2b278826e59bbef`.

Финальный deploy workflow `31339942716`:

- build — success: locked install, audit, secret scan, deterministic build,
  docs, 148-test matrix и performance budgets;
- deploy — success на обновлённых configure/upload/deploy Pages actions;
- verify-production — success: 45 localized case URL, main/catalog/return flow
  и 9 внешних live URL;
- build/deploy/verify-production check-runs — 0 annotations.

Независимо после deploy подтверждено:

- production HTML → HTTP 200, содержит `v230`, не содержит `v229` asset refs;
- `npm run test:production` → 3/3 PASS;
- `npm run check:live` → 9/9 PASS;
- scheduled monitor `31350135801` → PASS;
- manual monitor `31364392491` → PASS, 0 annotations, JSON artifact загружен
  и прочитан локально;
- последний artifact относится к SHA `4f6af33`: desktop ready 3054 ms,
  LCP 312 ms, CLS 0.0013; mobile ready 2972 ms, LCP 164 ms, CLS 0.0066;
  оба профиля имеют 0 first-party failures и 0 budget violations.

Метрики monitor являются synthetic Chromium evidence, а не полевым RUM.
Технический релиз, rollback point и Awwwards submission package готовы.
Незакрытый внешний gate не скрыт: physical iPhone/Android и фактические
NVDA/VoiceOver/TalkBack требуют отдельного ручного sign-off.

## Manual production audit and View Transition hotfix — v231

После выпуска `v2.12.0` production дополнительно пройден вручную в обычном
in-app Chromium, а не только headless runner. Проверены desktop 1280×720,
калиброванный CSS portrait 390×844 и обязательный landscape 844×390:

- intro удерживает scroll/input и освобождает shell; deep link intro не
  повторяет;
- полноэкранное menu имеет dialog semantics, focus на close control и 12 глав;
- каталог содержит 24 canonical cards, mobile rail использует mandatory snap,
  next-control меняет активный проект, раскрытие показывает 24/24;
- TTYL и BelfProctor открываются как case, RU/EN/UZ меняют полный контент, а
  возврат восстанавливает точную карточку; для скрытой BelfProctor каталог
  раскрывается автоматически;
- Builder пересчитывает сложный AI/production scope и переносит точный срок,
  бюджет, drivers и disclaimer в contact brief;
- CV tabs/download, контактная локальная валидация и пользовательская 404
  доступны; внешнее сообщение не отправлялось.

Единственный browser-console сигнал был
`AbortError: Transition was skipped` после штатно прерванного native View
Transition. Пользовательский путь не ломался, но auxiliary `ready` promise
оставался ненаблюдаемым. В `scene-cinema.js` lifecycle promises `ready` и
`updateCallbackDone` теперь явно наблюдаются, тогда как `finished` остаётся
единственным владельцем recovery/final-pose semantics. Regression искусственно
отклоняет `ready` при superseded intent и требует ноль `unhandledrejection`.

Локальное доказательство `v231` candidate после исправления:

- targeted scene-cinema — 4/4 serial; отдельная rejection regression — 1/1;
- `npm test` — 148 passed, 107 осознанно skipped, 0 failed, 0 flaky за 10.0
  минуты;
- performance budgets — desktop/mobile 2/2;
- visual release capture — 4/4; повторно просмотрены четыре contact sheet для
  12 main scenes и 15 case на desktop/mobile;
- deterministic build — 51/51 byte-identical;
- validate — 24 продукта, 9 live, 15 case, 3 локали;
- audit — 0 vulnerabilities; secret scan и `git diff --check` — зелёные;
- package version — `2.12.1`, asset graph — `v231`.

Release `v2.12.1` опубликован на SHA
`eb3e405b48916510fae6f9590c09f578cd85d9df` с asset graph `v231`.

Deploy workflow `31368347969`:

- build `93391551089` — success за 8m27s;
- deploy `93393420491` — success за 21s;
- verify-production `93393540602` — success за 58s;
- у всех трёх check-runs — 0 annotations.

Независимо после deploy:

- production HTML → HTTP 200, содержит `v231`, не содержит `v230` refs;
- `npm run test:production` → 3/3 PASS;
- `npm run check:live` → 9/9 PASS;
- новый браузерный tab загрузил `scene-cinema.js?v=231`; после реальной
  section-навигации console errors/warnings → 0;
- scheduled monitor `31368418978` и manual monitor `31369244468` на
  `eb3e405` → PASS;
- manual job `93394302886` → 0 annotations; JSON artifact подтверждает:
  desktop ready 3337 ms, LCP 660 ms, CLS 0.0016; mobile ready 3010 ms, LCP
  216 ms, CLS 0.0058; 0 first-party failures и 0 budget violations.

Метрики остаются synthetic Chromium evidence, а не field RUM или physical
device proof. 24–48-часовое наблюдение и внешний NVDA/VoiceOver/TalkBack +
physical iPhone/Android sign-off продолжаются и не объявлены завершёнными.

## Awwwards art-direction и 25-product candidate — v232

Новая итерация не ограничилась декоративным слоем. Каталог повторно
канонизирован по GitHub и продуктовым маршрутам: 25 уникальных продуктов,
9 внешних live-сайтов и 16 безопасных case-маршрутов. Birthday Agent добавлен
как отдельный приватный продукт без раскрытия закрытых данных; его RU/EN/UZ
контент, схема, QA/boundary-блок и предметная обложка входят в тот же generated
контракт, что остальные кейсы. Сборка теперь выпускает 48 case pages и 49 URL
в sitemap.

Главная получила цельную физическую арт-систему Proof Instrument. Hero строится
вокруг реального предметного объекта, а не декоративного HUD; Intro использует
ту же оптическую грамматику, меню стало самостоятельной полноэкранной сценой,
курсор и кнопки получили контекстные состояния. Каждая из двенадцати глав имеет
собственный материал, композицию и вход, но нативный scroll и единый motion
runtime сохранены. Светлые CV/Quality-сцены используют локальные контрастные
ink-токены, а проектный раздел разделяет четыре editorial featured-записи и
двухколоночный архив без дублей.

Mobile Hero исправлен как три самостоятельных режима: portrait, short portrait
и compact landscape. Геометрический контракт проверяет RU/EN/UZ на 320×568,
360×800, 390×844, 430×932, 568×320, 844×390, 920×720, 1024×768 и
1440×1000. Во всех состояниях имя, два CTA и proof-rail остаются внутри первой
сцены, touch targets не меньше 44 px, а Signal даёт понятный следующий cue.
Нахлёст Signal уменьшен до фиксированного шва, чтобы не скрывать Build → Verify
→ Ship.

Cross-document View Transition удалён из основного сайта и кейсов после
воспроизводимого `Transition was skipped / AbortError`. Его заменяет
детерминированная прерываемая exit-aperture с восстановлением после bfcache и
instant-path для reduced motion. Возврат из кейса по-прежнему раскрывает архив
при необходимости, пропускает Intro и центрирует точную исходную карточку.

Локальная приёмка до финального asset bump:

- desktop product layer — 37 passed / 4 profile-skipped;
- mobile product layer — 15 passed / 26 profile-skipped;
- desktop contracts — 56 passed / 1 profile-skipped;
- mobile contracts — 9 passed / 48 profile-skipped;
- engineering/runtime batch — 22 passed;
- Firefox — 2/2, iPhone WebKit — 2/2, reduced motion — 1/1;
- performance budgets — desktop/mobile 2/2;
- visual capture — 4/4: 12 main scenes и 16 case pages на desktop/mobile;
- contact sheets и увеличенные Hero/Projects captures просмотрены вручную;
- deterministic build — 54/54 byte-identical;
- validate — 25 products / 9 live / 16 case / 3 locales;
- external live routes — 9/9; audit — 0 vulnerabilities; secret scan — clean.

Автоматизированные axe-проверки не нашли WCAG 2.2 A/AA нарушений на главной,
16 кейсах и 404. Это не подменяет реальный NVDA/VoiceOver/TalkBack и physical
iPhone/Android sign-off: они остаются внешним NOT RUN до фактического запуска.
Package candidate повышен до `2.13.0`, единый cache graph — `v232`.

Первый единый post-bump `npm test` не был принят как release proof: при двух
workers он воспроизвёл две гонки, которые не проявились в изолированных runs.
Mobile deep-link кратковременно входил в допустимую геометрию, но тест не ждал
опубликованного `data-deep-link-settled`; дополнительный сдвиг capsule оставлял
заголовок на 57 px. Safe offset увеличен до 24 px, а regression теперь
проверяет завершённую позу. Результат stress-повтора — 10/10 под двумя workers.

Вторая гонка находилась в case exit-aperture: WebKit мог сохранить 440 ms
language-navigation timer и перебить следующий browser navigation. Timer
получил единственного владельца, очищается на `beforeunload` и `pagehide`, а
smoke ждёт фактический локализованный URL, а не одинаковое во всех языках имя
продукта. Конкурентный stress-повтор critical journey — 10/10.

Финальное доказательство текущего `2.13.0 / v232` workspace после обоих fixes:

- `npm test` — 259 scenarios, 150 passed, 109 осознанно profile-skipped,
  0 failed и 0 flaky за 8.8 минуты;
- `npm run test:performance` — desktop/mobile 2/2;
- visual release — 4/4; свежие 12 main scenes и 16 case pages на
  desktop/mobile, четыре contact sheet повторно просмотрены;
- `npm run check:build` — 54/54 byte-identical;
- validate/docs — 25/9/16/3 и 16/16;
- audit — 0 vulnerabilities; secret scan — clean; live routes — 9/9;
- `git diff --check` — exit 0.

Production smoke и synthetic monitor для `v2.13.0` ещё не могут быть зелёными:
кандидат не развёрнут. Они выполняются только после commit/push/deploy того же
SHA. Physical device и screen-reader sign-off остаются честным внешним NOT RUN.
