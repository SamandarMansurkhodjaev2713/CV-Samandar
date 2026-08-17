# Awwwards submission package

Актуально для локального кандидата: `v2.13.2`, asset graph `v234`, 2026-08-17

Production: <https://samandarmansurkhodjaev2713.github.io/CV-Samandar/>

Статус: **candidate package; submission не отправлен**

Этот документ хранит готовый текст и план медиа, но не объявляет сайт
номинантом или победителем. Перед отправкой обязательны внешний physical
mobile/AT sign-off и финальный production preflight.

## 1. Позиционирование

**Submission title**

Samandar — Product Systems in Motion

**One-line idea**

From signal to system: a portfolio where building, verification and delivery
form one continuous responsibility loop.

**Project type**

Personal portfolio / product engineering portfolio / interactive product
showcase.

Актуальный публичный каталог Awwwards выделяет направления Portfolio,
Technology и Web & Interactive, а также теги Animation, Interaction Design,
Microinteractions, Responsive, Scrolling, Single page, Storytelling и
Typography. Финальные category/tag значения нужно выбрать в фактической форме
подачи, потому что её таксономия может измениться:
<https://www.awwwards.com/websites/>.

Рекомендуемая подача:

- primary context — Portfolio;
- category candidates — Technology / Web & Interactive;
- tags — Portfolio, Storytelling, Interaction Design, Microinteractions,
  Responsive, Scrolling, Single page, Typography;
- technologies — JavaScript, React, CSS, WebGL, HTML5.

## 2. Готовый submission copy — EN

### Short description

An interactive portfolio for a product builder and QA engineer, structured as
twelve distinct acts. Twenty-five products lead either to working live
destinations or privacy-safe case studies, framing discovery, engineering,
verification and delivery as one continuous responsibility loop.

### Long description

Samandar — Product Systems in Motion turns a technical portfolio into a
twelve-act editorial journey. Each chapter has its own material, rhythm and
transition, while the experience remains one coherent world of warm graphite,
mineral surfaces, restrained metal and evidence-led light. The catalogue
contains twenty-five canonical products without duplicate repository entries:
nine open as live products and sixteen as complete privacy-safe case studies in
Russian, English and Uzbek. Motion communicates hierarchy, state and causality
rather than sitting above the content. Native scrolling, interruptible
transitions, readable final poses, reduced-motion behavior and progressive
degradation keep the work usable beyond the ideal device.

### Technology description

A static, progressively enhanced GitHub Pages experience built with vanilla
JavaScript and ahead-of-time compiled React. A canonical product registry
generates twenty-five cards, forty-eight localized case pages, sitemap,
canonical and hreflang metadata. One shared motion runtime owns performance
tiering, visibility, reduced motion and lifecycle; WebGL remains optional while
the underlying image stays readable. Deterministic builds, strict CSP,
dependency locking, secret scanning, cross-browser tests, accessibility checks,
performance budgets and post-deploy production monitoring form the release
contract.

### Credits

- Concept, product direction, content and final approval — Samandar
  Mansurkhodjaev.
- Product engineering, QA strategy and portfolio ownership — Samandar
  Mansurkhodjaev.
- Implementation process — AI-assisted, with the project owner responsible for
  briefing, factual review, visual approval and release decisions.

Credits нельзя сокращать до формулировки, которая скрывает AI-assisted процесс
или приписывает неподтверждённую работу студии/команде.

## 3. Концепция и художественная система

**From signal to system.** Сайт начинается с короткого диагностического сеанса,
а затем превращает доказательства работы в последовательность из 12 актов.
Каждая глава получает собственную композицию и motion-роль, но не собственную
несвязанную тему.

Общий визуальный мир:

- тёплый graphite вместо стандартного pure black;
- paper/protocol как намеренные светлые контрастные сцены;
- редакционная предметная фотография вместо UI-мокапов и неонового AI-арта;
- Oswald для архитектурного display-ритма, Inter для чтения, JetBrains Mono для
  evidence и Cormorant Garamond как редкий человеческий акцент;
- свет показывает действие, границу или подтверждение, а не служит случайным
  glow;
- motion объясняет вход, смену состояния и причинно-следственную связь.

Главное отличие — не количество эффектов, а единая система ответственности:
**Build → Verify → Ship**. QA не вынесен в отдельное обещание после проектов, а
встроен в builder, кейсы, Method, Quality и release-инфраструктуру.

## 4. Карта ключевых сцен

1. **Start / Intro** — 2–3-секундный optical boot-сеанс загружает критический
   runtime; повторный вход короче, но не исчезает полностью.
2. **Hero** — Proof Instrument собирается в самостоятельную desktop/mobile
   композицию; имя, позиционирование, CTA и proof rail читаются без скролла.
3. **Why me** — Builder + QA раскрывается как один контур ответственности.
4. **About** — профиль становится живым README с честным GitHub fallback.
5. **Projects** — четыре editorial featured-записи переходят в полный каталог;
   desktop использует сетку, mobile — горизонтальную scroll-snap галерею с
   видимым продолжением.
