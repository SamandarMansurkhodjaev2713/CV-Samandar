# Правила сопровождения портфолио

Этот файл обязателен для любого разработчика или AI-агента, который меняет
репозиторий. Цель — сохранять фактическую точность, единую дизайн-систему и
воспроизводимый релиз.

## Источники истины

- Каталог и маршрутизация продуктов: src/content/product-registry.js.
- Контент карточек и главной: src/content/content.js.
- Тексты и данные приватных кейсов: src/projects/landings-data.js.
- Общий HTML-рендер кейсов: src/projects/render.js.
- JSX-компоненты: src/components/*.jsx.
- Скомпилированные src/components/*.js, projects/**/index.html, sitemap.xml и
  CSP в index.html — generated artifacts.
- Архитектурные и release-контракты: docs/.

Нельзя вручную править generated artifacts вместо source. После изменения JSX,
реестра, данных кейсов, рендера или CSP выполняется npm run check:build.

## Непереговорные продуктовые правила

1. В каталоге ровно один канонический объект на продукт. Репозиторий не равен
   продукту автоматически.
2. Live-продукт ведёт основным CTA на работающий сайт; GitHub — отдельное
   вторичное действие только при публичном репозитории.
3. Private/case-страница не раскрывает клиента, инфраструктуру, исходники,
   секреты, приватные endpoint или неподтверждённые метрики.
4. RU, EN и UZ — равноправные полные локали. Новое обязательное поле не может
   появиться только в одном языке.
5. Никаких выдуманных отзывов, production-логов, результатов, тестов или
   superlatives. Неизвестное обозначается как граница, а не заполняется
   предположением.
6. _otvety_extracted.txt принадлежит пользователю: не читать без необходимости,
   не изменять, не добавлять в commit.

## Frontend и motion

- Нативный скролл не перехватывается.
- Все переходы прерываемы и завершаются в читаемой финальной позе.
- Единственный источник tier/reduced-motion — src/engine/perf.js.
- Нельзя добавлять частный бесконечный RAF или дублирующий scroll/pointer
  stream; использовать общий motion runtime.
- Один visual owner на transform/translate каждого элемента.
- Эффекты обязаны иметь medium/low/reduced/degraded путь без потери контента.
- WebGL — enhancement: исходное изображение остаётся доступным при ошибке,
  context loss или отключении эффекта.
- Touch target — минимум 44×44 px; hover никогда не является единственным
  способом понять или выполнить действие.
- Fixed/sticky элементы проверяются в portrait, 844×390 landscape и при 200%
  text zoom.

## Изображения проектов

- 1536×512, WebP, 3:1, центральная safe zone 84%.
- Без текста, логотипов, UI-скриншотов и скрытых данных.
- Для каждого продукта — самостоятельные объект, материал, свет и accent.
- Обязательны width/height, responsive sources, loading policy и fallback.
- После замены выполнять валидатор и визуальную матрицу.

## Обязательные проверки

Минимум перед commit:

    npm run validate
    npm run check:build
    npm run scan:secrets
    npm audit --audit-level=high
    npm test
    npm run test:performance
    git diff --check

Для визуально значимого релиза:

    npm run qa:visual

Для release-кандидата дополнительно:

    npm run check:live

После deploy:

    npm run test:production
    npm run check:live

Нельзя отключать flaky-тест. Сначала локализовать гонку, исправить продуктовый
контракт и подтвердить повторным стресс-прогоном.

## Сборка и cache version

- Требуется Node.js 20+ и npm ci.
- npm run check:build выполняет две сборки и требует байтовой идентичности
  51 generated artifact.
- Asset version в index.html едина для всех ссылок. Поднимать её только один
  раз перед release командой npm run bump:assets -- NEXT, затем снова собирать
  и тестировать.
- Не добавлять CDN/runtime dependency без ADR, security review и degraded path.

## Git и релиз

- Работать в ветке codex/* или отдельной feature-ветке.
- Не использовать reset --hard и не уничтожать пользовательские изменения.
- Commit должен включать source и соответствующие generated artifacts.
- Deployment идёт только из main после quality gate.
- Релиз завершён только после зелёного post-deploy smoke; локальный green не
  является доказательством production.
- Порядок выпуска и отката: docs/RELEASE-RUNBOOK.md.

## Документирование результата

- Обновлять CHANGELOG.md, docs/IMPLEMENTATION-LOG.md и затронутые контракты.
- Разделять автоматизированные доказательства и ручные/внешние проверки.
- Не заявлять NVDA, VoiceOver, physical iOS/Android или production smoke как
  выполненные без фактического запуска и сохранённого результата.
