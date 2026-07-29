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

## Следующая контрольная точка

Глобальная оболочка и motion-runtime:

1. единая политика производительности и жизненного цикла анимаций;
2. единственный управляемый animation loop на подсистему;
3. cleanup при unmount, hidden tab, resize и context loss;
4. interruptible section transitions с timeout/finally;
5. desktop/mobile menu, hash/history и active-section contract;
6. проверки pointer, keyboard, back gesture и reduced motion.
