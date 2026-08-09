# Awwwards submission package

## Рабочее название

**Samandar — Product Systems in Motion**

Категория проекта: personal portfolio / developer portfolio / interactive
product showcase.

Production:
https://samandarmansurkhodjaev2713.github.io/CV-Samandar/

## Короткое описание

Портфолио product builder и QA engineer, построенное как последовательность из
12 интерактивных актов. Сайт показывает не только визуальный результат, но и
контур ответственности: понять задачу, собрать систему, проверить критические
риски и отдать работающий продукт.

24 проекта представлены без дублей: live-продукты ведут на работающие сайты,
а чувствительные решения раскрываются через публично безопасные case-страницы.
15 кейсов имеют полные RU / EN / UZ версии.

## Концепция

**From signal to system.** Каждая глава меняет пространственный и
анимационный язык, но сохраняет один материальный мир: тёплый почти чёрный фон,
минеральные поверхности, приглушённый металл, свет как доказательство действия
и editorial still-life вместо UI-мокапов.

Motion не является заставкой поверх контента. Он объясняет смену акта,
состояние интерфейса или причинно-следственную связь. Любая сцена имеет
прерываемую читаемую финальную позу, reduced-motion и degraded path.

## Ключевые сцены

1. **Start** — короткий boot-сеанс подготавливает runtime и переводит в
   самостоятельный desktop/mobile hero.
2. **Why me** — позиционирование Builder + QA раскрывается как один контур
   ответственности.
3. **About** — профиль читается как живой README с проверяемой публичной
   активностью и честным fallback.
4. **Projects** — горизонтальная mobile gallery и desktop grid из 24
   самостоятельных still-life объектов.
5. **Project builder** — интерактивный scope preview собирает понятный brief,
   а не обещает неподтверждённую цену.
6. **Stack** — техническая матрица объединяет product engineering, AI и QA.
7. **Services** — capability-to-outcome подача вместо списка технологий.
8. **CV** — переключаемый документ с корректной ролью, опытом и PDF-маршрутом.
9. **Method** — gate-driven delivery без fake terminal и выдуманных логов.
10. **FAQ** — явно раскрываемый диалог, доступный touch и keyboard.
11. **Quality** — QA-протокол и границы доказательств вместо повторения работ.
12. **Contact** — brief-first завершение с прямыми каналами и понятным следующим
    шагом.

## Technology story

- статический GitHub Pages runtime без CDN-зависимостей;
- vanilla JavaScript + prebuilt React, JSX компилируется ahead of time;
- единый product registry генерирует карточки, 45 локализованных case URL,
  sitemap, canonical/hreflang и structured data;
- общий motion runtime управляет quality tier, visibility, reduced motion,
  offscreen pause и lifecycle; WebGL остаётся progressive enhancement;
- CSP с build-time SHA-256, immutable GitHub Actions, locked dependencies,
  secret scan и минимальные workflow permissions;
- автоматические Chromium/Firefox/WebKit, axe, responsive, deep-link,
  lifecycle, performance, deterministic-build и production проверки.

## Credits

- Concept, product direction, content and final approval — Samandar
  Mansurkhodjaev.
- Product engineering, QA strategy and portfolio ownership — Samandar
  Mansurkhodjaev.
- Implementation process — AI-assisted, с ручной постановкой, фактчекингом,
  визуальной приёмкой и release-контролем владельца проекта.

Формулировка credits намеренно прозрачна: она не приписывает человеку или
инструменту работу, которая не подтверждена.

## Submission copy — EN

**Short description**

An interactive portfolio for a product builder and QA engineer, structured as
twelve distinct acts. It presents 24 products through live destinations or
privacy-safe case studies and frames building, verification and delivery as one
continuous responsibility loop.

**Technology description**

A static, progressively enhanced portfolio with an ahead-of-time React build,
a canonical product registry, 45 localized case routes, a shared motion and
performance runtime, deterministic generation, strict CSP and automated
cross-browser, accessibility, lifecycle and production gates.

## Media shot list

Обязательный набор для submission:

1. 1440×900: intro → hero transition.
2. 1440×900: Why me / About смена акта.
3. 1440×900: четыре первые project cards и раскрытие полного каталога.
4. 390×844: mobile horizontal project gallery с touch interaction.
5. 1440×900: Project builder — выбор → результат → brief.
6. 1440×900: Stack, Method и Quality как три разных motion-языка.
7. 1440×900 + 390×844: один live-продукт и TTYL/BelfProctor case flow.
8. 390×844: menu, locale, FAQ, contact и reduced-motion сравнение.

Видео должно показывать реальный скролл и взаимодействия без ускорения,
скрывающего задержки или usability. Достаточно 60–90 секунд, 1440p, 60 fps
capture; mobile-вставки записываются отдельно и монтируются без имитации
физического устройства.

## Truth boundary перед отправкой

- Не заявлять награды, клиентов, conversion, production scale или метрики,
  которых нет в публичном доказательстве.
- Не называть синтетические Playwright measurements полевыми Core Web Vitals.
- Не называть device emulation проверкой физического iPhone/Android.
- Не раскрывать private repository, endpoint, credentials, client data или
  внутреннюю инфраструктуру.
- Перед submission повторить production smoke, live-route check и ручную
  проверку физического mobile/assistive technology по QA-матрице.
