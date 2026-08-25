# Samandar — Executive AI Code Lab

Интерактивное трёхъязычное портфолио Product Engineer / AI Automation / QA. Это статический продуктовый сайт с кинематографичной навигацией, адаптивной motion-системой и отдельными доказательными страницами проектов — без runtime-бэкенда и клиентской JSX-компиляции.

Текущий каталог содержит **29 канонических продуктов**:

- **10 live-проектов** ведут на доступные внешние сайты;
- **19 case-проектов** раскрываются на безопасных страницах внутри портфолио;
- главная и все case-страницы поддерживают **RU / EN / UZ**;
- 19 кейсов × 3 языка генерируются как **57 самостоятельных HTML-страниц**.

> Runtime `v2.14.1 / v237` опубликован на GitHub Pages из merge SHA `adc3e861`.
> Pages workflow `32084173961` завершил build/deploy/verify-production;
> независимый production smoke 3/3, live routes 9/9 и cache graph
> 30 refs `v237` / 0 refs `v236` подтверждены. Physical-device/AT остаются
> отдельными незавершёнными доказательствами.

## Технологии

- Vanilla HTML, CSS и JavaScript;
- React 18 production build, хранящийся в `vendor/`;
- ahead-of-time JSX → JavaScript через локальный `build.js`;
- Three.js для прогрессивных визуальных эффектов;
- Playwright и axe-core для browser-, accessibility- и regression-проверок;
- GitHub Actions и GitHub Pages для проверяемой статической публикации.

## Требования и установка

Нужен **Node.js 20 или новее**. Зависимости устанавливаются строго по lock-файлу:

```bash
node --version
npm ci
npx playwright install
```

Для локального просмотра после сборки:

```bash
npm run build
node scripts/static-server.js 4173
```

Сайт будет доступен по адресу `http://127.0.0.1:4173/`. Playwright запускает этот сервер автоматически, поэтому для тестов отдельный процесс не нужен.

## Основные команды

| Команда | Назначение |
|---|---|
| `npm run build` | Проверяет source-контракт, компилирует JSX, обновляет CSP, генерирует 57 case-страниц и sitemap, затем валидирует результат. |
| `npm run check:build` | Дважды выполняет сборку и требует байтовой идентичности 64 generated artifacts. |
| `npm run validate` | Проверяет уже сгенерированный сайт: 29 продуктов, маршруты, локали, тексты, изображения, discovery-артефакты и runtime-контракты. |
| `npm run check:docs` | Проверяет обязательные документы, локальные ссылки, package scripts и количественные контракты. |
| `npm test` | Запускает валидацию и полную Playwright-матрицу: Chromium desktop/mobile, WebKit mobile smoke, Firefox desktop smoke и reduced-motion. |
| `npm run test:performance` | Отдельно проверяет desktop/mobile performance-бюджеты в Chromium одним worker. |
| `npm run qa:visual` | Снимает главные сцены и все 19 кейсов на desktop/mobile, затем собирает контактные листы в `tmp/release-qa/`. |
| `npm run qa:submission` | Снимает с production 8 submission stills, 60–90-секундный desktop review-video, manifest и contact sheet в `tmp/submission-media/`. |
| `npm run test:a11y` | Запускает accessibility-набор с axe и keyboard/focus-проверками. |
| `npm run scan:secrets` | Проверяет кандидатов на коммит на признаки секретов и приватных данных. |
| `npm run check:live` | С сетевыми retry проверяет, что 10 live-маршрутов возвращают пригодный HTML. |
| `npm run test:production` | После deploy проверяет production-главную, 57 case URL и возврат к точной карточке. |
| `npm run monitor:production` | Измеряет реальный Pages URL в desktop/mobile Chromium и сохраняет синтетический production-отчёт без пользовательского трекинга. |
| `npm run bump:assets` | Перед релизной сборкой атомарно повышает единую версию cache-busting ссылок. |

Минимальный локальный quality gate:

```bash
npm run scan:secrets
npm audit --audit-level=high
npm run check:build
npm run validate
npm run check:docs
npm test
npm run test:performance
npm run check:live
npm run qa:visual
```

`qa:visual` создаёт доказательные скриншоты, но не заменяет их ручной просмотр.

## Архитектура и source of truth

