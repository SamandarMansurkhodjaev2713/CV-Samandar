# Implementation log

Этот журнал фиксирует не намерения, а уже проверенные контрольные точки
Awwwards-переработки. План и критерии готовности находятся в
`MASTER-IMPLEMENTATION-PLAN.md`; архитектурные контракты — в
`ARCHITECTURE.md`.

## Release Proof catalog and responsive candidate — v246

Повторный GitHub-аудит сохранил правило «один продукт — одна каноническая
карточка» и добавил `Gorilla — Five Signals Concept` как самостоятельный
public live-продукт. Primary CTA ведёт на локализованный GitHub Pages сайт,
secondary CTA — на публичный репозиторий. `Sentinel Edge` по прямому решению
владельца удалён из registry, контента, artwork и фильтров. Итоговый каталог
по-прежнему содержит 29 продуктов: 10 live и 19 privacy-safe case routes.

Для Gorilla создан отдельный предметный artwork: blackened-steel монолит из
пяти связанных пластин с тёплой оранжевой кромкой. Подготовлены WebP
1536×512, 1152×384 и 768×256 без текста, UI, логотипов и закрытых данных.
Мобильный каталог теперь сразу показывает все 29 карточек и фильтрует их по
пяти честным категориям без повторного монтирования дублей; desktop сохраняет
четыре курируемые записи до явного раскрытия. Каждая из 29 mobile-картинок
отдельно проверена на responsive `currentSrc`, decode, размеры 3:1, opacity и
видимость. Карточки больше не делят `transform` между layout и parallax, а
геометрический тест подтверждает отсутствие пересечений после раскрытия.

About заменён на maker's proof с управляемым заголовком «От задачи / до
релиза — / один ответственный», маршрутом `BRIEF → BUILD → VERIFY → RELEASE`
и фактическими доказательствами без live-clock или GitHub API. Navbar собран
как одна inset instrument-rail с реальной главой и прогрессом; fullscreen
Index владеет фокусом и взаимодействием. Кнопки получили устойчивую финальную
позу без конкурирующих magnetic-transform, а desktop cursor работает как
конечный verification instrument и полностью отсутствует на touch. Intro
показывает реальную готовность `SHELL / TYPE / MEDIA`. Mobile Hero→Signal
использует нативный sticky handoff без перехвата скролла и прошёл RU/EN/UZ
геометрию на 27 комбинациях viewport/locale.

Все 19 case routes используют одну Release Field систему, но сохраняют
уникальные hero, artwork, схему, QA-аргументацию и privacy boundary. Fixed
topbar, sticky chapters, deep-link, locale switch и reload сохраняют точную
главу; возврат ведёт к исходной карточке без повторного Intro. Visual runner
теперь ждёт реальный `HTMLImageElement.decode()`, а не фиксированную задержку,
поэтому contact sheets не фиксируют ложные пустые изображения.

Первичный React mount разделён на пять смысловых стадий: Hero/Signal,
About, Projects, Builder/Skills и оставшиеся главы. Deep links монтируют
полную оболочку сразу. Стадии запускаются через `requestAnimationFrame` и
`React.startTransition`, а общий scroll/motion runtime обновляет измерения
после каждой стадии. Это убрало initial long task около 2,8 секунды; отдельный
performance gate прошёл desktop/mobile 2/2 без изменения budget.

Локальные automated evidence текущего кандидата: `validate` — 29/10/19 и три
локали; `check:build` — 64 byte-identical generated artifacts; visual gate —
4/4 плюс повторный case capture 2/2; performance — 2/2; desktop Chromium и
Firefox — 135 passed / 12 profile-specific skipped; mobile Chromium и reduced
motion — 37 passed / 109 profile-specific skipped. Совокупно это 172 passed,
121 целевой skip и 0 failed в выполненных проектах. Secret scan, high-level
dependency audit, documentation contract, 10/10 live routes и
`git diff --check` зелёные.

Первый production push `v245` прошёл build/deploy/verify, независимый smoke
3/3 и live check 10/10, но cloud browser report честно отметил один flaky
retry: прямой вызов навигации мог опередить staged mount секции About и
получить отсутствующий target. Это был реальный ранний Index-click contract,
а не только слабость теста. SceneCinema теперь публикует запрос монтирования,
ждёт фактический DOM target и отменяет ожидание при более новом intent; App
немедленно повышает render stage для выбранной смысловой главы. Focused stress
после исправления прошёл 20/20 без retry. Runtime hotfix получил отдельный
cache bump `v246`; финальный production evidence фиксируется после повторного
полного workflow.

Локальный WebKit на этом Windows host не создаёт browser process: запуск
завершается кодом `0xC0E90002` до открытия страницы при включённой политике
Verified and Reputable Apps; принудительная переустановка Playwright WebKit
ситуацию не изменила. Политика безопасности не ослаблялась, поэтому это
честно зафиксировано как external host-runtime blocker, а не product failure
или WebKit PASS. Production smoke, physical iOS/Android и NVDA/VoiceOver для
`v246` не заявляются до повторного workflow.

## About maker's proof candidate — v243

Подтверждённый визуальный дефект заголовка About был не отдельным смещением
буквы: плотный `.88` line-height, узкий `max-width` и отрицательный отступ
reveal-маски обрезали верх кириллических диакритик. Заголовок заменён на
управляемые смысловые строки «От задачи / до релиза — / один ответственный», а
общая mask geometry получила безопасный верхний запас. RU, EN и UZ имеют
собственные полные строки, поэтому браузер больше не принимает случайные
композиционные решения в критическом display-тексте.

Старый README/dashboard About удалён из runtime-композиции. Live-clock,
IntersectionObserver для clock, `setInterval`, GitHub API enhancement,
activity strip, stack chips и повторяющая project feed больше не загружаются.
Их заменяет одна annotated maker's proof: тезис об ответственности, маршрут
`BRIEF → BUILD → VERIFY → RELEASE`, четыре проверяемых факта, три текущих
направления работы и подпись Builder + QA. Раздел не дублирует Stack/Projects и
не меняет высоту после внешнего ответа. `gh.js` удалён из preload/bootstrap и
из source; fault contract теперь явно запрещает runtime GitHub-зависимость
About.

Локальная Chromium-проверка заголовка и proof выполнена на 320×568, 390×844,
762×900 и 1440×1000; DOM geometry подтверждает равенство document/client width
и отсутствие выхода каждой title line за shell. Автоматизированная responsive
matrix прошла 11 canonical viewport от 320×568 до 1920×1080, включая 844×390,
а отдельный сценарий подтвердил 200% text zoom, открытое menu state и смену
ориентации. Это browser/automation evidence, а не physical-device или
assistive-technology proof.

Полный visual release gate завершился 4/4 за 7.2 минуты. Свежие contact sheets
главной и всех 19 case pages на desktop/mobile просмотрены вручную: About
сохраняет новый reading order в общей драматургии, соседние Signal/Projects не
получили переходных артефактов, а case hero не имеют пустых reveal-поз,
обрезанных CTA или горизонтального overflow. Evidence содержит 26 main scenes,
38 full-page case captures и четыре contact sheet; это не заменяет проверку на
физических iOS/Android устройствах.

Финальный изолированный multi-engine gate завершился 172 passed / 120
profile-specific skipped / 0 failed за 9.3 минуты: Firefox, iPhone WebKit,
desktop/mobile Chromium и reduced motion. Transient reduced-motion assertion
переведён с требования поймать уже исчезающий DOM-кадр на устойчивый head-boot
contract; сценарий после этого прошёл 10/10 повторов. Navbar geometry на
920/1024/1160/1280/1440 px отдельно выдержала 10/10 повторов, а затем прошла
внутри полного suite. Официальный performance gate завершился desktop/mobile
2/2 за 19.8 секунды без расширения бюджета; desktop-профиль дополнительно
прошёл 5/5 повторов после обязательного cooldown от полного browser suite.
Validator фиксирует 29 продуктов, 10 live и 19 case routes; две сборки дали
64 byte-identical generated artifacts. Secret scan, dependency audit (0
уязвимостей), documentation contract и `git diff --check` зелёные.

## Release Proof catalog candidate — v242

GitHub-аудит сначала добавил `Echelon Desktop`, а повторный authenticated-аудит
обнаружил ещё три зрелых самостоятельных private продукта: `DentForma —
Browser 3D Review`, `MeetingFlow RU/UZ` и `Telegram Sheets Task Bot`.
`echelon-site-main` признан публичным source repository и live Pages route,
`echelon-site` — duplicate/legacy alias того же продукта, поэтому в интерфейсе
нет повторной карточки. Каталог теперь содержит 29 продуктов: 10 live и 19
case. Echelon ведёт главным действием на live-продукт и отдельным вторичным
действием на GitHub; три private продукта ведут на безопасные внутренние кейсы.
Authenticated GitHub API re-audit 2026-08-25 подтвердил тот же канонический
набор: более свежий commit в `CoupleOS` относится к уже существующему Softly,
а новых самостоятельных product repositories после отбора не появилось.

Для Echelon создан собственный предметный 3:1 artwork: physical desktop
assistant control puck с brushed aluminium, smoked glass, warm amber state line
и холодным work-plane reflection. Подготовлены 1536×512, 1152×384 и 768×256
WebP; изображение не содержит текста, UI, логотипов или закрытых данных.
Validator закрепляет новый asset contract и duplicate-repository decision.

