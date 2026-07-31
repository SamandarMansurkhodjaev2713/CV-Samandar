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
