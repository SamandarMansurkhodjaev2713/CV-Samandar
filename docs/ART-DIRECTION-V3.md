# Art direction V3/V6 — Proof Laboratory / Proof Compiler

Статус: локальный release candidate в ветке
`codex/layout-projects-seo-pricing`; production release этой итерации ещё не
заявлен.

Область: главная, 25 карточек продуктов, 16 case routes и три полные локали.

Этот документ фиксирует художественный и инженерный контракт V3. Он не
утверждает получение Awwwards-награды и не заменяет visual, performance,
physical-device или assistive-technology proof.

## 1. Главная идея

Сайт — не «портфолио разработчика с эффектами», а материальная лаборатория
доказательств. Один сюжет проходит через все сцены:

`BUILD → VERIFY → SHIP`

Builder-позиционирование отвечает за целостный продукт, QA — за проверяемость
решения. Поэтому выразительность строится на физических объектах, точных
линиях, контрасте документа и лаборатории, а не на неоне, псевдотерминалах и
декоративных HUD.

## 2. Первые пять секунд

Hero сначала отвечает на три вопроса:

1. Что получает заказчик — работающий продукт.
2. Кто несёт ответственность — Samandar Mansurkhodjaev / Product Engineer.
3. Как устроено качество — Build, Verify, Ship.

Signature scene — `Proof Compiler`: входные фрагменты сходятся в build-core,
проходят через измерительный QA-gate и выходят как release-block. Трасса
показывает причинность `INPUT → BUILD → QUALITY GATE → RELEASE`, а не
декоративную «технологичность». Сцена заканчивается в спокойной читаемой позе,
но её scan, pulse и transfer сохраняют ощущение живой системы.

Proof Compiler реализован code-native HTML/CSS/SVG и доступен ещё до React как
frame-zero LCP/fallback. Его authored-версия продолжает Intro, Hero и chapter
preview полноэкранного Index без raster decode, layout shift и скрытой
зависимости от внешнего media.

Intro длится примерно 2.4–2.85 секунды при первом входе и 1.95–2.4 секунды при
повторном. Его задача — дать критическим ресурсам время на загрузку и передать
сцену Hero, а не удерживать пользователя ради заставки. Есть абсолютный
watchdog, reduced-motion final pose и ускоренный повторный путь.

Короткие телефоны до 360×680 получают отдельную композицию высотой 88svh:
вся рейка, тезис, два подписанных CTA и proof-rail остаются в первом экране,
а Signal виден минимум на 64 px. Portrait mobile использует собственную
камеру, показывающую весь маршрут вместо случайного crop. Landscape и compact
desktop 920×720 имеют отдельные композиционные правила и не наследуют
переполненный desktop action-band.

## 3. Навигация и курсор

Полноширинная верхняя instrument rail показывает текущую главу, реальный
прогресс, язык и оставляет одно основное CTA.
Fullscreen Index раскрывает все 12 глав в реальном DOM-порядке. Меню является
модальным слоем: удерживает фокус, скрывает остальную страницу от a11y tree,
возвращает фокус trigger и сохраняет реальный 44×44+ close control поверх
прокручиваемого содержимого.

На desktop Index соединяет список глав с геометрическим Proof Compiler preview.
На mobile список остаётся главным, декоративный preview не перехватывает
касания. Матрица перестраивается в 3×4, 2×6 или 4×3 по реальной доступной
геометрии.

Курсор — enhancement только для fine pointer. Он меняет семантический режим
для link/send/drag, использует общий pointer stream и имеет конечную читаемую
позу. Touch не имитирует desktop-cursor.

## 4. Двенадцать сцен