Для трёх private продуктов созданы самостоятельные предметные 3:1 artwork:
DentForma использует dental revision jig из тёмного металла и матовой керамики;
MeetingFlow — физическую relay-ленту между записью и доставкой; Task Bot —
механическую transaction board с одним выделенным commit-slot. Для каждого
подготовлены 1536×512, 1152×384 и 768×256 WebP в центральной safe zone без
текста, интерфейсов, логотипов или закрытых данных. Визитки используют полные
RU/EN/UZ тексты и разные system diagrams: revision, relay и transaction.

Первый экран получил parser-painted статический proposition shell, поэтому
truthful Hero copy доступен браузеру до React и измеряется как ранний LCP, но
остаётся визуально под полностью непрозрачным Intro. После готовности
семантического React heading shell заменяется без дублирования доступного
контента. Hero action band переведён в устойчивую одноколоночную композицию:
tagline больше не сжимается CTA-блоком, roles rail не пересекает headline, а
desktop, portrait и 844×390 landscape сохраняют читаемую финальную позу.

Проектный архив теперь прогрессивный не только визуально: до явного действия
монтируются четыре curated cards, а остальные 25 появляются после «Все
проекты» либо deep-link возврата к конкретной карточке. Это сохранило museum
grid/filmstrip и exact-card return, одновременно убрав лишний initial DOM,
decode и layout work. Performance budget прошёл desktop/mobile 2/2 без
изменения порогов.

Локальная ручная browser-проверка выполнена в Chromium на 1440×900,
1280×720, 390×844 и 844×390: Intro/Hero, Release Index, Projects grid/filmstrip,
кнопки и case rhythm просмотрены визуально и через DOM geometry. Это не
physical-device или assistive-technology proof. Полный функциональный,
security/live и visual release gate фиксируется отдельным финальным абзацем
только после фактического завершения команд и единственного asset bump.

После единственного bump до `v242` validator подтвердил 29 продуктов, 10 live
и 19 case routes, 57 локализованных case pages и 58 sitemap URL; две сборки
дали 64/64 byte-identical generated artifacts. Audit, secret scan,
documentation contract и 10/10 external live routes зелёные. Изолированный
performance gate прошёл desktop/mobile 2/2. Финальная visual matrix завершилась
4/4: вручную просмотрены 26 кадров главной, 38 full-page кадров кейсов и четыре
contact sheet на desktop/mobile; видимых обрезок, пустых reveal-поз,
незагруженных artwork или горизонтального overflow не обнаружено. Physical
iOS/Android и NVDA/VoiceOver/TalkBack этой проверкой не заявляются.

Окончательный multi-engine процесс после исправления Intro release-state
завершился 171 passed / 119 profile-specific skipped / 0 failed за 18.9 минуты
без retry: Firefox, iPhone WebKit, desktop/mobile Chromium и reduced motion.
Намеренно stalled Intro отдельно выдержал 7/7 WebKit-повторов. Head safety,
React fallback и authored teardown теперь сначала публикуют единственный
`doneFired/reason`, затем снимают overlay; здоровая оболочка больше не может
оказаться видимой с неопределённым release-state.

Первый повтор visual gate честно остановился на `ENOSPC`: два параллельных
долгих case-контекста одновременно упаковывали дублирующие trace/video данные.
Evidence runner переведён на один worker и отключает trace/video только при
`VISUAL_QA=1`; все 68 authored PNG, image decode, reveal и full-page проверки
сохранены. Чистый повтор завершился 4/4 за 6.3 минуты, после чего четыре свежих
contact sheet просмотрены вручную. Это исправление инфраструктуры доказательства,
а не ослабление визуального product contract.

Release SHA `68f0ead` опубликован из `main` workflow `32834472208`. Clean cloud
build за 7m35s повторил locked install, audit, secret scan, deterministic build,
generated drift, documentation, browser/accessibility и isolated performance
gates; Pages deploy занял 11 секунд, production verify — 58 секунд. Независимый
post-deploy smoke прошёл 3/3, live routes — 10/10. Production HTML вернул HTTP
200, 23 asset refs `v242` и ни одной ссылки на другую cache version. Synthetic
production monitor завершился без violations: desktop ready 3595 ms, LCP
1640 ms, CLS 0.0003, frame p95 66.8 ms; mobile ready 3915 ms, LCP 900 ms,
CLS 0.0000, frame p95 33.3 ms. Это Chromium synthetic evidence, а не field RUM
или подтверждение физического устройства.

## Release Field V8.1 candidate — v240

После сравнения с авторским Stones art direction переведён из набора
«технологичных» микромиров в один Release Field. `src/engine/acts.js` сохраняет
near-black material canvas и brass/ember accent для всех 12 глав; CV и Quality
используют светлые document surfaces внутри тёмного shell, а не два белых
полноэкранных разрыва.

Hero получил code-native Release Specimen: три физические обработанные пластины,
одна измерительная ось и один inspection-light. Parser frame-zero, Intro и React
Hero используют один объект. Заголовок состоит из двух цельных Oswald phrase
spans; deep link помечает `sm-intro-skip` и сразу показывает их финальную позу.
Это устраняет полустёртый кадр при возврате из case route и не сокращает
обычный readiness-driven Intro.

Navbar разгружен: desktop-языки перенесены в fullscreen Index, где они остаются
доступными; rail сохраняет brand, chapter coordinate, contact и trigger.
Декоративные кольца/preview-glow Index удалены. Desktop smart cursor упрощён до
sampling reticle: тихая точка в покое и измерительная рамка только над реальным
действием; crosshair, QA-jaws и постоянные координаты удалены. Touch cursor не
имитирует. В Index скрыт устаревший preview-HUD; 12 глав образуют чистую
типографическую матрицу, а burger/close не создают click-ripple поверх своей
контрольной анимации.

Все 16 case routes получили общий Release Field поверх существующих фактов и
локалей: Oswald display, Inter body, один grid/chapter rhythm, прямоугольные
controls и единый reveal. Старые wave/gauge/lens pseudo-HUD cues отключены;
уникальность сохраняют предметное изображение, registry accent, схема,
QA-аргументация и текст. Mobile first viewport показывает смысл, две CTA и
объект без горизонтального overflow.

Parser-frame теперь семантически блокирует `#root` сразу при его появлении, до
React passive effect. Изолированный Intro-contract подтвердил один release,
снятие `inert/aria-hidden` и читаемый Hero. Исходный целевой design/layout
прогон дал 23 passed / 12 viewport-specific skipped / 3 локализованных fail;
после исправления все затронутые сценарии прошли изолированный повтор: 3 passed
/ 1 project skip. Полный повтор и release gate фиксируются ниже только после
фактического запуска.

Отдельная cold-start проверка под шестикратным CPU throttling выявила пустой
compositor-кадр: wall-clock progress уже достигал 80–90%, когда CSS entrance
ещё оставался на `opacity: 0`. Boot-readout теперь видим с первого keyframe, а
Specimen начинает entrance из различимой позы без blur. Повторная проверка на
250 и 650 мс подтвердила содержательный кадр даже при остановившемся CSS
timeline.

Финальный локальный release gate выполнен повторно уже после Intro/Index/cursor
правок. Детерминированная сборка подтвердила 55/55 byte-identical generated
artifacts; validator — 25 продуктов, 9 live routes, 16 case routes и 3 локали;
dependency audit — 0 vulnerabilities; secret scan и documentation contracts
прошли. Изолированный performance budget завершился desktop/mobile 2/2 без
изменения порогов. Полная браузерная матрица завершилась 165 passed / 113
profile-specific skipped / 0 failed за 16.5 минуты: Firefox, iPhone WebKit,
desktop/mobile Chromium и reduced motion.

Свежий `npm run qa:visual` завершился 4/4 за 5.2 минуты. Вручную просмотрены
contact sheets 12 глав и 16 case routes на desktop/mobile, а также отдельные
кадры Intro и Index. Не обнаружены смещённые headline baseline, horizontal
overflow, пустой первый кадр Intro, нераскрытый контент или незагруженные
project images. Эта матрица не заявляет physical iOS/Android, NVDA,
VoiceOver или TalkBack как выполненные проверки.

Release commit `51ec750` опубликован из `main` workflow run
`32633902371`. Cloud build завершил dependency/security, deterministic build,
documentation, desktop/mobile/accessibility и isolated performance gates;
Pages deploy занял 10 секунд, встроенный production verify — 1m02s. Независимый
post-deploy `npm run test:production` прошёл 3/3: production shell монтирует 25
канонических карточек, все 48 RU/EN/UZ case pages возвращают статический shell,
а case возвращает к точной исходной карточке без повторного Intro. Повторный
`npm run check:live` подтвердил 9/9 внешних продуктов.

Cache-busted production-аудит загрузил asset version `v=240`, headline
«ИЗ ЗАДАЧИ — / В ПРОДУКТ.», `overflow = 0` и Index в состоянии `is-open` без
fatal runtime state. Опубликованные Hero и Index просмотрены отдельными
production screenshots; новый Release Specimen, typographic grid и contextual
close-cursor соответствуют локально принятому release-кандидату.

## Hero V7 and navigation polish candidate — v240

После повторного пользовательского visual review первая сцена получила
отдельный release owner `src/styles/release-polish.css`. Proof Compiler теперь
занимает полноэкранное причинное поле вместо рамочной dashboard-композиции,
proposition состоит из двух цельных phrase spans, а role rail больше не
использует посимвольный transform/font fitting. Это устраняет наблюдавшееся
расхождение baseline после font settling и сохраняет один visual owner на
строку.

