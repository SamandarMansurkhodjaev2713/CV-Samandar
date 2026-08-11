# ADR 0001: Статически генерируемое портфолио

- **Status:** Accepted

## Context

Портфолио должно оставаться быстрым и надёжным на GitHub Pages, поддерживать интерактивную главную и 15 индексируемых case-проектов на RU, EN и UZ. Runtime JSX-компиляция, SPA-only маршрутизация и обязательный сервер увеличивали бы время старта, поверхность отказа и сложность публикации.

## Decision

Использовать статическую архитектуру с ahead-of-time сборкой:

- React и Three.js поставляются как локальные production bundles;
- `src/components/*.jsx` — source, а соседние `.js` — generated artifacts;
- `build.js` компилирует JSX, обновляет CSP, генерирует 48 case HTML-страниц и sitemap;
- один `src/projects/render.js` формирует case-разметку и в Node во время build, и в браузере при переключении языка;
- generated artifacts коммитятся и повторно проверяются в CI перед публикацией на GitHub Pages.

## Consequences

- Страницы доступны без application server, имеют собственные URL/metadata и быстро показывают содержимое.
- Сборка детерминирована и может быть проверена обычным Git diff.
- После изменения JSX, case data, renderer или registry обязательно запускать build и коммитить производные файлы.
- Порядок browser scripts и глобальные контракты требуют явной валидации; серверные функции и runtime SSR отсутствуют.

## Rejected alternatives

- **JSX/Babel в браузере:** лишний payload и main-thread compile на каждом визите.
- **SPA-only case routes:** слабее deep links, SEO, share previews и fallback на статическом хостинге.
- **Next.js/SSR или отдельный backend:** не оправдывают инфраструктуру для read-only портфолио и усложняют Pages deployment.
- **Ручные HTML-копии для 45 маршрутов:** гарантированный drift шаблона, локалей и metadata.