6. **Project builder** — выбор параметров собирает scope preview и пригодный
   brief, не выдумывая фиксированную цену или срок.
7. **Stack** — capability matrix связывает product engineering, AI и QA.
8. **Services** — capability-to-outcome система вместо перечня технологий.
9. **CV** — светлая документная сцена с переключением представлений и реальным
   PDF-маршрутом.
10. **Method** — gate-driven delivery без fake terminal, queued-состояний и
    придуманных production-логов.
11. **FAQ / Quality** — доступные disclosures переходят в протокол качества и
    границы публичных доказательств.
12. **Contact** — brief-first завершение с прямым каналом и ясным следующим
    шагом.

Case-страницы продолжают ту же систему: Thesis → Context → System → Evidence →
Boundaries. У каждого кейса свои обложка, акцент, схема, QA-аргументация и
privacy boundary, но общий navigation/motion/typography contract.

## 5. Mobile narrative

Mobile не является сжатым desktop. Проверяемая постановка:

- Hero имеет отдельные portrait, short portrait и compact landscape
  композиции;
- проектная галерея остаётся горизонтальной, touch-native и не перехватывает
  вертикальный scroll;
- fullscreen menu, locale control и command dock не перекрывают focus или
  browser chrome;
- cursor imitation и hover-only meaning отсутствуют;
- costly эффекты адаптируются единым tier runtime, а не заменяются немой
  статикой;
- reduced motion сохраняет весь контент, маршруты и состояние компонентов.

Официальный Awwwards Mobile Excellence checklist отдельно подчёркивает
viewport, legible text, touch targets, HTTPS, responsive images, form errors и
mobile performance. Он используется только как дополнительный review lens, не
как заявление о получении Mobile Excellence:
<https://www.awwwards.com/mobile-excellence-guidelines.pdf>.

## 6. Проверяемые факты кандидата

| Контракт | Фактическое состояние |
|---|---|
| Каталог | 25 canonical products, без repository-дублей |
| Маршруты | 9 live + 16 privacy-safe case |
| Локализация | RU / EN / UZ; 48 generated case HTML |
| Главная | 12 смысловых сцен |
| Обложки | 25 предметных WebP-наборов 1536/1152/768, 3:1 |
| Release source | `v2.13.2 / v234`, merge SHA `8958aa5` |
| Current production | `v2.13.2 / v234`; Pages workflow `32013952249`, release tag pending final evidence commit |
| Build | 54 generated artifacts, byte-identical double build |
| Automated suite | 266 scenarios; 155 pass, 111 profile skips, 0 fail/flaky |
| Visual release review | 13 main states + 16 cases в desktop/mobile; 58 PNG + 4 contact sheets |
| Production routes | main + 48 case URL + 9 live routes проверены |

Первый независимый monitor опубликованного `v2.13.2 / v234`, success:

- desktop 1440×1000: main ready 3605 ms, FCP 1080 ms, LCP 1388 ms,
  CLS 0.0049, frame p95 116.7 ms, long-task max 151 ms;
- mobile 412×839: main ready 3472 ms, FCP 1308 ms, LCP 1604 ms,
  CLS 0.0025, frame p95 33.4 ms, long-task max 88 ms;
- first-party failures и budget violations — 0.

Это synthetic Chromium evidence конкретного runner, не field RUM и не
physical-device Core Web Vitals. В обоих профилях адаптивный runtime выбрал
`low`; это подтверждает degraded path, а не 60 FPS на каждом устройстве.

## 7. Media manifest

Файлы готовятся в отдельный submission-export и не становятся runtime assets
сайта.

Воспроизводимый review-набор снимается с production командой
`npm run qa:submission`. Она создаёт в `tmp/submission-media/<timestamp>/`
восемь exact-size PNG, contact sheet, manifest и 60–90-секундный desktop WebM.
Скрипт валидирует размеры, длительность, минимальный вес и runtime errors.

| ID | Формат | Содержание | Обязательное условие |
|---|---|---|---|
| `cover-desktop` | 1440×900 PNG/WebP | Hero после завершения Intro | имя, CTA, instrument и proof rail в кадре |
| `projects-desktop` | 1440×900 PNG/WebP | featured + начало archive | читаемые карточки, без hover-only состояния |
| `builder-desktop` | 1440×900 PNG/WebP | выбранный scope и результат | итог не обрезан и не обещает цену |
| `quality-desktop` | 1440×900 PNG/WebP | светлая Quality-сцена | body/metadata проходят визуальный contrast review |
| `case-desktop` | 1440×900 PNG/WebP | TTYL или BelfProctor | видны thesis и system identity |
| `hero-mobile` | 390×844 PNG/WebP | mobile Hero | CTA и proof rail внутри первой сцены |
| `projects-mobile` | 390×844 PNG/WebP | горизонтальная gallery | виден next-card peek и pager |
| `case-mobile` | 390×844 PNG/WebP | один локализованный case | menu/CTA не закрывают текст |
| `site-tour-review` | 1440×900, 25 fps WebM | автоматизированный честный 60–90 s walkthrough | review/evidence, не финальный submission master |
| `site-tour-master` | 2560×1440, 60 fps | финальный 75–90 s walkthrough | без speed ramp, fake cursor и скрытия ожидания |
| `mobile-insert` | native device capture | touch/menu/gallery/case return | только после physical-device run |