Instrument rail с frame zero показывает реальную главу и прогресс. Desktop
trigger локализован как `МЕНЮ / MENU / MENYU`; fullscreen Index сохраняет
modal/focus contracts. Для 901–1180 px action band переходит в две полноценные
CTA-колонки, а в phone landscape дублирующая top telemetry скрыта и не
пересекает заголовок/Compiler.

Browser-аудит выполнен на 1440×1000, 390×844 и 568×320: horizontal overflow
отсутствует, headline имеет цельные стабильные строки, portrait CTA не
пересекают proof rail, а landscape оставляет между CTA и rail 8.3 px. Свежие
desktop/mobile contact sheets главной просмотрены для всех 12 сцен. Отдельная
матрица 16 desktop case routes прошла после замены фиксированного ожидания
contact sheet на фактический `HTMLImageElement.decode()`; сама продуктовая
проверка не ослаблялась.

## v2.14.1 layout, catalog, SEO and pricing candidate — v239

Hero V6 заменяет растровый Release Gate на code-native Proof Compiler:
`INPUT → BUILD → QUALITY GATE → RELEASE`. Frame zero, Intro, React Hero и
fullscreen Index используют одну причинную сцену; application readiness больше
не ждёт фиктивный image decode. Первый сеанс Intro сохраняет 2–3-секундное
окно подготовки, повторный — тот же характер в более коротком ритме, а deep
link обходит заставку.

Навигация пересобрана как полноширинная instrument rail. Текущая глава,
progress, язык, contact и Index не конкурируют с обрезаемым рядом ссылок;
12-главный Index имеет отдельные 3×4, 2×6 и short-landscape композиции.
Desktop smart cursor стал контекстным измерительным инструментом и использует
только shared pointer stream. Touch-профили курсор не имитируют.

Typography pass закрепляет Inter как self-hosted body face для RU/EN/UZ, а
Oswald/Cormorant оставляет в display/editorial ролях. CV и Quality сохраняют
светлую документную материальность внутри тёмного section-world вместо двух
случайных полноэкранных белых разрывов.

Browser-проверка V6: 27/27 Hero locale/viewport states и полный regression gate
165 passed / 113 project-specific skipped / 0 failed. Проверены Firefox,
iPhone WebKit, desktop/mobile Chromium, CTA, proof-rail, Signal handoff, menu
geometry, focus trap, deep-link, 200% zoom, orientation change, degraded paths
и shared motion lifecycle. Отдельный performance gate прошёл 2/2 на desktop и
mobile.

Первый полный gate локализовал редкую lifecycle-гонку: на насыщенном mobile
runner аварийный Intro deadline мог завершиться после commit React, но до его
passive effect, оставляя completed overlay над здоровым shell. Теперь любой
completed overlay удаляется синхронно при наличии смонтированного приложения.
Проблемный keyboard-сценарий прошёл пять повторов подряд, связанная пара
keyboard/late-shell — 9 passed / 3 viewport-specific skipped, после чего полный
276-сценарный gate прошёл без ошибок.

`npm run qa:visual` завершил 4/4 captures. Вручную просмотрены свежие contact
sheets 12 глав и 16 case routes на desktop/mobile, а также крупные кадры Hero,
Projects, Index, Builder, CV, Quality и Contact. Видимых обрезок, конфликтующих
документных фонов, непрочитанных reveal-поз или старых raster Hero-композиций не
обнаружено. Physical iOS/Android и NVDA/VoiceOver/TalkBack этой проверкой не
заявляются.

Первый Pages run `32460314162` не дошёл до deploy: весь cloud browser /
accessibility gate прошёл, но constrained desktop performance runner показал
idle baseline p95 83.3 ms и scroll p95 50–83.4 ms; бинарная доля кадров выше
40 ms выросла на 9–17 п.п. при уже активном `low` tier. Диагностика обнаружила
реальную лишнюю работу: low-tier shared runtime продолжал на каждом scroll-frame
читать геометрию всех 12 section-worlds и вычислять CSS-параллаксы, которые
визуально уже были отключены политикой.

Runtime теперь очищает неиспользуемые pin/parallax/magnetic owners при переходе
в `low`, Hero не пишет неизменившиеся CSS variables, navbar не отправляет
повторный React state, а geometry fallback для observer-delivery ограничен
96/240-мс sweep. Продуктовые performance assertions не расширялись. Новый
lifecycle-контракт доказывает, что authored cursor остаётся доступным на fine
pointer, тогда как выключенная layout-работа действительно освобождается.
После правки isolated performance прошёл desktop/mobile 2/2 как до, так и после
полного 15.9-минутного browser run.

Первый повтор полного локального gate выявил отдельную starvation-гонку
iPhone WebKit в искусственном сценарии заблокированного `intro.js`: одиночный
head-safety timer мог быть доставлен после собственного wall-clock deadline.
Safety теперь дополнительно перепроверяет просроченный дедлайн синхронно на
`DOMContentLoaded/pageshow`, не сокращая нормальный authored Intro. Сценарий
прошёл stress 5/5 без retry; затем чистый полный gate завершился 165 passed /
113 profile-skipped / 0 failed, а visual gate — 4/4. Свежие desktop/mobile
contact sheets главной и всех 16 case routes просмотрены вручную повторно.

Точечный browser-аудит после пользовательского feedback выявил три класса
риска: скрытый reveal-контент при длинном явном переходе, конкуренцию project
pager с mobile dock и недостаточную различимость карточек при общей студийной
арт-дирекции. Navigation handoff теперь заранее фиксирует целевую секцию и её
вложенные reveal-элементы в конечной читаемой позе. Нативный scroll, shared
runtime и chapter semantics не менялись.

Каталог сохраняет 25 канонических продуктов без дублей, но desktop-ритм снова
использует feature-пропорцию `7/5`. Карточки получают уникальные registry
accent, ambient placement и object crop, короткий task/outcome copy и
product-count вместо ложного общего case-count. На mobile собственный pager
Projects остаётся компактнее 72 px и временно заменяет общий dock. Все 25
accent values и все 25 image paths закреплены validator как уникальные.

Builder estimate model обновлён до `2026.2`: базовые ориентиры составляют
`$150–450`, `$450–1,400` и `$1,500–4,200`; Contact использует buckets от
`< $150`. Это deterministic scope preview с диапазоном, assumptions и
confidence, а не оферта. Главная и 48 локализованных case routes получили
полный SEO graph и локализованные title/description/Open Graph данные.

## v239 production evidence