| Область | Канонический источник | Производный результат |
|---|---|---|
| Идентичность продукта, порядок, live/case-маршрут, evidence/confidentiality, изображение | `src/content/product-registry.js` | Порядок карточек, URL, sitemap и contract validation |
| Тексты главной и карточек на RU / EN / UZ | `src/content/content.js` | Данные, которые получает React-приложение |
| Полный контент 19 case-страниц | `src/projects/landings-data.js` | Локализованные страницы в `projects/<slug>/` |
| Разметка case-страниц | `src/projects/render.js` | Одинаковый SSR-like HTML на build-time и client-side при смене языка |
| UI-компоненты | `src/components/*.jsx` | `src/components/*.js`, сгенерированные `build.js` |
| Дизайн и runtime-эффекты | `src/styles/`, `src/projects/landing.css`, `src/engine/` | Progressive motion/WebGL с читаемым fallback |
| Сборка и генерация | `build.js` | CSP, compiled JS, 57 HTML-страниц и `sitemap.xml` |

Ключевой поток данных:

```text
product-registry + content + landing data + JSX
                       ↓
                    build.js
                       ↓
compiled components + 57 case pages + CSP + sitemap
                       ↓
               validate + Playwright
```

## Правила внесения изменений

1. **Не редактировать производные файлы вручную.** Изменения компонентов вносятся в `.jsx`, а `src/components/*.js` пересобираются. Страницы `projects/<slug>/index.html`, `en/index.html` и `uz/index.html` генерируются из landing data и renderer.
2. **Новый или изменённый продукт начинается с реестра.** Затем синхронизируются карточки главной и, для `presentation: "case"`, полный RU/EN/UZ контент кейса.
3. **Не смешивать зрелость и приватность.** `lifecycle`, `confidentiality`, `presentation` и `evidenceLevel` имеют разные значения; закрытый source не является доказательством production-ready состояния.
4. **Сохранять паритет локалей.** Структура RU, EN и UZ должна совпадать; валидатор намеренно останавливает сборку при расхождении.
5. **Не публиковать закрытые сведения.** Секреты, клиентские данные и внутренние детали не переносятся в fixtures, тексты кейсов, логи или изображения.
6. **После изменения source запускать `npm run check:build`.** Сгенерированные изменения коммитятся вместе с source; команда и CI проверяют байтовую детерминированность и отсутствие drift.
7. **Cache version повышается один раз перед релизным кандидатом.** После `npm run bump:assets` обязательно снова выполнить build и полный quality gate.

Подробные инженерные контракты находятся в `docs/DESIGN-SYSTEM.md`, `docs/ARCHITECTURE.md`, `docs/MOTION-PERFORMANCE.md`, `docs/PRODUCTION-MONITORING.md` и ADR в `docs/adr/`. Материалы для подачи собраны в `docs/AWWWARDS-SUBMISSION.md`, а честная ручная приёмка физических устройств и assistive technology выполняется по `docs/PHYSICAL-AT-QA-PROTOCOL.md`.

## Тестовая матрица

Playwright покрывает:

- критический путь главной, intro, навигацию, каталог, builder, CV, FAQ и contact;
- все 19 case-маршрутов и переключение RU / EN / UZ;
- клавиатуру, focus visibility, семантику, axe и reduced motion;
- desktop/mobile responsive-состояния и смену ориентации;
- Chromium, Firefox smoke и WebKit smoke;
- motion/performance policy, WebGL/image lifecycle, sound lifecycle и degraded-state recovery;
- SEO, CSP, 404/deep-link routing, generated discovery files и performance-бюджеты.

Визуальный release review выполняется отдельно через `npm run qa:visual`, чтобы автоматические проверки не подменяли дизайнерское решение.

## GitHub Pages

- `.github/workflows/quality.yml` запускается для pull request и вручную: locked install, dependency audit, secret scan, deterministic build, документационные контракты, generated drift и полный test suite.
- `.github/workflows/deploy-pages.yml` настроен на push в `main` и ручной запуск. Он повторяет quality gate, формирует минимальный статический `_site`, публикует Pages, а затем отдельным job запускает production smoke и проверку 10 live URL.
- `.github/workflows/production-monitor.yml` каждые шесть часов и вручную повторяет production smoke, снимает синтетические desktop/mobile vitals и сохраняет JSON evidence на 14 дней.
- Deploy job получает только `pages: write` и `id-token: write`; build job работает с `contents: read`.

Целевой Pages URL: `https://samandarmansurkhodjaev2713.github.io/CV-Samandar/`. Актуальность конкретного коммита подтверждается только успешным deploy workflow и последующей production-проверкой.

## Контакты

- Telegram: [@killallofthem13](https://t.me/killallofthem13)
- Email: `sam4k27@gmail.com`
- Tashkent · UTC+5