Нельзя подменять `mobile-insert` viewport-эмуляцией. До появления реального
устройства desktop video может быть готов, но media package остаётся
незавершённым.

Последний локальный review-набор фактически создан 2026-08-13 на production и
прошёл ручной просмотр contact sheet и кадров видео на 5/20/40/60 секунде:
8 PNG, WebM 1440×900 / 25 fps / 74.8 s. Это доказательство capture-пути, а не
замена `site-tour-master` и native mobile insert.

## 8. Video shot list — 82 секунды

| Time | Сцена | Действие | Что доказывает |
|---:|---|---|---|
| 00–04 | Intro | полный первый запуск, без ускорения | загрузка является частью концепции |
| 04–12 | Hero | instrument settle, один pointer response, CTA focus | первые 5 секунд и интерактивная иерархия |
| 12–18 | Why me → About | нативный scroll и смена material act | chapter choreography |
| 18–31 | Projects | featured, раскрытие archive, одна live CTA | каталог и route semantics |
| 31–39 | Case | TTYL: thesis → system; возврат к точной карточке | privacy-safe depth и continuity |
| 39–49 | Builder | два выбора → scope result → brief CTA | полезная интерактивность |
| 49–58 | Stack → Services | matrix motion и disclosure | capability-to-outcome |
| 58–66 | CV → Method | paper transition и gate progression | контраст без разрыва системы |
| 66–74 | FAQ → Quality | keyboard focus/disclosure и proof protocol | usability + QA |
| 74–82 | Contact | brief-first финал и direct channel | завершённый пользовательский путь |

Отдельная mobile-вставка 20–30 секунд: Intro/Hero, menu, RU→UZ, gallery swipe,
case и exact-card return, portrait→landscape. Пальцы/касания не маскируются
графическим fake cursor.

## 9. Правила записи и отбора

1. Production URL и release SHA фиксируются в slate перед записью.
2. Первый take пишется с чистым storage; повторный — отдельно, чтобы не смешать
   два разных Intro-контракта.
3. Scroll и клики выполняются в реальном времени. Монтаж может только соединять
   законченные сцены и нормализовать звук/цвет.
4. Нельзя удалять кадр ожидания, если пользователь действительно обязан ждать.
5. В кадр не попадают DevTools, уведомления, токены, private URLs и персональные
   сообщения.
6. Для каждой сцены сохраняются исходник, экспорт и capture manifest: дата,
   SHA, browser/device, viewport, DPR, motion preference.
7. Скриншоты отбираются после проверки RU/EN/UZ overflow, focus, hover/touch и
   reduced motion, а не только по декоративной композиции.

## 10. Pre-submission gate

- [x] 25 / 9 / 16 product contract подтверждён canonical registry.
- [x] 48 case routes и RU / EN / UZ parity подтверждены build/validation.
- [x] `v2.13.2 / v234` local candidate: deterministic build, audit, secret
  scan, browser, axe, performance, live-route и visual gates зелёные.
- [x] `v2.13.2 / v234` опубликован из `8958aa5`; Pages build/deploy/verify,
  независимый production smoke 3/3 и первый synthetic monitor зелёные.
- [x] Credits и public claims прошли truth-boundary review.
- [x] Rollback tag и release runbook существуют.
- [x] Automated submission review set: 8 stills + 74.8 s desktop WebM;
  contact sheet и выборка video frames просмотрены.
- [ ] Наблюдение production не менее 24 часов после final deploy завершено без
  P0/P1.
- [ ] Physical iPhone/Android пройдены по
  [physical/AT protocol](PHYSICAL-AT-QA-PROTOCOL.md).
- [ ] NVDA, VoiceOver и TalkBack имеют фактический signed evidence.
- [ ] Финальный 2560×1440 / 60 fps master и native mobile insert записаны и
  просмотрены владельцем продукта.
- [ ] Фактическая форма Awwwards повторно проверена перед оплатой/отправкой.

## 11. Truth boundary

- Не заявлять награду, nomination, клиента, conversion, production scale или
  метрику без публичного доказательства.
- Не называть Playwright/Chromium measurements полевыми Core Web Vitals.
- Не называть emulation физическим iPhone/Android и axe — реальным screen-reader
  pass.
- Не раскрывать private repository, endpoint, credentials, client data или
  внутреннюю инфраструктуру.
- Не обещать, что сайт «гарантированно выиграет»: Awwwards-уровень является
  дизайн-целью, а решение принимает внешнее жюри.
- При расхождении media и production повторно записывать media; не подавать
  устаревший красивый кадр как текущий интерфейс.