| № | Сцена | Собственный визуальный язык | UX-роль |
|---:|---|---|---|
| 01 | Hero | code-native Proof Compiler, input-to-release route | позиционирование и первое действие |
| 02 | Signal | холодная диагностическая лента, раскрываемые строки | причины работать вместе без автопереключения |
| 03 | About | authored README / рабочая записка | проверяемый контекст и профиль |
| 04 | Projects | музей продуктовых объектов, асимметричная сетка / mobile filmstrip | сильнейшие продукты сначала, полный каталог по намерению |
| 05 | Builder | scope console и собранный brief | превратить запрос в понятную конфигурацию |
| 06 | Skills | технический радар и QA evidence | показать реальный стек, а не облако логотипов |
| 07 | Services | operating modes / input-output panel | объяснить форматы сотрудничества |
| 08 | CV | светлый документный акт | дать читаемое резюме и выгрузки |
| 09 | Process | производственная delivery line | объяснить путь от discovery до release |
| 10 | FAQ | аннотированное интервью | снять возражения с явным disclosure affordance |
| 11 | Trust | светлый QA protocol | показать границы, проверки и честность |
| 12 | Contact | dispatch bay | собрать brief и дать прямой следующий шаг |

Светлые CV и Trust обязаны использовать document ink, а не наследовать
полупрозрачный белый текст тёмных сцен. Контраст проверяется и визуально, и
автоматическими сценариями.

## 5. Projects и изображения

Каталог содержит ровно 25 канонических продуктов без дубликатов. Первые четыре
получают асимметричный feature-ритм; остальные появляются после явного действия
«Все проекты». На mobile сохраняется горизонтальная галерея с snap и видимым
фрагментом следующей карточки.

Каждая обложка — самостоятельная предметная фотография 1536×512 WebP и две
responsive derivative. Внутри нет текста, логотипа, UI, клиента или закрытых
данных. Объект и смысл находятся в центральной safe zone 84%. Полный контракт
описан в `docs/PROJECT-IMAGE-SYSTEM.md`.

Live-продукт открывает сайт основным CTA и публичный GitHub вторичным. Case
открывает внутреннюю визитку и возвращает пользователя к исходной карточке без
повторного Intro.

## 6. Case routes

Все 16 case routes используют общую систему, но разные hero-профили:

`vault`, `wave`, `converge`, `transformation`, `evidence`, `gateway`,
`measure`, `threshold`, `factory`, `rotor`, `lens`, `gauge`, `timetable`,
`calendar`, `reconcile`, `outbox`.

Профиль меняет композицию изображения, material cue, схему и аргументацию, но
не ломает информационный порядок: задача → роль → архитектурный принцип →
стек → QA-подход → публичная граница → CTA. RU, EN и UZ равноправны.

## 7. Motion grammar

- Нативный scroll остаётся единственным владельцем перемещения страницы.
- Все pointer/scroll/resize эффекты подписываются на общий motion runtime.
- Один transform имеет одного visual owner.
- Section enter заканчивается в полностью читаемой позе и прерывается новым
  пользовательским действием.
- Hero использует depth field, Projects — rise/filmstrip, Builder — assemble,
  Process — line-stagger, FAQ — transcript, paper acts — curtain/develop.
- Medium/low tier сохраняет по одному смысловому material gesture на сцену.
- Reduced motion убирает пространственное перемещение, но не содержание,
  иерархию, контраст или финальный state.
- WebGL остаётся enhancement поверх доступного исходного изображения.

## 8. Пять проходов приёмки

Каждая сцена и case проходят пять независимых проходов:

1. Факты: нет выдуманных метрик, клиентов, отзывов и production claims.
2. UX: понятны тезис, действие, affordance, возврат и состояние.
3. Art direction: приём связан с содержанием и не дублирует соседнюю сцену.
4. Engineering: доступны fallback, locale parity, tier и recovery path.
5. Regression: desktop/mobile/landscape/zoom/keyboard/reduced/deep-link.

Решение принимается только после автоматических контрактов и ручного просмотра
final pose. Скриншот не доказывает плавность, а synthetic test не заменяет
physical iPhone/Android или assistive technology sign-off.

## 9. Release evidence

Минимальный V3 candidate должен пройти:

```text
npm run validate
npm run check:build
npm run scan:secrets
npm audit --audit-level=high
npm test
npm run test:performance
npm run qa:visual
git diff --check
```

После deploy обязательны `npm run test:production` и `npm run check:live`.
Ни один локальный PASS не объявляется production proof до завершения этих
проверок.
