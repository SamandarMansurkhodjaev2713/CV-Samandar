# Intro and navigation contract

## 1. Назначение

Интро должно одновременно решать три задачи:

1. сразу задавать характер точного материального интерфейса Builder + QA;
2. давать критическим ресурсам короткое, но реальное окно подготовки;
3. никогда не становиться причиной недоступности сайта.

Меню и индикаторы должны показывать правду о текущей главе, поддерживать
мышь, клавиатуру и касание и не создавать второй конкурирующий scroll-runtime.

## 2. Источники истины

- `index.html` — frame-zero shell, scroll lock и аварийная поверхность;
- `src/engine/intro.js` — визуальная последовательность и release state
  machine;
- `src/components/app.jsx` — готовность shell/fonts/Hero, modal menu,
  active chapter, deep-link settling и mobile dock;
- `src/engine/motion-runtime.js` — единственный high-frequency input stream;
- `src/styles/styles.css` и `src/styles/sections.css` — z-index, safe areas,
  responsive geometry и reduced-motion presentation.

Нельзя добавлять второй intro timer, отдельный scroll listener для счётчика
или вручную поддерживаемый список разделов.

## 3. Readiness state machine

Frame-zero создаётся синхронно до загрузки React и содержит доступное состояние
`INITIALIZING`, Proof Rail и ненулевой визуальный прогресс.

Приложение независимо сообщает:

```text
shell  — React root смонтирован
fonts  — document.fonts.ready либо ограниченный timeout
hero   — code-native Proof Compiler смонтирован вместе с shell
```

Переходы состояния:

```text
boot
  ├─ all ready + min duration ─> visual release ─> teardown
  ├─ hard limit + shell ready ─> controlled release
  ├─ recovery limit + shell missing ─> recovery surface
  └─ late shell after recovery ─> short crossfade to healthy app
```

Release idempotent. Событие `sm:intro-done` отправляется один раз. После него:

- отсутствует `#sm-intro`;
- `html` не имеет `intro-lock` и `aria-busy`;
- `#root` не имеет `inert` и `aria-hidden`;
- Hero имеет финальное читаемое состояние;
- основная CTA доступна.

## 4. Timing

Первый сеанс:

- минимальная смысловая длительность около 2.4 секунды;
- обычное визуальное завершение около 2.5 секунды;
- recovery начинается не позднее примерно 2.75 секунды, если shell не
  смонтирован.

Повторный сеанс:

- сохраняет тот же язык;
- имеет минимум около 1.95 секунды и завершается примерно за 2.0–2.4 секунды;
- не превращается в одноразовый splash.

Конкретные значения принадлежат `src/engine/intro.js`. CSS не может удлинять
блокировку сверх JS hard limit. `transitionend` всегда имеет wall-clock
fallback.

## 5. Bypass, skip и reduced motion

- Любой содержательный hash обходит интро до создания панели.
- Escape, колесо и touch могут запросить раннее завершение после безопасного
  минимума.
- Явная skip-кнопка имеет touch target не меньше 44×44 px.
- Enter/Space не являются глобальным shortcut, чтобы не перехватывать
  управление у assistive technology и сфокусированных controls.
- Reduced motion не запускает canvas, не ждёт IntersectionObserver и завершает
  сцену коротким opacity-переходом.

## 6. Failure contract

Если шрифт или иной критический ресурс не подготовился, используется timed
fallback: семантический контент не ждёт его бесконечно. Hero не имеет
растрового readiness gate — его frame-zero и React-версии code-native.

Если React не смонтирован, пользователь получает:

- краткое объяснение;
- кнопку повторной загрузки;
- рабочий резервный Telegram-контакт.

Recovery не публикует stack trace, внутренний endpoint или техническую
диагностику. Поздний успешный mount автоматически возвращает нормальный сайт.

## 7. Каноническая карта глав

Единственный порядок — фактический DOM:

```text
hero → signal → about → projects → builder → skills →
services → cv → process → faq → quality → contact
```

Полноэкранное меню, desktop counter и mobile rail обязаны вычисляться из этого
порядка. Межсекционные декоративные акты не получают ложный chapter number.

## 8. Modal menu

При открытом меню:

- `#site-menu` имеет `role="dialog"` и `aria-modal="true"`;
- main, footer, skip link, nav links, language controls, CTA, brand, counter,
  mobile dock и внешний burger inert;
- фокус помещается на внутреннюю кнопку закрытия;
- Tab и Shift+Tab не выходят за границы диалога;
- Escape закрывает меню и возвращает фокус trigger;
- закрывающая анимация удерживает interaction lock до своего завершения.

При выборе главы menu сначала закрывается, затем соответствующий `h1/h2/h3`
получает фокус и временный `tabindex="-1"`. Hash и history отражают выбранную
главу.

До начала явного scroll целевая секция получает `sec-in sec-nav-landed`. Это
единый navigation handoff: section и все связанные `[data-reveal]` сразу имеют
читаемую конечную позу, а `scene-cinema` не запускает для той же секции второй
transform-owner. Класс не перехватывает нативный scroll и не меняет chapter
semantics; он только устраняет пустой промежуточный кадр при длинном jump,
deep link и возврате из project case.

## 9. Desktop and mobile rules

Desktop:

- полноширинная instrument rail показывает brand, текущую главу, progress,
  язык, contact CTA и Index trigger без конкурирующего ряда ссылок;
- Index собирает главы в 3×4 на широком экране, 2×6 на compact desktop и 4×3
  в коротком landscape;
- menu scene полностью владеет верхним слоем, включая кнопку закрытия.

Mobile:

- Hero — самостоятельная короткая сцена, а не длинный sticky tunnel;
- обе CTA остаются видимыми и имеют высоту не меньше 44 px;
- Proof Rail имеет минимум 8 px воздуха после CTA;
- следующий Signal читается после одного естественного свайпа;
- dock появляется после Signal, учитывает safe area и показывает одну из
  двенадцати реальных глав;
- landscape не создаёт горизонтального overflow.

## 10. Обязательная проверка

После изменения intro/navigation выполняются:

1. `node build.js`;
2. desktop и mobile `tests/design-system.spec.js`;
3. `tests/accessibility.spec.js`;
4. `tests/reduced-motion.spec.js`;
5. `tests/webkit-smoke.spec.js`;
6. production-mode визуальная проверка desktop и mobile;
7. `node scripts/validate-site.js --generated`;
8. повторная сборка без diff;
9. `git diff --check`.

Проверяются first-load, repeat, deep link, recovery, Escape, focus trap,
destination focus, intermediate widths, 320–430 px, 844×390, WebKit и reduced
motion. Изолированные Playwright-наборы запускаются последовательно: несколько
независимых процессов не должны совместно писать в один `outputDir`.