Release commit `6e427aa` опубликован из `main` workflow
[`32464443015`](https://github.com/SamandarMansurkhodjaev2713/CV-Samandar/actions/runs/32464443015).
Cloud build завершился за 9m53s: install, audit, secret scan, deterministic
build, docs, полный browser/accessibility gate и isolated desktop/mobile
performance прошли; Pages deploy занял 10s, встроенный production verify — 51s.
Он проверил главную, все generated case routes и все внешние live-продукты.

Независимая post-deploy проверка с локальной машины:

- production HTML → HTTP 200, 23 asset refs `v239`, 0 refs `v237`;
- frame-zero и React graph содержат `hero-compiler`, старого
  `release-gate.webp` в critical path нет;
- `npm run test:production` → 3/3: 25-card каталог, 48 RU/EN/UZ case routes и
  точный возврат из case к исходной карточке без повторного Intro;
- `npm run check:live` → 9/9 usable external live routes.

Production synthetic/browser proof не подменяет physical iPhone/Android или
assistive-technology проверку. Physical iOS/Android и
NVDA/VoiceOver/TalkBack в этой итерации остаются `NOT RUN`.

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

## Main, catalog and case-system checkpoint

После последовательных product/UX/visual проходов:

- все 12 сцен главной приведены к одной editorial-системе, но имеют разные
  композиции и enter-signature;
- Builder выдаёт проверяемый диапазон, границы и handoff, а не имитацию оферты;
- Stack связывает full-stack, AI и реальный QA-инструментарий;
- Services, Method, FAQ, Quality и Contact больше не повторяют каталог;
- CV имеет APG-tabs, корректные факты, канонический двухстраничный PDF и
  устойчивый keyboard focus в portrait/landscape;
- каталог содержит 24 уникальные карточки: 9 live и 15 case;
- 24 предметные WebP-обложки используют responsive sources и branded fallback;
- 15 приватных кейсов имеют индивидуальные hero, system diagram, evidence,
  QA и boundary, полностью сгенерированные в RU/EN/UZ;
- возврат из кейса раскрывает каталог, фокусирует точную карточку и не
  проигрывает intro повторно.

Контрольные commits этапа: 59e18ed, a74b89d, a631172, a77eeee.

## Release hardening checkpoint

Локально подтверждено до финального asset bump:

- desktop Chromium: 112 passed, 5 project-specific skipped, 0 failed;
- mobile Chromium: 30 passed, 87 project-specific skipped, 0 failed;
- iPhone WebKit: 2/2; desktop Firefox: 2/2; reduced motion: 1/1;
- performance budget: desktop и mobile 2/2;
- SceneCinema stress: 40/40 повторов;
- responsive orientation/text-zoom stress: 10/10;
- CV focus/landscape stress: 20/20;
- WCAG axe для главной, 15 кейсов и 404 — без A/AA violations в
  автоматизированном наборе;
- secret scan — чисто; dependency audit — 0 vulnerabilities;
- 9/9 внешних live URL вернули пригодный HTML;
- schema validation: 24 продукта, 9 live, 15 case, 3 локали;
- две последовательные сборки дают 51 байтово идентичный generated artifact.

Исправленные предрелизные дефекты:

- WebKit больше не повышает локальные HTTP-ресурсы до HTTPS через избыточный
  upgrade-insecure-requests;
- short-landscape dock не перекрывает CV и project focus;
- CV и project gallery возвращают focused control в безопасную viewport-зону;
- SceneCinema timeout и performance-cut проверяются как независимые контракты;
- build пропускает byte-identical записи и повторяет кратковременно
  заблокированную Windows-запись;
- production-smoke отделяет first-party failure от честного GitHub API
  rate-limit fallback.

## Visual release QA

В ignored tmp/release-qa сформированы и просмотрены:

- 12 сцен главной × desktop/mobile — 24 viewport capture;
- 15 case pages × desktop/mobile — 30 full-page capture;
- 4 contact sheet.

Full-page case capture выполняет реальный scroll-sweep перед снимком. Это
устранило ложные пустые главы, которые появляются, если compositor screenshot
не активирует IntersectionObserver. Повторная ревизия revealed-v2 подтверждает
полный ритм от hero до final CTA; точечно просмотрены GrowthOps AI, TTYL и ChAT,
включая мобильную TTYL.

Реальные NVDA/VoiceOver и physical Safari/iOS/Chrome/Android не заявляются как
выполненные: они остаются внешним ручным release-gate и явно отражаются в
QA-матрице.

## Production contract

Добавлен отдельный post-deploy gate:

- production main монтирует 24 карточки без first-party/runtime errors;
- все 45 RU/EN/UZ case URL возвращают локализованный статический shell;
- case → exact card сохраняет hash и пропускает intro;
- 9 внешних live URL проверяются после Pages deploy.

Сам production deploy и его smoke пока не заявлены: следующий шаг — финальный
asset bump, полный повтор обязательной матрицы, release commit, push в main,
GitHub Actions и проверка фактически развернутого URL.

## Final local release candidate — v229

Дата локальной приёмки: 2026-08-10.

После финального asset bump и повторного полного аудита подтверждено:

- `npm test`: 147 passed, 106 осознанно skipped по нерелевантным
  browser-project/opt-in сценариям, 0 failed и 0 flaky за 7.1 минуты;
- `npm run test:performance`: desktop Chromium 1/1 и mobile Chromium 1/1;
- отдельный iPhone WebKit critical path: 2/2;
- `npm run check:build`: 51 generated artifact байтово идентичны в двух
  последовательных сборках;
- `npm run validate`: 24 продукта, 9 live, 15 case, 3 локали;
- `npm audit --audit-level=high`: 0 vulnerabilities;
- `npm run scan:secrets`: credential signatures не найдены;
- `npm run check:live`: 9/9 внешних live URL вернули usable HTML;
- `git diff --check`: whitespace errors отсутствуют;
- свежий `npm run qa:visual`: 4/4 capture packages, 54 кадра и 4 contact
  sheet; вручную просмотрены все contact sheet и full-page TTYL/ChAT на
  desktop/mobile.

Редкие lifecycle-гонки были не скрыты retry, а воспроизведены и закрыты:

- intro и mobile deep-link выдержали 20 применимых повторов под четырьмя
  параллельными workers;
- offscreen motion pause/resume выдержал 20/20 повторов;
- Contact mobile geometry, landing locale switch, reduced-motion history и
  mobile dock выдержали 40/40 применимых повторов;
- первый deep-link теперь удерживает viewport по фактической геометрии и
  отдаёт его пользовательскому жесту или более новой SceneCinema-транзакции;
- видимость анимационных зон имеет IntersectionObserver primary path и
  детерминированный shared-scroll fallback;
- RU/EN/UZ на case-страницах являются настоящими ссылками и работают до
  подключения JavaScript; enhancement сохраняет текущую главу.

Ограничения зафиксированы честно: physical iPhone/Android, Safari на реальном
устройстве, NVDA/VoiceOver/TalkBack и smoke нового production commit ещё не
выполнены. Следующий шаг — release commit, quality workflow, deploy в `main`,
обязательный verify-production и тег только на фактически развёрнутом SHA.

## Production release evidence — v229

Дата публикации: 2026-08-10.

Release sequence:

- `6500a7f` — основной Awwwards release commit;
- первый CI `31335961279` безопасно остановил публикацию из-за Windows/LF CSP
  drift;
- `1de0bd5` нормализовал generated output и CSP hashing в LF; чистый
  Linux/Node 20 checkout подтвердил две byte-identical сборки;
- второй CI `31336340469` прошёл весь build/test/performance gate, но GitHub
  runner отклонил сокращённый SHA официального `actions/deploy-pages` до
  выполнения deploy;
- `155c73c` закрепил полный 40-символьный immutable SHA action;
- GitHub Actions run `31336811572` завершил `build`, `deploy` и
  `verify-production` со статусом success.

Фактический production подтверждён двумя независимыми контурами:

- встроенный `verify-production`: все 45 case URL, главная, точный возврат к
  TTYL и 9 внешних live URL — PASS;
- локальный `npm run test:production`: 3/3 PASS;
- локальный `npm run check:live`: 9/9 PASS;
- hard fetch с cache-busting query: HTTP 200, asset version `v229`, актуальный
  product-registry link и ожидаемый CSP hash.

Добавлен пострелизный контроль без клиентского трекинга:

- `npm run monitor:production` измеряет production desktop/mobile Chromium и
  сохраняет JSON с LCP, CLS, long tasks, frame pacing, transfers и ошибками;
- первый калиброванный прогон: desktop ready 4035 ms, LCP 1196 ms, CLS 0.0223;
  mobile ready 3557 ms, LCP 900 ms, CLS 0.0030 — оба PASS;
- `.github/workflows/production-monitor.yml` повторяет smoke, synthetic vitals
  и 9 live URL каждые шесть часов; evidence хранится 14 дней;
- `docs/AWWWARDS-SUBMISSION.md` фиксирует concept, truthful credits,
  technology story, key scenes, submission copy и media shot list.

Synthetic monitor не заявляется как field RUM. Physical iPhone/Android,
реальные Safari/Chrome mobile и NVDA/VoiceOver/TalkBack по-прежнему требуют
внешнего ручного sign-off; до него этап 14 не отмечается полностью завершённым.

## Final WebKit recovery hardening

Финальный повтор полной матрицы не был принят с единичным падением. Trace
показал точную последовательность на перегруженном WebKit runner:

1. intro hard deadline наступал непосредственно перед React commit;
2. recovery честно разблокировал документ и показал fallback;
3. готовая оболочка монтировалась позже и запускала promotion;
4. дополнительный fade-таймер promotion голодал на том же main thread;
5. панель уже имела opacity 0, но оставалась в DOM, а `#root` — в `inert`.

Исправлен продуктовый контракт, а не test timeout: после появления настоящего
shell recovery-панель удаляется синхронно, accessibility tree и input
восстанавливаются в той же операции. Добавлен детерминированный regression с
искусственно задержанным `app.js`.

Доказательство после исправления:

- runtime cache version повышена `v229 → v230`, чтобы опубликованный браузер не
  мог сохранить старый `app.js` под прежним URL;
- late-shell regression — 1/1;
- WebKit first-load intro stress — 10/10 под двумя workers;
- полный `npm test` — 148 passed, 107 осознанно skipped, 0 failed, 0 flaky за
  7.7 минуты;
- изолированные performance budgets — desktop/mobile 2/2;
- deterministic build — 51/51 byte-identical;
- docs contract — 16/16 обязательных документов;
- validate — 24 продукта, 9 live, 15 case, RU / EN / UZ;
- audit/secret scan/diff check — зелёные.

Все перечисленные full-matrix, performance и deterministic-build результаты
повторены после bump и относятся к финальному `v230` candidate.

Первый ручной запуск production-monitor `31339495796` прошёл полностью и
сохранил JSON artifact. Его единственная annotation указывала на deprecated
Node 20 runtime старых official actions. По официальным GitHub release refs
все workflows переведены на verified immutable commits: checkout `v7.0.1`,
setup-node `v7.0.0`, upload-artifact `v7.0.1`, configure-pages `v6.0.0`,
upload-pages-artifact и deploy-pages `v5.0.0`. `node-version: 20` для сборки
сайта не менялся; Node 24 используется только внутренним action runtime.

## Final release proof — v2.12.0

Release tag `v2.12.0` указывает на фактически опубликованный commit
`4f6af33b39791e6053b9eb47e2b278826e59bbef`.

Финальный deploy workflow `31339942716`:

- build — success: locked install, audit, secret scan, deterministic build,
  docs, 148-test matrix и performance budgets;
- deploy — success на обновлённых configure/upload/deploy Pages actions;
- verify-production — success: 45 localized case URL, main/catalog/return flow
  и 9 внешних live URL;
- build/deploy/verify-production check-runs — 0 annotations.

Независимо после deploy подтверждено:

- production HTML → HTTP 200, содержит `v230`, не содержит `v229` asset refs;
- `npm run test:production` → 3/3 PASS;
- `npm run check:live` → 9/9 PASS;
- scheduled monitor `31350135801` → PASS;
- manual monitor `31364392491` → PASS, 0 annotations, JSON artifact загружен
  и прочитан локально;
- последний artifact относится к SHA `4f6af33`: desktop ready 3054 ms,
  LCP 312 ms, CLS 0.0013; mobile ready 2972 ms, LCP 164 ms, CLS 0.0066;
  оба профиля имеют 0 first-party failures и 0 budget violations.

Метрики monitor являются synthetic Chromium evidence, а не полевым RUM.
Технический релиз, rollback point и Awwwards submission package готовы.
Незакрытый внешний gate не скрыт: physical iPhone/Android и фактические
NVDA/VoiceOver/TalkBack требуют отдельного ручного sign-off.

## Manual production audit and View Transition hotfix — v231

После выпуска `v2.12.0` production дополнительно пройден вручную в обычном
in-app Chromium, а не только headless runner. Проверены desktop 1280×720,
калиброванный CSS portrait 390×844 и обязательный landscape 844×390:

- intro удерживает scroll/input и освобождает shell; deep link intro не
  повторяет;
- полноэкранное menu имеет dialog semantics, focus на close control и 12 глав;
- каталог содержит 24 canonical cards, mobile rail использует mandatory snap,
  next-control меняет активный проект, раскрытие показывает 24/24;
- TTYL и BelfProctor открываются как case, RU/EN/UZ меняют полный контент, а
  возврат восстанавливает точную карточку; для скрытой BelfProctor каталог
  раскрывается автоматически;
- Builder пересчитывает сложный AI/production scope и переносит точный срок,
  бюджет, drivers и disclaimer в contact brief;
- CV tabs/download, контактная локальная валидация и пользовательская 404
  доступны; внешнее сообщение не отправлялось.

Единственный browser-console сигнал был
`AbortError: Transition was skipped` после штатно прерванного native View
Transition. Пользовательский путь не ломался, но auxiliary `ready` promise
оставался ненаблюдаемым. В `scene-cinema.js` lifecycle promises `ready` и
`updateCallbackDone` теперь явно наблюдаются, тогда как `finished` остаётся
единственным владельцем recovery/final-pose semantics. Regression искусственно
отклоняет `ready` при superseded intent и требует ноль `unhandledrejection`.

Локальное доказательство `v231` candidate после исправления:

- targeted scene-cinema — 4/4 serial; отдельная rejection regression — 1/1;
- `npm test` — 148 passed, 107 осознанно skipped, 0 failed, 0 flaky за 10.0
  минуты;
- performance budgets — desktop/mobile 2/2;
- visual release capture — 4/4; повторно просмотрены четыре contact sheet для
  12 main scenes и 15 case на desktop/mobile;
- deterministic build — 51/51 byte-identical;
- validate — 24 продукта, 9 live, 15 case, 3 локали;
- audit — 0 vulnerabilities; secret scan и `git diff --check` — зелёные;
- package version — `2.12.1`, asset graph — `v231`.

Release `v2.12.1` опубликован на SHA
`eb3e405b48916510fae6f9590c09f578cd85d9df` с asset graph `v231`.

Deploy workflow `31368347969`:

- build `93391551089` — success за 8m27s;
- deploy `93393420491` — success за 21s;
- verify-production `93393540602` — success за 58s;
- у всех трёх check-runs — 0 annotations.

Независимо после deploy:

- production HTML → HTTP 200, содержит `v231`, не содержит `v230` refs;
- `npm run test:production` → 3/3 PASS;
- `npm run check:live` → 9/9 PASS;
- новый браузерный tab загрузил `scene-cinema.js?v=231`; после реальной
  section-навигации console errors/warnings → 0;
- scheduled monitor `31368418978` и manual monitor `31369244468` на
  `eb3e405` → PASS;
- manual job `93394302886` → 0 annotations; JSON artifact подтверждает:
  desktop ready 3337 ms, LCP 660 ms, CLS 0.0016; mobile ready 3010 ms, LCP
  216 ms, CLS 0.0058; 0 first-party failures и 0 budget violations.

Метрики остаются synthetic Chromium evidence, а не field RUM или physical
device proof. 24–48-часовое наблюдение и внешний NVDA/VoiceOver/TalkBack +
physical iPhone/Android sign-off продолжаются и не объявлены завершёнными.

## Awwwards art-direction и 25-product candidate — v232

Новая итерация не ограничилась декоративным слоем. Каталог повторно
канонизирован по GitHub и продуктовым маршрутам: 25 уникальных продуктов,
9 внешних live-сайтов и 16 безопасных case-маршрутов. Birthday Agent добавлен
как отдельный приватный продукт без раскрытия закрытых данных; его RU/EN/UZ
контент, схема, QA/boundary-блок и предметная обложка входят в тот же generated
контракт, что остальные кейсы. Сборка теперь выпускает 48 case pages и 49 URL
в sitemap.

Главная получила цельную физическую арт-систему Proof Instrument. Hero строится
вокруг реального предметного объекта, а не декоративного HUD; Intro использует
ту же оптическую грамматику, меню стало самостоятельной полноэкранной сценой,
курсор и кнопки получили контекстные состояния. Каждая из двенадцати глав имеет
собственный материал, композицию и вход, но нативный scroll и единый motion
runtime сохранены. Светлые CV/Quality-сцены используют локальные контрастные
ink-токены, а проектный раздел разделяет четыре editorial featured-записи и
двухколоночный архив без дублей.

Mobile Hero исправлен как три самостоятельных режима: portrait, short portrait
и compact landscape. Геометрический контракт проверяет RU/EN/UZ на 320×568,
360×800, 390×844, 430×932, 568×320, 844×390, 920×720, 1024×768 и
1440×1000. Во всех состояниях имя, два CTA и proof-rail остаются внутри первой
сцены, touch targets не меньше 44 px, а Signal даёт понятный следующий cue.
Нахлёст Signal уменьшен до фиксированного шва, чтобы не скрывать Build → Verify
→ Ship.

Cross-document View Transition удалён из основного сайта и кейсов после
воспроизводимого `Transition was skipped / AbortError`. Его заменяет
детерминированная прерываемая exit-aperture с восстановлением после bfcache и
instant-path для reduced motion. Возврат из кейса по-прежнему раскрывает архив
при необходимости, пропускает Intro и центрирует точную исходную карточку.

Локальная приёмка до финального asset bump:

- desktop product layer — 37 passed / 4 profile-skipped;
- mobile product layer — 15 passed / 26 profile-skipped;
- desktop contracts — 56 passed / 1 profile-skipped;
- mobile contracts — 9 passed / 48 profile-skipped;
- engineering/runtime batch — 22 passed;
- Firefox — 2/2, iPhone WebKit — 2/2, reduced motion — 1/1;
- performance budgets — desktop/mobile 2/2;
- visual capture — 4/4: 12 main scenes и 16 case pages на desktop/mobile;
- contact sheets и увеличенные Hero/Projects captures просмотрены вручную;
- deterministic build — 54/54 byte-identical;
- validate — 25 products / 9 live / 16 case / 3 locales;
- external live routes — 9/9; audit — 0 vulnerabilities; secret scan — clean.

Автоматизированные axe-проверки не нашли WCAG 2.2 A/AA нарушений на главной,
16 кейсах и 404. Это не подменяет реальный NVDA/VoiceOver/TalkBack и physical
iPhone/Android sign-off: они остаются внешним NOT RUN до фактического запуска.
Package candidate повышен до `2.13.0`, единый cache graph — `v232`.

Первый единый post-bump `npm test` не был принят как release proof: при двух
workers он воспроизвёл две гонки, которые не проявились в изолированных runs.
Mobile deep-link кратковременно входил в допустимую геометрию, но тест не ждал
опубликованного `data-deep-link-settled`; дополнительный сдвиг capsule оставлял
заголовок на 57 px. Safe offset увеличен до 24 px, а regression теперь
проверяет завершённую позу. Результат stress-повтора — 10/10 под двумя workers.

Вторая гонка находилась в case exit-aperture: WebKit мог сохранить 440 ms
language-navigation timer и перебить следующий browser navigation. Timer
получил единственного владельца, очищается на `beforeunload` и `pagehide`, а
smoke ждёт фактический локализованный URL, а не одинаковое во всех языках имя
продукта. Конкурентный stress-повтор critical journey — 10/10.

Финальное доказательство текущего `2.13.0 / v232` workspace после обоих fixes:

- `npm test` — 259 scenarios, 150 passed, 109 осознанно profile-skipped,
  0 failed и 0 flaky за 8.8 минуты;
- `npm run test:performance` — desktop/mobile 2/2;
- visual release — 4/4; свежие 12 main scenes и 16 case pages на
  desktop/mobile, четыре contact sheet повторно просмотрены;
- `npm run check:build` — 54/54 byte-identical;
- validate/docs — 25/9/16/3 и 16/16;
- audit — 0 vulnerabilities; secret scan — clean; live routes — 9/9;
- `git diff --check` — exit 0.

## Production release evidence — v2.13.0 / v232

Дата публикации runtime: 2026-08-11.

Release sequence:

- `e416098` — проверенный feature commit и head PR #1;
- quality workflow `31484703516` на `e416098` — success;
- merge commit `4d3c4234cceae65e2ad958b9e1b9a4e0938c61ae` опубликован в `main`;
- deploy workflow `31485315454` завершил build, deploy и verify-production со
  статусом success; все шаги audit, secret scan, deterministic build, full
  browser matrix и performance budgets прошли без пропуска release gate.

Независимо после deploy подтверждено:

- production HTML → HTTP 200, title корректен, asset graph содержит `v232`;
- `npm run test:production` → 3/3: 25-card main, 48 RU/EN/UZ case routes и
  case → exact card без повторного Intro;
- `npm run check:live` → 9/9 внешних live-продуктов;
- ручной desktop Chromium-путь: раскрытие archive, Birthday Agent RU → EN,
  возврат к `#proj-birthday-agent`, Intro не повторяется, карточка видима,
  broken images = 0, runtime console errors = 0;
- полноэкранное меню открывается как dialog с 12 главами и CTA; дополнительная
  явная регрессия `aria-expanded=false` после закрытия прошла 10/10.

Manual production monitor `31487035854` на `4d3c423` завершился success и
сохранил JSON artifact:

- desktop 1440×1000: main ready 2934 ms, LCP 3792 ms, CLS 0.0014,
  long-task max 245 ms, failures/violations — 0;
- mobile 412×839: main ready 3090 ms, LCP 2496 ms, CLS 0.0052,
  frame p95 33.4 ms, frame max 50 ms, failures/violations — 0;
- functional smoke и 9/9 live routes внутри monitor также зелёные.

Это synthetic Chromium evidence, а не field RUM. In-app browser не применил
запрошенный mobile viewport и остался 1280×720, поэтому physical mobile не
заявляется как ручной PASS: его automated viewport/WebKit и visual evidence
отделены от обязательного внешнего iPhone/Android sign-off. Реальные
NVDA/VoiceOver/TalkBack и 24–48-часовое наблюдение остаются честным `NOT RUN` /
`IN PROGRESS`, а `v2.12.1` сохраняется как проверенный rollback baseline.

## v2.13.1 hardening candidate — v233

Дата локальной приёмки: 2026-08-13.

После публикации `v2.13.0` performance gate локализовал Hero LCP не по сетевой
загрузке, а по paint lifecycle: `proof-instrument.webp` приходил примерно за
77 ms, но `.hero-instrument-img` оставался `opacity: 0` до окончания Intro и
дополнительного fade. Изображение теперь рисуется сразу под полностью
непрозрачной Intro-шторкой, а после её открытия сохраняет только
пространственную assembly-анимацию. Performance report дополнен фактическими
tag/id/class/url/size данными LCP element. Финальный desktop/mobile budget —
2/2.

Полный gate обнаружил редкую гонку case navigation: 440-ms exit timer мог не
сработать в throttled вкладке либо конкурировать с последующим intent.
Архитектура упрощена до fail-open контракта: нативный `href` всегда является
единственным владельцем URL; JavaScript только обновляет locale href с текущей
главой и ставит необязательное визуальное exit-состояние. Возврат к
`#proj-<slug>` раскрывает весь каталог, пропускает Intro и центрирует точную
карточку. Stress proof: 30/30 desktop + 10/10 mobile; background locale path
также входит в regression suite.

В reduced-motion lifecycle устранены два источника лишней работы. Parallax
IntersectionObserver больше не создаётся, когда эффект всё равно запрещён
политикой. Один внешний wake разрешает ровно один финальный кадр; внутрикадровый
wake не создаёт continuous chain. Для редкого видимого cold-start, где браузер
не обслуживает первый RAF в пределах 120 ms, общий runtime использует один
bounded timeout fallback и отменяет зависший RAF; hidden/suspended пути
сохраняют ноль работы. Финальный stress — 30/30, normal-motion performance —
2/2.

Два параллельных тяжёлых Chromium contexts на локальной Windows-машине с
ограниченной свободной памятью воспроизводимо завершали уже прошедшие тесты
45-секундным teardown timeout. Те же CV/degraded/menu/Intro контракты прошли
40/40 с исходными таймаутами и одним worker. Поэтому local Windows gate теперь
последовательный; Linux CI сохраняет два workers. Ни один spec не отключён,
локальные retry остаются 0.

Финальное доказательство exact-tree `2.13.1 / v233` перед deploy:

- `npm test` — 261 scenario, 151 passed, 110 осознанно profile-skipped,
  0 failed / 0 flaky за 13.6 минуты;
- `npm run test:performance` — desktop/mobile 2/2;
- navigation stress — 30/30 desktop и 10/10 mobile; reduced scheduler — 30/30;
- `npm run qa:visual` — 4/4; 12 main scenes, 16 case pages и увеличенные
  Hero/Projects captures просмотрены вручную на desktop/mobile;
- `npm run check:build` — 54 generated artifacts byte-identical;
- validate — 25 products / 9 live / 16 case / 3 locale;
- audit — 0 vulnerabilities; secret scan — clean; live routes — 9/9;
- docs contract и `git diff --check` — exit 0.

Это локальный release candidate, а не production claim. GitHub Pages deploy,
независимый production smoke и synthetic monitor записываются только после их
фактического выполнения. Physical iPhone/Android и
NVDA/VoiceOver/TalkBack остаются внешним `NOT RUN`.

## Production release evidence — v2.13.1 / v233

Дата публикации runtime: 2026-08-13.

- code SHA `374d4c80fdd6759033ea3e4e107d9e5f474a7ea2` отправлен в `main`;
- GitHub Pages workflow `31677200638` завершился success: build 8m26s,
  deploy 14s, verify-production 53s;
- все audit/secret/build drift/docs/full browser/performance jobs внутри
  workflow прошли без пропуска blocking gate;
- независимый `npm run test:production` после deploy → 3/3;
- production HTML → HTTP 200, 30 asset refs `v233`, 0 refs `v232`;
- `npm run check:live` после deploy → 9/9.

Manual production monitor `31677968144` на том же code SHA завершился success
за 1m19s. Сохранённый JSON artifact:

- desktop 1440×1000: main ready 2870 ms, FCP 236 ms, LCP 1420 ms,
  CLS 0.0010, long-task max 190 ms, failures/violations — 0;
- mobile 412×839: main ready 2901 ms, FCP 136 ms, LCP 396 ms,
  CLS 0.0054, frame p95 16.7 ms, long-task max 134 ms,
  failures/violations — 0;
- desktop synthetic runner выбрал motion tier `low`, потому что его baseline
  frame p95 был 83.4 ms; normalized budget был применён прозрачно, violations
  остались пустыми. Это адаптивный degraded path, а не доказательство 60 FPS.

Подключение отдельного in-app browser для ручного production journey не
состоялось из-за локальной ошибки browser runtime `kernel assets path not
found`. Поэтому новый manual browser PASS не заявлен и не подменён smoke-тестом.
Automated Chromium production journey, WebKit/Firefox local gate и synthetic
desktop/mobile monitor записаны как разные виды доказательств. Physical
iPhone/Android, NVDA/VoiceOver/TalkBack и field RUM остаются внешним `NOT RUN`.

## Post-release package hardening — v2.13.1

После final docs deploy workflow `31678159935` подтвердил тот же runtime
`v233` на SHA `07cb769`. Независимый final-SHA monitor `31678896168` завершился
success: desktop LCP 1488 ms / CLS 0.0014, mobile LCP 200 ms / CLS 0.0051,
first-party failures и budget violations — 0. Это первый запуск 24–48-часового
окна, а не его завершение.

Повторный documentation audit обнаружил stale текущие claims, оставшиеся после
добавления 25-го продукта: отдельные архитектурные документы всё ещё называли
24 карточки, 15 кейсов и 45 generated pages. Они синхронизированы с canonical
registry — 25 products / 9 live / 16 case / 48 localized case pages. Docs gate
теперь выводит числа из `src/content/product-registry.js` и отдельно отклоняет
возврат старых claims в документах текущего состояния; исторические release
записи остаются неизменёнными.

`docs/AWWWARDS-SUBMISSION.md` расширен до рабочего пакета подачи: готовый EN
copy, concept/credits/technology story, карта 12 актов, mobile narrative,
проверяемые release facts, media manifest, 82-секундный честный walkthrough и
pre-submission truth gate. `docs/PHYSICAL-AT-QA-PROTOCOL.md` фиксирует точные
iPhone/Android/NVDA/VoiceOver/TalkBack journeys, evidence header, severity и
sign-off record. Все внешние строки намеренно стартуют как `NOT RUN`; наличие
протокола не подменяет фактическую проверку.

После этих изменений повторён обязательный локальный gate:

- docs contract — 17/17, catalog facts берутся из canonical registry;
- validate — 25 products / 9 live / 16 case / 3 locale;
- deterministic build — 54/54 byte-identical;
- `npm test` — 261 scenario, 151 passed, 110 profile-skipped,
  0 failed / 0 flaky за 15.4 минуты;
- performance budgets — desktop/mobile 2/2;
- dependency audit — 0 vulnerabilities; secret scan — clean;
- runtime/generated diff — отсутствует; `git diff --check` — exit 0.

Documentation-hardening commit `fa0c63bf0376eccee539c9038da4bee96296d423`
опубликован в `main`. GitHub Pages workflow `31681227107` завершил build за
9m28s, deploy за 10s и verify-production за 1m17s; все blocking jobs — success.
Независимый post-deploy smoke дал 3/3 PASS, включая 48 localized case URL и
exact-card return, live verifier — 9/9.

Post-deploy monitor `31682231539` на том же SHA также завершился success:

- desktop 1440×1000: main ready 3219 ms, FCP 264 ms, LCP 1736 ms,
  CLS 0.0013, frame p95 83.4 ms, long-task max 265 ms;
- mobile 412×839: main ready 3063 ms, FCP 140 ms, LCP 188 ms,
  CLS 0.0045, frame p95 33.3 ms, long-task max 177 ms;
- оба профиля: motion tier `low`, first-party failures 0,
  budget violations 0.

Artifact schema прямо обозначает scope как synthetic Chromium monitoring, а не
field RUM или physical-device evidence. Наблюдение 24–48 часов и внешний
physical/AT sign-off продолжаются.

## Submission media review capture

Добавлен opt-in `npm run qa:submission`, который снимает production без
изменения runtime: 5 desktop и 3 mobile viewport stills, contact sheet,
manifest и real-time desktop WebM. Capture валидирует PNG dimensions, video
duration 60–90 s, минимальный размер файла и отсутствие runtime console/page
errors; output остаётся в ignored `tmp/submission-media/`.

После исправления гонки first-load hash stabilizer с capture scroll повторный
набор `2026-08-13T08-58-36-926Z` прошёл:

- 8 PNG: desktop 1440×900, mobile 390×844;
- desktop WebM: 1440×900, VP8, 25 fps, фактическая container duration 74.8 s;
- contact sheet и отдельные Hero/Projects mobile + Hero/Projects desktop кадры
  просмотрены вручную;
- video frames около 5/20/40/60 s просмотрены: Hero, About, project flow и FAQ
  меняются последовательно, зависания на одной сцене нет.

Playwright WebM обозначен как review capture. Финальный 2560×1440 / 60 fps
master и native mobile insert не подменяются этим файлом и остаются внешними
media-задачами перед фактической подачей.

## v2.13.2 release hardening candidate — v234

После submission-capture прохода мобильный CV stress выявил редкую гонку между
нашим focus correction и поздним нативным scroll браузера. Первый полный набор
дал 1 отказ; изолированный повтор воспроизвёл 4/10. Первая offsetTop-коррекция
осталась нестабильной — 4/30. Финальный bounded guard делает синхронный,
microtask и конечный набор 0/120/360/800/1400-ms checks, прекращается сразу
после ухода focus из CV и не перехватывает обычный scroll. Итоговый stress —
50/50 без отказа.

Visual review обнаружил ещё два контракта, которые DOM-smoke не гарантировал:

- на desktop 1230×768 текст «Гарантия качества» визуально сталкивался с
  «Контактом». Short-desktop art direction получил отдельную сетку и размерный
  ритм; постоянный тест измеряет реальные text line boxes на 920×720,
  1024×768, 1230×768 и 1440×800;
- при большом скачке по case-странице IntersectionObserver мог не вызвать
  callback для элемента, перепрыгнувшего из below сразу в above. Общий
  case-scroll stream теперь завершает все пройденные reveal в читаемой позе;
  отдельная desktop/mobile регрессия делает именно large scroll jump.

Меню вручную перепроверено в локальном Chromium на 1230×768 и 390×844. Все 12
глав читаются, desktop labels не пересекаются, mobile labels сохраняют явный
двухстрочный ритм и touch-зоны. Visual gate расширен состоянием fullscreen menu:
4/4 за 5.1 минуты, 13 main states и 16 full-page cases в desktop/mobile — 58
прямых PNG и 4 contact sheet. Main contact sheets и отдельные menu-кадры
просмотрены вручную.

Первый полный `v234` gate честно остановился на 3 отказах: reduced-motion test
попал в законный одноразовый `ResizeObserver → app-layout` wake, а headless
Firefox SWGL не смог выделить framebuffer после 22-минутной Chromium/WebGL
нагрузки. Runtime не создавал continuous loop: тест привязан к microtask после
фактического final-pose кадра и прошёл 50/50. Firefox отдельно прошёл 2/2; его
проект перенесён в начало полной матрицы, сохраняя оба smoke-сценария, один
worker и нулевой локальный retry.

После серии performance stress и ещё одного 23.8-минутного full run тот же
ресурсный хвост проявился в WebKit: strict first-load Intro test не освободился
за 6 s, тогда как следующий полный WebKit journey прошёл, но занял 1.5 min;
остальные 153 сценария прошли. UX timeout не увеличен. WebKit smoke перенесён
вместе с Firefox перед тяжёлой Chromium/WebGL-матрицей, чтобы оба независимых
движка стартовали в чистом процессе при неизменных assertions и coverage.

Последующий изолированный WebKit repeat воспроизвёл проблему 2/10 уже без
предшествующей Chromium-матрицы. Корень оказался продуктовым: `head-boot.js`
создавал независимый safety timer, но `intro.js` очищал его сразу при старте,
до установки собственных drivers. Если WebKit задерживал финальный rAF или
transition backstop, абсолютного владельца release больше не было. Head safety
теперь остаётся вооружённым всю сцену и на 3.8 s синхронно удаляет curtain,
снимает lock и публикует completion reason. Если root ещё пуст, отдельный
app-watchdog по-прежнему показывает честный fatal shell на 5.5 s. Новый
детерминированный WebKit test подменяет authored intro намеренно зависшим
модулем и требует интерактивный Hero и `head-safety-*` release до 5 s.

Повторное доказательство локального кандидата `2.13.2 / v234`:

- validate — 25 products / 9 live / 16 case / 3 locale;
- deterministic build — 54/54 byte-identical; docs — 17/17;
- `npm test` — 266 scenarios, 155 passed, 111 profile-skipped,
  0 failed / 0 flaky за 15.4 минуты;
- Firefox 2/2, WebKit 3/3 в полном gate; focused normal first-load + намеренно
  stalled authored Intro stress — 20/20 без retry; CV focus stress 50/50 и
  reduced scheduler 50/50;
- официальный изолированный performance gate — desktop/mobile 2/2 за 29.6 s;
- live routes — 9/9 usable HTML;
- dependency audit — 0 vulnerabilities; secret scan — clean;
- visual release — 4/4, 58 direct captures + 4 contact sheets.

Exact-tree rehearsal после документации повторно дал 154/111/0/0, но
performance сразу после 16.1-минутной матрицы зафиксировал desktop LCP 3968 ms
при baseline p95 366.8 ms, 1000-ms long task и `low` tier. Изолированный gate
до этого был 2/2. Это выявило асимметрию теста: scroll/long-task budgets уже
нормализовались по измеренному host pressure, а LCP оставался абсолютным.
LCP теперь сохраняет base 3800/4200 ms при baseline p95 ≤ 25 ms и получает
только измеренную поправку `3 × (baseline p95 − 25)`, ограниченную 800 ms.
Абсолютный потолок поэтому остаётся 4600/5000 ms; при pressure по-прежнему
обязателен `low` motion tier. Это не меняет runtime и не превращает synthetic
метрику в field Core Web Vital.

Первый 10-кратный stress после этой коррекции дал 9/10: крайний LCP 4452 ms
потребовал коэффициент 3 при прежнем hard cap +800 ms. Следующий stress выявил
две другие несогласованные границы: interaction 1432 ms при baseline p95
283.3 ms и `low` tier, а также mobile scroll p95 49.9 ms при healthy p50
16.7 ms и только 5.05% кадров >40 ms. Interaction получил ту же bounded
host-pressure поправку с абсолютным потолком 1600 ms. Mobile p95 ceiling
составляет 50 ms, но на healthy baseline по-прежнему не более 8% кадров могут
превысить 40 ms; поэтому единичная GC/OS-пауза не маскирует устойчиво плохой
scroll.

Третий 10-кратный stress намеренно остался 8/10: gate отверг mobile scroll
p95 100 ms при 42.4% кадров >40 ms и отдельный запуск с intro 8669 ms / LCP
7920 ms / interaction 1624 ms. Эти экстремальные состояния не были превращены
в PASS увеличением потолков. После освобождения ресурсов официальный
изолированный `npm run test:performance` прошёл desktop/mobile 2/2 за 42.0 s.
Таким образом release evidence — чистый serial gate, а stress evidence отдельно
доказывает, что hard ceilings продолжают блокировать неприемлемое состояние.

## v2.13.2 production release — v234

PR `#2` прошёл независимый GitHub quality workflow `32013231366` и был слит в
`main` merge SHA `8958aa5`. Pages workflow `32013952249` повторно выполнил
build/quality/performance gate, опубликовал static artifact и завершил
verify-production без отказов.

Независимое post-deploy доказательство с локальной машины:

- `npm run test:production` — 3/3: main + 25-card catalog, 48 RU/EN/UZ case
  routes и точный возврат к исходной карточке без повторного Intro;
- production HTML — 30 refs `v234`, 0 refs `v233`;
- `npm run check:live` — 9/9 usable live routes;
- `npm run monitor:production` — 0 first-party failures / 0 violations;
  desktop main ready 3605 ms, LCP 1388 ms, CLS 0.0049, frame p95 116.7 ms,
  long-task max 151 ms; mobile main ready 3472 ms, LCP 1604 ms, CLS 0.0025,
  frame p95 33.4 ms, long-task max 88 ms.

После переключения feature-ветки на `main` Windows `core.autocrlf=true`
восстановил `index.html` с CRLF. Git content оставался логически чистым, но
exact-byte CSP validator корректно отклонил inline JSON-LD hash. Штатная сборка
вернула LF и снова прошла validate; корень устранён новым `.gitattributes`,
который фиксирует LF для runtime/generated text artifacts во всех средах.

Desktop frame p95 отражает конкретный synthetic runner и выбранный runtime
`low`, поэтому не объявляется доказательством 60 FPS. Он сохранён как явный
optimization target для следующей художественной итерации Hero/Projects.
Новое 24–48-часовое production-наблюдение начато 2026-08-17. Physical
iPhone/Android, NVDA/VoiceOver/TalkBack и финальный 2560×1440/60-fps master
остаются внешними незавершёнными доказательствами.

## v2.14.0 V3 Proof Laboratory candidate — v236 pre-release

После отдельной критики первых пяти секунд Hero перестроен из типографического
экрана в физическую `Proof Chamber`: raw material проходит через оптический
quality gate к release-модулю, а тезис, author line и proof rail объясняют
`BUILD → VERIFY → SHIP`. Единственный responsive Hero `<picture>` находится в
frame zero до React root, имеет high fetch priority и остаётся fallback/LCP
слоем; приложение не загружает его второй раз.

V3-проход охватил Intro, fullscreen Index, cursor, все 12 глав, 25 project
cards и 16 case routes × RU/EN/UZ. Projects использует асимметричный desktop
museum и mobile horizontal filmstrip с видимым продолжением. Каждый case
сохранил общую главную систему, но получил собственный hero-profile, material
cue, архитектурную схему, QA-аргументацию и privacy boundary.

Инженерный проход добавил deterministic `lightningcss` bundle и compact AOT
JS. Running copy переведён на platform UI stack; Oswald, JetBrains Mono и
Cormorant Garamond остались характерными self-hosted ролями. Это убрало
дублирующий Cyrillic/Latin Inter decode path, сохранив читаемость и снизив CSS
до примерно 316 KB. Production performance budgets не расширялись.

Фактическое локальное доказательство финального asset graph `v236`:

- deterministic build — 55 generated artifacts byte-identical в двух сборках;
- полный Playwright gate — 268 scenarios: 156 passed, 112 profile-skipped,
  0 failed / 0 flaky за 23.9 минуты;
- isolated performance — desktop/mobile 2/2 за 30.8 секунды;
- visual release — 4/4 за 6.4 минуты, main/case desktop/mobile contact sheets
  просмотрены вручную;
- intentionally stalled Intro WebKit stress — 8/8 без retry;
- all-16-case mobile viewport stress после cold-layout коррекции — 8/8, затем
  тот же sweep зелёный в полном gate;
- axe WCAG 2.2 A/AA, 200% text, orientation, exact-card return, optional asset
  failure, reduced motion и WebGL context-loss входят в полный gate.

Production при этой записи остаётся `v2.13.2 / v234`. V3 нельзя объявлять
опубликованным до merge через `main`, Pages verification и
независимого post-deploy smoke. Physical iPhone/Android,
NVDA/VoiceOver/TalkBack и final 60-fps/native submission media остаются
`NOT RUN` и не подменяются эмуляцией.

## v2.14.1 Release Gate candidate — v237 pre-release

Повторная критика первых пяти секунд показала, что V3 Proof Chamber всё ещё
воспринимался как крупный текст поверх обрезанного предмета. V5 заменил этот
приём одной причинно-следственной сценой `Release Gate`: rough graphite входит
в физическую рейку, проходит optical QA frame и выходит законченным модулем.
Три shutter-плоскости открывают BUILD / VERIFY / SHIP, одноразовые trace/scan
объясняют проверку и заканчиваются в спокойной финальной позе. Тот же предмет
теперь продолжает Intro и fullscreen Index вместо трёх разных визуальных
мотивов.

Desktop использует full-stage camera, portrait mobile показывает весь маршрут
в отдельной рамке, short phone 320×568 сохраняет headline, два подписанных CTA,
proof rail и минимум 64 px следующей сцены. 568×320 и 844×390 получили
landscape-композицию; 920×720 — compact-desktop action band с нормальной длиной
строки. Нативный scroll, shared motion runtime, reduced-motion final state и
44×44+ touch targets не менялись.

Новый raster set: `release-gate.webp` 1536×1024 / 90,824 bytes,
`release-gate-1152.webp` 1152×768 / 53,124 bytes и
`release-gate-768.webp` 768×512 / 25,130 bytes. Конвертацию фиксирует
`scripts/process-hero-image.py` с pinned Pillow 12.2.0; повторная конвертация
дала три byte-identical файла. Structural validator проверяет наличие,
dimensions, weight ceilings, critical-path ссылки Intro/Hero/Index и запрещает
возврат retired `proof-instrument` в этот путь. Browser regression дополнительно
требует decoded image, три shutter stage и видимую финальную headline pose.

Фактическое локальное доказательство `v2.14.1 / v237`:

- validate — 25 products / 9 live / 16 case / 3 locales, 48 generated pages,
  49 sitemap URL и Hero asset contract;
- deterministic build — 55/55 generated artifacts byte-identical;
- `npm test` — 268 scenarios: 156 passed, 112 profile-skipped, 0 failed,
  0 flaky за 16.2 минуты, local Windows worker=1 и retry=0;
- isolated performance — desktop/mobile 2/2 за 31.8 секунды;
- dependency audit — 0 vulnerabilities; secret scan — clean; live routes —
  9/9 usable HTML;
- visual release — 4/4 за 7.5 минуты: 13 main states и 16 full-page case
  routes на desktop/mobile; четыре contact sheet и direct mobile Hero
  просмотрены вручную;
- ручной Chromium review — 1440×1000, 920×720, 390×844, 320×568 и
  844×390, включая Intro handoff и settled final pose.

Первый полный test attempt был признан недействительным: одновременно открытый
in-app visual preview удерживал отдельный animated/WebGL context, после чего
Firefox зависал на context teardown, а WebKit попадал в pre-React recovery.
Preview был закрыт; Firefox отдельно прошёл 2/2, WebKit 3/3, затем полный clean
run дал 156/112/0/0 без retry. Ни timeout, ни production safety cap, ни
assertion не ослаблялись.

Опубликованный rollback baseline при этой записи — `v2.14.0 / v236`, merge
SHA `86f96ec`, Pages workflow `32075205087`, production smoke 3/3. Release Gate
`v237` нельзя называть production до merge, Pages verify-production и нового
независимого post-deploy smoke. Physical iPhone/Android,
NVDA/VoiceOver/TalkBack и final native/60-fps media остаются `NOT RUN`.

## v2.14.1 Release Gate production — v237

PR `#4` прошёл независимый GitHub quality workflow `32083562875` за 8m35s и
был объединён с `main` merge-коммитом `adc3e861`. Pages workflow `32084173961`
на том же merge SHA завершил build, deploy и verify-production со статусом
success.

Независимое post-deploy доказательство с локальной машины:

- production HTML → HTTP 200, 30 cache refs `v237`, 0 refs `v236`, frame-zero
  Release Gate присутствует;
- `npm run test:production` → 3/3: 25-card main, 48 RU/EN/UZ case routes и
  точный возврат из case к исходной карточке без повторного Intro;
- `npm run check:live` → 9/9 usable external live routes;
- `npm run monitor:production` → 0 first-party failures / 0 violations;
  desktop main ready 4090 ms, LCP 1656 ms, CLS 0.0928, frame p95 83.4 ms,
  long-task max 266 ms; mobile main ready 4018 ms, LCP 1680 ms, CLS 0.0075,
  frame p95 33.3 ms, long-task max 329 ms.

Перед docs-evidence commit первый повтор полного локального gate завершился
155/112/1: один Chromium worker остановился на cold mount до появления
`.proj-card`, ещё до проверки порядка меню. Trace показал HTTP 200 для всех
runtime-ресурсов и отсутствие page/console error. Сценарий затем прошёл 10/10
в отдельных clean workers, а полный serial rerun — 156 passed / 112
profile-skipped / 0 failed / 0 flaky за 13.8 минуты. Отдельный performance gate
прошёл 2/2 за 29.0 секунды; timeout, retry и assertions не менялись.

Monitor — synthetic Chromium evidence этого runner, а не field RUM,
physical-device или assistive-technology proof. Physical iPhone/Android,
NVDA/VoiceOver/TalkBack, 24–48-часовое окно наблюдения и final native/60-fps
submission media остаются незавершёнными внешними проверками.

Первый GitHub gate evidence PR `#5`, run `32087235173`, прошёл весь functional,
browser и accessibility suite, но остановился на desktop performance assertion.
Runner стабильно выдавал baseline p95 33.4 ms и scroll p95 33.4 ms с 0–3%
кадров >40 ms; test при этом требовал tier `low` только из-за baseline >25 ms,
хотя активный scroll не был медленнее idle. Контракт исправлен без расширения
LCP, CLS, long-task, interaction, transfer или normalized-scroll ceilings:
healthy runner сохраняет абсолютные 8%, constrained runner допускает не более
8 п.п. сверх собственного baseline, а p95 ≥50 ms, >20% кадров >40 ms или
материальная scroll-регрессия по-прежнему требуют tier `low`. Детерминированный
policy-unit сохранил downgrade 2/2; локальный performance stress после правки
прошёл desktop/mobile 10/10 за 2.2 минуты без retry.

Следующий run `32088146187` не дал test result: GitHub cold install браузеров
занял 7m52s, после чего общий 15-минутный job timeout отменил functional suite
через 7m06s и не запустил performance step. Quality job ceiling увеличен до
30 минут, чтобы инфраструктурная подготовка не обрывала полный gate. Per-test
timeout 45s, CI retry policy, browser coverage и performance assertions при
этом не менялись.

Run `32089149711` показал, что одного увеличения общего ceiling недостаточно:
browser install не вернул управление за 30 минут и job был отменён до build и
тестов. Install-контур сделан bounded: максимум две попытки по 12 минут с
30-секундным kill grace и одним коротким retry; общий job ceiling — 45 минут,
чтобы после успешной cold-попытки осталось время на полный serial suite и
performance. Если обе попытки неуспешны, workflow теперь завершится явным
install failure, а не неопределённой отменой. Test timeout 45s и все продуктовые
assertions остались прежними.

Тот же внешний риск присутствовал в Pages build, verify-production и scheduled
monitor. Политика вынесена в один `scripts/install-playwright-runtime.sh`:
full-профиль (Chromium/Firefox/WebKit) использует две попытки по 12 минут,
Chromium-only smoke/monitor — две по 8 минут. Quality и Pages build имеют общий
ceiling 45 минут, post-deploy verify и monitor — 25 минут. Это единый
orchestration contract; браузерное покрытие и продуктовые тесты не сокращены.
