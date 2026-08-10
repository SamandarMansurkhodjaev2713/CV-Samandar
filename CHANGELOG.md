# Changelog

Все значимые изменения проекта фиксируются в этом файле. Формат основан на Keep a Changelog; раздел `Unreleased` описывает текущую ветку и не является утверждением о production deployment.

## [Unreleased]

Новых изменений после подготовки релиза пока нет.

## [2.12.1] - 2026-08-10

### Fixed

- Прерывание нативного View Transition больше не оставляет ожидаемый
  `AbortError: Transition was skipped` как необработанное отклонение в консоли:
  scene-cinema наблюдает вспомогательные lifecycle promises, а финальную
  читаемую позу по-прежнему гарантирует основной `finished`-контракт.

### Quality

- Добавлена детерминированная регрессия, которая отклоняет `ready` при
  superseded-навигации и требует ноль `unhandledrejection` при сохранении
  latest-intent semantics и парности cinema events.
- Asset graph повышен `v230 → v231`; 51 generated artifact дважды собран
  байт-в-байт одинаково.
- Локальный release-gate: `npm test` — 148 passed / 107 осознанно skipped / 0
  failed, performance — 2/2, visual capture — 4/4, validate — 24/9/15/3,
  audit — 0 vulnerabilities, secret scan и diff check — зелёные.

## [2.12.0] - 2026-08-10

### Added

- Канонический реестр из 24 продуктов с отдельными полями для lifecycle, confidentiality, presentation, evidence, маршрутов, repository aliases, privacy boundary и RU/EN/UZ идентичности.
- Три новых безопасно раскрытых case-проекта: Vacation Control Agent, B24 Sales Analyst и Chat App.
- 15 полноценных in-site case-страниц в трёх языковых версиях — 45 статических маршрутов с canonical/hreflang, Open Graph, Twitter Card и JSON-LD metadata.
- Индивидуальная editorial still-life обложка и responsive-варианты для каждого из 24 продуктов.
- Адаптивный bootstrap, watchdog и lazy-loading тяжёлых визуальных движков с читаемым degraded state.
- Централизованные performance/motion contracts, lifecycle-проверки для WebGL, image effects, sound и scene transitions.
- Автоматические проверки accessibility, responsive/orientation, SEO/CSP, deep links, 404 recovery, Firefox/WebKit smoke, reduced motion, performance budgets и visual release capture.
- Статические discovery-артефакты `404.html`, `robots.txt` и `sitemap.xml`, генерируемый sitemap содержит главную и все локализованные case-маршруты.
- Secret scan, live-route verifier, asset-version helper и отдельный visual QA runner.
- Scheduled production monitor с desktop/mobile synthetic vitals, функциональным smoke, проверкой live-маршрутов и сохраняемым JSON evidence.

### Changed

- Главная переработана как последовательность самостоятельных интерактивных сцен с общей дизайн-системой, доказательной продуктовой подачей и responsive-композицией.
- Каталог расширен до 24 уникальных карточек: четыре сильнейших проекта остаются первым актом, полный список раскрывается в том же разделе без дублей.
- Live-проекты открывают внешний продукт, а GitHub при наличии остаётся отдельным доказательным маршрутом; закрытые и чувствительные продукты ведут на безопасный case.
- Все case-страницы приведены к одной системе TTYL/BelfProctor, сохраняя уникальные hero, архитектурную схему, аргументацию, QA и boundary-блок каждого продукта.
- Intro, меню, межсекционная навигация, project return flow, mobile gallery, builder, CV, stack, services, FAQ, process, trust и contact получили новые desktop/mobile состояния и focus-safe поведение.
- Motion runtime теперь координирует уровень качества, visibility, offscreen pause, reduced motion и восстановление финального читаемого состояния вместо независимых эффектов.
- JSX компилируется ahead of time; build одновременно обновляет CSP, генерирует локализованные кейсы и sitemap и валидирует source/generated contracts.
- GitHub Actions используют locked dependencies, immutable action revisions, минимальные permissions и проверяют отсутствие незакоммиченного generated diff.
- Official GitHub actions обновлены до Node 24-compatible major-релизов и закреплены полными verified commit SHA; проектовый runtime остаётся на Node.js 20.

### Fixed

- Возврат с case-страницы восстанавливает конкретную карточку проекта и раскрывает скрытую часть каталога при необходимости.
- Устранены гонки и зависшие состояния при повторной навигации, timeout, performance cut, WebGL context loss, visibility change и повторном mount/unmount.
- Recovery-интро больше не оставляет невидимую блокирующую панель, если WebKit монтирует готовую React-оболочку сразу после hard deadline: shell повышается синхронно и возвращает accessibility tree/input без дополнительного таймера.
- Исправлены перекрытия focused controls мобильным dock, включая CV, горизонтальную project gallery, text zoom и короткую landscape-ориентацию.
- Исправлена несовместимость локального HTTP с WebKit, вызванная `upgrade-insecure-requests` в meta CSP; production-ресурсы при этом остаются same-origin и HTTPS на Pages.
- Устранены ложные section indicators, повторная intro-загрузка при deep link и некорректные переходы карточек без публичного live URL.
- Generated build нормализован в LF и проверяется в чистом Linux/Node 20 checkout; GitHub Pages action закреплён полным immutable SHA.

### Security

- CSP разделяет script/style/frame/form/object policies и разрешает только необходимые same-origin ресурсы, data/blob изображения и GitHub Events API.
- Inline data-блоки получают build-time SHA-256 hashes.
- Публичные кейсы содержат явные privacy boundaries и не раскрывают client data, credentials или неподтверждённые private-source детали.
- CI проверяет dependency graph на high-severity уязвимости и кандидатов на коммит — на секреты.

### Documentation

- README превращён в актуальную точку входа с установкой Node 20+, командами build/validate/test/performance/visual QA, source-of-truth картой, правилами разработки и Pages pipeline.
- Добавлены ADR для статически генерируемой архитектуры, общей motion policy и канонического product registry.

### Release status

- Release `v2.12.0` опубликован на commit `4f6af33` с cache graph `v230`. GitHub Actions `31339942716` завершил build, deploy и `verify-production` без annotations; независимый post-deploy smoke — 3/3, live routes — 9/9. Scheduled и manual production monitors (`31350135801`, `31364392491`) на том же SHA зелёные и сохранили JSON evidence.
