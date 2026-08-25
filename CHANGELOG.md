# Changelog

Все значимые изменения проекта фиксируются в этом файле. Формат основан на Keep a Changelog; раздел `Unreleased` описывает текущую ветку и не является утверждением о production deployment.

## [Unreleased]

### Added

- Каталог синхронизирован с новым GitHub-аудитом: `Echelon Desktop` добавлен как
  отдельный сильный live-продукт с каноническим Pages-маршрутом, публичным
  secondary GitHub CTA и собственным 1536/1152/768 WebP-artwork. Репозиторий
  `echelon-site` зафиксирован как duplicate/legacy alias и не создаёт вторую
  карточку.
- Последующий authenticated GitHub-аудит добавил ещё три самостоятельных
  private продукта без repository-дублей: `DentForma — Browser 3D Review`,
  `MeetingFlow RU/UZ` и `Telegram Sheets Task Bot`. Для каждого создана
  privacy-safe RU/EN/UZ case page, собственная system-схема и отдельный
  1536/1152/768 WebP still-life artwork без UI, логотипов и закрытых данных.
- Финальный `release-polish.css` стал явным последним authored owner для Hero
  и navigation shell. Он собирается через `build.js`, а не маскирует source
  ручной правкой generated bundle.
- V8.1 `Release Specimen` заменяет Proof Compiler на один физический объект:
  три обработанные пластины, измерительная ось и inspection-light. Parser
  frame-zero, Intro и Hero используют один motif без raster media gate.
- Desktop-cursor пересобран как sampling reticle: тихая точка и кольцо в покое,
  измерительная рамка и глагол только над действием. Crosshair, QA-jaws и
  постоянные координаты удалены; touch-профили курсор не имитируют. Собственные
  menu controls не получают второй click-ripple поверх своей close/open
  анимации.
- SEO graph главной теперь описывает `Person`, `WebSite` и `ProfilePage`, а
  каждая из 57 локализованных case-страниц — `CreativeWork`, `WebPage`, автора
  и `BreadcrumbList`; validator не пропускает неполную structured-data схему.
- Layout-regression gate для 320 px project gallery, светлого CV/Quality shell
  и явных межсекционных переходов; базовые ценовые диапазоны Builder 2026.2
  закреплены отдельным domain-тестом.

### Changed

- Hero V8.1 больше не выглядит dashboard/HUD-композицией: Release Specimen
  встроен в единое полноэкранное материальное поле, обе proposition-строки
  используют Oswald, а navbar постоянно показывает реальную главу.
- Кнопка fullscreen-навигации использует локализованную метку `МЕНЮ / MENU /
  MENYU`; instrument rail сохраняет один визуальный язык на RU, EN и UZ.
- Первые пять секунд заново срежиссированы вокруг тезиса «Из задачи — в
  продукт»: крупная читаемая типографика, живая схема сборки и проверки,
  короткий ownership-copy и proof rail остаются цельной сценой на desktop,
  portrait mobile и phone landscape.
- Верхняя навигация стала полноширинной инструментальной рейкой с текущей
  главой, прогрессом и одним главным действием. Языки перенесены в Index, который
  показывает 12 реальных глав в 3×4, 2×6 или 4×3 композиции по доступной
  геометрии, не обрезая локализованные подписи.
- Основной текст использует self-hosted Inter с Cyrillic/Latin/Latin Extended;
  Oswald владеет Hero и крупной display-иерархией, Cormorant остаётся только
  редким документным акцентом и не разделяет первый экран на два стиля.
- CV и Quality встроены в тёмную драматургию как физические светлые документы,
  поэтому переходы больше не выглядят случайными полноэкранными белыми пятнами.
- Projects получил более читаемый museum pass: уникальный продуктовый accent,
  световую позицию и crop каждой карточки, асимметричную desktop-сетку `7/5`,
  компактный mobile pager и приоритет задачи/результата вместо повторяющейся
  служебной подписи.
- Все 19 case routes приведены к общему Release Field: Inter body, Oswald
  display, единая сетка, прямоугольные controls и chapter rhythm. Устаревшие
  wave/gauge/lens pseudo-HUD cues отключены; уникальность сохраняют предметное
  изображение, accent, схема, QA-блок и аргументация.
- Длинные описания в карточках сокращены до тезисов без потери фактов; полный
  контекст остаётся на case-странице. Метаданные каталога теперь честно говорят
  `29 продуктов`, а не называют все позиции кейсами; сначала монтируются четыре
  сильнейшие карточки, остальные 25 появляются только после явного раскрытия
  или возврата из case route.
- Стартовые диапазоны оценки снижены до `$150–450` для прототипа,
  `$450–1,400` для MVP и `$1,500–4,200` для production; форма контакта использует
  согласованные более низкие budget buckets. Это ориентир, не публичная оферта.

### Fixed

- Intro release теперь атомарно публикует `doneFired` и причину завершения до
  удаления overlay во всех safety/teardown путях. Это закрывает реальную гонку
  WebKit, при которой здоровая страница уже была видна, но состояние загрузки
  оставалось неопределённым; намеренно stalled WebKit-сценарий прошёл 7/7.
- Visual-release runner больше не создаёт параллельно многогигабайтные копии
  68 authored PNG в Playwright trace/video. Только этот evidence job работает
  последовательно и без дублирующей диагностики; screenshot, decode, reveal,
  full-page и contact-sheet проверки сохранены и прошли 4/4.
- Hero headline и role rail больше не дробятся на независимо трансформируемые
  glyph-элементы. Строка является единым типографическим объектом, поэтому
  baseline не «гуляет» при загрузке шрифта, motion settling и смене движка.
- Deep link и возврат из case route помечают `sm-intro-skip`: headline и
  underline сразу получают финальную позу и не фиксируются в промежуточной
  clip-mask, пока обычный вход сохраняет полноценный Intro.
- Parser-frame Intro теперь блокирует появившийся `#root` через `inert` и
  `aria-hidden` до React passive effect и снимает только принадлежащий ему lock.
- В phone landscape удалена дублирующая верхняя telemetry-строка, которая на
  высоте 320 px пересекала заголовок и Proof Compiler; CTA сохраняют не менее
  8 px воздуха до нижнего proof rail.
- Contact-sheet visual gate ждёт фактический `HTMLImageElement.decode()` для
  каждой страницы вместо фиксированных семи секунд, устраняя гонку на тяжёлой
  матрице 19 desktop-кейсов без ослабления визуальной проверки.
- Low-tier scroll больше не перечитывает геометрию всех 12 глав и не вычисляет
  уже отключённые pin/parallax/magnetic transforms на каждом кадре. Авторский
  desktop-cursor и нативный Hero→Signal handoff сохраняются, а observer fallback
  выполняет ограниченный geometry sweep только для гарантии читаемой финальной
  позы. Новый lifecycle-тест закрепляет освобождение layout-работы отдельно от
  high-tier motion.
- Head Intro safety теперь проверяет wall-clock deadline не только одним
  `setTimeout`, но и синхронно на `DOMContentLoaded/pageshow`. Это закрывает
  starvation-гонку WebKit: просроченный loader не остаётся поверх уже здорового
  React shell, не сокращая нормальный 2–3-секундный authored Intro.
- Intro больше не просвечивает собранным Hero под shutter: первый сеанс
  сохраняет полезные 2–3 секунды загрузочного окна, повторный короче, а deep
  link по-прежнему обходит заставку. Code-native Hero отмечается готовым без
  фиктивного ожидания raster decode.
- Первый CSS-кадр Intro остаётся содержательным даже при задержке compositor:
  boot-readout сразу видим, а Release Specimen начинает движение из различимой
  позы без blur/нулевой opacity. Интро не превращается в пустой тёмный экран под
  CPU pressure.
- Завершённый Intro/recovery overlay теперь синхронно снимается, если React
  shell уже смонтирован. Это закрывает редкую гонку насыщенного mobile runner,
  при которой здоровый сайт оставался под невидимым полноэкранным interaction
  shield после истечения аварийного deadline.
- RU / EN / UZ Hero прошёл 27-состоянийную геометрическую матрицу: CTA не
  обрезаются и не пересекают proof rail на 320×568, 568×320, 844×390,
  920×720, 1024×768 и остальных контрольных размерах. Компактные экраны
  используют честную короткую CTA-микрокопию вместо нечитаемого уменьшения.
- Явный переход через menu, deep link или возврат из case заранее переводит
  целевую секцию в читаемую финальную позу; reveal-анимация больше не оставляет
  заголовок или вложенный текст скрытым на большом scroll jump.
- Верхняя навигация сохраняет светлый контраст на документных CV/Quality
  сценах, а mobile project gallery временно владеет собственным pager и не
  конфликтует с общим нижним dock.
- SEO title/description, Open Graph и Twitter copy приведены к единому
  позиционированию Product Engineer + AI + QA; все product accent values снова
  уникальны.

## [2.14.1] - 2026-08-18

### Added

- V5 `Release Gate` для первых пяти секунд: новая предметная hero-сцена
  `rough input → optical verification → finished module`, три shutter-плоскости,
  одноразовая измерительная трасса и единый визуальный объект в Intro, Hero и
  fullscreen Index. Master и responsive WebP производятся воспроизводимым
  `scripts/process-hero-image.py`.
- V3 `Proof Laboratory` art direction: proposition-led Hero с физической Proof
  Chamber (raw graphite → optical QA gate → finished release), единый chapter
  Index, смысловые motion-signatures для 12 сцен и
  отдельные compact-phone/short-desktop композиции.
- 16 индивидуальных case hero profiles (`vault`, `wave`, `converge`,
  `transformation`, `evidence`, `gateway`, `measure`, `threshold`, `factory`,
  `rotor`, `lens`, `gauge`, `timetable`, `calendar`, `reconcile`, `outbox`) с
  полными RU / EN / UZ страницами.
- Семь заново сгенерированных предметных project covers для Birthday Agent,
  ChAT, Marketbot, Sentinel Edge, AI Classroom Intelligence, CardioGuard и
  3D Landing, включая 768/1152/1536 responsive WebP.
- Архитектурный контракт `docs/ART-DIRECTION-V3.md` и регрессии для уникальности
  16 case-профилей, mobile first view, короткого меню и полной Hero-матрицы.

### Changed

- Hero больше не использует предмет как обрезанный правый декор: изображение
  владеет всей сценой, а headline, proof map и action-band встроены в один
  физический маршрут. Portrait mobile, short phone, phone landscape и compact
  desktop получили самостоятельные camera/layout states без потери CTA.
- Hero теперь сначала сообщает продуктовый результат, затем авторство и
  ownership loop `BUILD → VERIFY → SHIP`; Intro использует содержательный
  boot-handoff и ускоренный повторный путь без однократного скрытия.
- Projects преобразован в читаемый продуктовый музей: асимметричный feature
  grid на desktop, управляемый horizontal filmstrip на mobile и единый архив
  после явного «Все проекты».
- Builder собран как scope console с более ясной архитектурой brief; Signal,
  About, Skills, Services, Process, FAQ, CV, Trust и Contact получили отдельные
  материалы, композиции и конечные reveal-позы.
- 16 case definitions объединены в один source of truth
  `src/projects/landings-data.js`; временный `landings-new.js` удалён из build,
  validation и документации.

### Fixed

- 320×568 Hero больше не наследует 700px floor: CTA, proof rail и минимум 64px
  следующей сцены помещаются в первый экран во всех трёх локалях.
- На 360×800 и коротком landscape CTA не пересекаются с proof rail; на
  920×720 action band использует отдельную двухколоночную композицию. Финальная
  поза и декодированное Release Gate media закреплены автоматическим
  дизайн-контрактом, а не только координатной проверкой.
- Все 12 пунктов fullscreen menu имеют разделённые text line boxes при
  920×720–1440×800, а mobile close control остаётся поверх прокручиваемого
  списка после смены языка.
- Светлые CV/Trust сцены используют документный ink с читаемым контрастом,
  вместо полупрозрачного тёмно-тематического текста.
- Performance gate больше не принимает стабильную 30 Hz частоту headless
  runner за page regression: constrained scroll сравнивается с собственным
  idle baseline. Severe baseline и материальное ухудшение при скролле всё ещё
  обязаны перевести motion policy в `low`.
- Quality, Pages deploy/verify и scheduled monitor используют единый bounded
  browser-install helper: две попытки с профилями full/chromium и общими job
  ceilings 45/25 минут. Это покрывает transient cold-download, но завершает
  зависший install явным failure; per-test timeout 45s, browser coverage,
  retry policy и продуктовые performance ceilings сохранены.

### Performance

- Единственный responsive Hero `<picture>` теперь присутствует в frame zero,
  до React root, и остаётся LCP/fallback-слоем при ошибке приложения; React не
  загружает дублирующее изображение.
- Authored CSS детерминированно собирается pinned `lightningcss` в production
  bundle; running copy переведён на platform UI stack, сохранив Oswald,
  JetBrains Mono и Cormorant Garamond как характерные self-hosted роли.

### Quality

- Локальный `v2.14.1 / v237`: deterministic build — 55 byte-identical
  generated artifacts; Playwright — 156 passed / 112 profile-skipped / 0
  failed / 0 flaky за 16.2 min; isolated performance — 2/2 за 31.8 s;
  visual release — 4/4 за 7.5 min;
  focused WebKit stalled-intro stress — 8/8; all-case mobile viewport stress
  после cold-layout коррекции — 8/8.
- Desktop, portrait mobile и 844×390 landscape Hero, Projects и case contact
  sheets просмотрены вручную в локальном Chromium. Physical iPhone/Android,
  NVDA, VoiceOver и TalkBack этим не подменяются и остаются `NOT RUN`.
- PR `#4` прошёл независимый GitHub quality gate `32083562875`; merge SHA
  `adc3e861` опубликован Pages workflow `32084173961`, где build, deploy и
  verify-production завершились успешно. Независимый smoke — 3/3, cache graph
  — 30 refs `v237` / 0 refs `v236`, live routes — 9/9.
- Synthetic production monitor для `v237` завершился без first-party failures
  и budget violations: desktop LCP 1656 ms / CLS 0.0928 / frame p95 83.4 ms;
  mobile LCP 1680 ms / CLS 0.0075 / frame p95 33.3 ms. Это Chromium synthetic,
  а не field RUM или physical-device evidence.

## [2.13.2] - 2026-08-17

### Added

- Воспроизводимый physical mobile/assistive-technology protocol с отдельными
  iPhone, Android, NVDA, VoiceOver и TalkBack сценариями, evidence header,
  severity model и честным исходным статусом `NOT RUN`.
- Opt-in `npm run qa:submission`: восемь exact-size production stills,
  60–90-секундный desktop review-video, manifest и contact sheet с проверкой
  размеров, длительности, веса и runtime errors.

### Changed

- Awwwards submission package преобразован в готовый рабочий комплект:
  англоязычный submission copy, позиционирование, карта 12 сцен, technology
  story, transparent credits, media manifest, 82-секундный shot list и
  pre-submission truth gate.
- Текущие архитектурные документы синхронизированы с canonical registry:
  25 продуктов, 9 live, 16 case, 48 локализованных case pages.
- Documentation gate теперь выводит каталог из реестра и отклоняет возврат
  устаревших текущих claims 24/15/45.
- Firefox и WebKit smoke выполняются до тяжёлой Chromium/WebGL-матрицы. Состав
  тестов и строгие таймауты не уменьшены: кроссдвижковые профили больше не
  наследуют графическое давление от предшествующих сцен на Windows.

### Fixed

- Репозиторий фиксирует LF для runtime/generated text artifacts через
  `.gitattributes`: Windows `core.autocrlf` больше не может изменить точные
  байты inline JSON-LD после checkout и рассинхронизировать CSP hash до
  следующей сборки.
- Мобильный CV удерживает клавиатурный фокус между верхней навигацией и
  фиксированным dock даже при позднем нативном focus-scroll, смене breakpoint
  и входной анимации панели. Исправление ограничено коротким конечным guard и
  не перехватывает обычный скролл.
- Короткое desktop-меню сохраняет все 12 названий в одну строку без наложения
  «Гарантии качества» на «Контакт»; mobile-композиция оставляет все главы
  видимыми и доступными без уменьшения touch target.
- Case reveal получает финальную читаемую позу даже после большого скачка
  скролла, когда IntersectionObserver не сообщает переход через viewport.
- Reduced-motion scheduler test синхронизирован с фактическим завершением
  собственного final-pose кадра и больше не принимает законный внешний
  `ResizeObserver` wake за непрерывный animation loop.
- Frame-zero Intro watchdog больше не отключается в начале authored timeline:
  независимый 3.8-second ceiling синхронно снимает curtain и scroll lock, если
  WebKit потерял финальный rAF/transition; app-watchdog отдельно владеет
  recovery, когда React действительно не смонтирован к 5.5 секундам.
- LCP gate сохраняет исходный лимит на здоровом runner и допускает только
  измеренную, ограниченную сверху host-contention поправку, если idle RAF уже
  деградировал; абсолютный потолок и обязательный `low` motion tier остаются.
- Interaction timing использует ту же bounded host-pressure модель, а healthy
  mobile scroll допускает p95 до 50 ms только вместе с прежним строгим лимитом
  не более 8% кадров медленнее 40 ms.

### Quality

- `v2.13.2 / v234` опубликован из merge SHA `8958aa5`; Pages workflow
  `32013952249` завершил build, deploy и verify-production. Независимый
  post-deploy smoke прошёл 3/3, production HTML содержит 30 refs `v234` и 0
  refs `v233`, внешние live-маршруты — 9/9.
- Первый независимый production monitor `v234` не обнаружил first-party
  failures или budget violations: desktop LCP 1388 ms / CLS 0.0049, mobile
  LCP 1604 ms / CLS 0.0025. Desktop frame p95 116.7 ms зафиксирован как
  runner-pressure/следующий optimization target, а не скрыт под общим PASS.
- Финальный production monitor `31678896168` на docs/release SHA `07cb769`
  завершился без first-party failures и budget violations; эти synthetic
  показатели отделены от ещё не выполненного physical/AT sign-off.
- Post-deploy monitor `31682231539` на documentation-hardening SHA `fa0c63b`
  также прошёл functional smoke, desktop/mobile budgets и 9 live routes без
  first-party failures или violations.
- Documentation hardening повторно прошло полный gate: 261 scenario,
  151 passed / 110 profile-skipped / 0 failed / 0 flaky; performance 2/2;
  deterministic build 54/54; validate 25/9/16/3; audit 0 и secret scan clean.
- Локальный кандидат `v2.13.2 / v234`: 266 scenarios, 155 passed / 111
  profile-skipped / 0 failed / 0 flaky за 15.4 минуты; CV focus 50/50 и
  reduced-motion scheduler 50/50 в отдельных стресс-прогонах; Firefox 2/2,
  WebKit 3/3 в полном gate и 20/20 в focused Intro stress; изолированный
  performance gate 2/2 за 29.6 секунды; live routes 9/9.
- Visual QA — 4/4: 13 состояний главной и 16 full-page case в desktop/mobile,
  всего 58 прямых кадров и 4 contact sheet. Desktop/mobile menu и все сцены
  главной просмотрены вручную; physical-device/AT proof этим не подменяется.

## [2.13.1] - 2026-08-13

### Changed

- Hero Proof Instrument теперь доступен браузеру как LCP-кандидат сразу под
  полностью непрозрачным Intro; после открытия сохраняется пространственная
  сборка, но декоративная задержка opacity больше не откладывает первый paint.
- Переходы из project cases оставлены нативным ссылкам: визуальный exit-state
  больше не владеет URL и не может задержать возврат к точной карточке или
  переключение RU/EN/UZ в throttled/background tab.
- Локальный Windows Playwright gate выполняет тяжёлые WebGL/scroll-сцены
  последовательно; Linux CI сохраняет два воркера. Набор тестов, таймауты и
  отсутствие локальных retry не изменены.

### Fixed

- Устранена редкая гонка 440-ms case exit timer, из-за которой переход мог
  остаться на визитке или быть перебит устаревшим language intent.
- Reduced-motion runtime больше не создаёт бесполезный parallax observer, не
  разрешает подписчику превратить финальный кадр в цикл и гарантирует один
  bounded final-pose frame, если видимый cold-start контекст задержал RAF.
- Полноэкранное меню явно возвращает `aria-expanded="false"` после закрытия.

### Quality

- Asset graph повышен до `v233`, package — до `2.13.1`; 54 generated artifacts
  дважды собраны байт-в-байт одинаково.
- Финальный локальный gate: 261 scenario, 151 passed / 110 осознанно
  profile-skipped / 0 failed / 0 flaky; reduced scheduler stress — 30/30;
  exact-card navigation stress — 30/30 desktop и 10/10 mobile.
- Performance — 2/2; visual capture — 4/4 с ручным просмотром Hero, Projects,
  12 сцен и 16 cases на desktop/mobile; validate — 25/9/16/3; live routes —
  9/9; audit — 0 vulnerabilities; secret scan и diff check — зелёные.
- Performance report теперь сохраняет точный LCP element/tag/class/url/size,
  чтобы визуальный регресс локализовался по факту, а не по предположению.

### Release status

- Runtime опубликован из SHA `374d4c80`; GitHub Pages workflow `31677200638`
  завершил build, deploy и verify-production со статусом success.
- Независимый post-deploy smoke — 3/3; production HTML отдаёт 30 ссылок на
  `v233`, 0 ссылок на `v232`; внешние live routes — 9/9.
- Production monitor `31677968144` завершился без failures/violations: desktop
  LCP 1420 ms, CLS 0.0010; mobile LCP 396 ms, CLS 0.0054. Это synthetic
  Chromium evidence, а не field RUM или physical-device proof.

## [2.13.0] - 2026-08-11

### Added

- Birthday Agent добавлен как 25-й канонический продукт: безопасный приватный
  кейс, уникальная предметная обложка, собственная архитектурная схема и полные
  RU/EN/UZ маршруты.
- Новая физическая арт-система Proof Instrument для Hero и Intro: локальные
  responsive-ассеты, калиброванная шкала Build → Verify → Ship и общий
  материал-грамматика для двенадцати глав.
- Для каталога введена редакционная иерархия: четыре полноширинных featured
  проекта и аккуратный двухколоночный archive после явного раскрытия.

### Changed

- Hero, Intro, полноэкранное меню, курсор, кнопки и все двенадцать секций
  получили самостоятельные композиции, материалы и motion-переходы при
  сохранении нативного скролла и единого runtime-профиля производительности.
- Мобильный Hero теперь имеет отдельные portrait, short-portrait и landscape
  композиции: имя, позиционирование, два CTA и proof-rail помещаются в первую
  сцену от 320×568, а Signal остаётся видимым следующим актом.
- Все 16 приватных визиток приведены к актуальной системе TTYL/BelfProctor с
  уникальными hero-профилями, схемами, QA/boundary-блоками и полной локализацией.
- Межстраничная навигация использует прерываемую exit-aperture вместо
  нестабильного cross-document View Transition; возврат из кейса восстанавливает
  конкретную карточку без повторного Intro.
- Каталог и release-контракты обновлены до 25 продуктов, 9 live-маршрутов,
  16 case-маршрутов, 48 локализованных case pages и 49 URL в sitemap.

### Fixed

- Устранены переполнение и длинная «замороженная» первая сцена на 320×568,
  568×320, компактных ноутбуках и 200% text zoom; mobile proof-rail больше не
  скрывается под нахлёстом Signal.
- Светлые CV/Quality-секции используют собственные контрастные ink-токены, а
  Method не переполняет узкие колонки длинными локализованными заголовками.
- Responsive-тест каталога теперь проверяет реальную 12-колоночную editorial
  сетку и полноширинные featured-записи вместо устаревшего двухколоночного
  предположения.
- Deep-link ждёт завершённую геометрию после шрифтов и layout, а case
  exit-aperture отменяет устаревший timer на `beforeunload/pagehide`, поэтому
  WebKit больше не может перебить новую навигацию старым language intent.

### Quality

- Визуальная матрица переснята для 12 сцен главной и 16 кейсов на
  desktop/mobile; четыре contact sheet просмотрены вручную.
- Добавлены регрессии для deterministic exit navigation, Birthday Agent,
  25-card catalog, 16 case pages, exact-card return и актуальной project grid.
- Контракт полноэкранного меню теперь отдельно требует синхронное
  `aria-expanded="false"` после закрытия; стресс-прогон — 10/10.
- Release-кандидат использует package `2.13.0` и единый asset graph `v232`.
- Финальный локальный gate: `npm test` — 150 passed / 109 осознанно skipped /
  0 failed / 0 flaky; performance — 2/2; visual — 4/4; determinism — 54/54;
  validate — 25/9/16/3; audit — 0 vulnerabilities; live routes — 9/9.

### Release status

- Код релиза опубликован из SHA `4d3c423`; GitHub Actions run `31485315454`
  завершил `build`, `deploy` и `verify-production` со статусом success.
- Независимый post-deploy smoke — 3/3, production HTML отдаёт `v232`, а
  проверка внешних продуктов — 9/9.
- Manual production monitor `31487035854` на том же SHA завершился без
  failures/violations: desktop LCP 3792 ms, CLS 0.0014; mobile LCP 2496 ms,
  CLS 0.0052.
- Ручной desktop-путь подтвердил каталог из 25 карточек, локализованный
  Birthday Agent, возврат к точной карточке без Intro и полноэкранное меню без
  console errors. Physical mobile и NVDA/VoiceOver/TalkBack остаются внешним
  `NOT RUN`, а не подменяются эмуляцией.

## [2.12.1] - 2026-08-10

### Fixed

- Прерывание нативного View Transition больше не оставляет ожидаемый
  `AbortError: Transition was skipped` как необработанное отклонение в консоли:
  scene-cinema наблюдает вспомогательные lifecycle promises, а финальную
  читаемую позу по-прежнему гарантирует основной `finished`-контракт.

### Quality

- Добавлена детерминированная регрессия, которая отклоняет `ready` при
  superseded-навигации и требует ноль `unhandledrejection` при сохранении
  latest-intent semantics и парности cinema events.
- Asset graph повышен `v230 → v231`; 51 generated artifact дважды собран
  байт-в-байт одинаково.
- Локальный release-gate: `npm test` — 148 passed / 107 осознанно skipped / 0
  failed, performance — 2/2, visual capture — 4/4, validate — 24/9/15/3,
  audit — 0 vulnerabilities, secret scan и diff check — зелёные.

### Release status

- Tag `v2.12.1` указывает на опубликованный SHA `eb3e405`; GitHub Actions
  `31368347969` завершил build/deploy/verify-production без annotations.
- Независимый post-deploy smoke — 3/3, live routes — 9/9; production HTML
  отдаёт только asset graph `v231`.
- Scheduled monitor `31368418978` и manual monitor `31369244468` на том же SHA
  зелёные. Последний JSON artifact: desktop ready 3337 ms, LCP 660 ms, CLS
  0.0016; mobile ready 3010 ms, LCP 216 ms, CLS 0.0058; 0 failures и 0
  violations в обоих synthetic Chromium profiles.

## [2.12.0] - 2026-08-10

### Added

- Канонический реестр из 24 продуктов с отдельными полями для lifecycle, confidentiality, presentation, evidence, маршрутов, repository aliases, privacy boundary и RU/EN/UZ идентичности.
- Три новых безопасно раскрытых case-проекта: Vacation Control Agent, B24 Sales Analyst и Chat App.
- 15 полноценных in-site case-страниц в трёх языковых версиях — 45 статических маршрутов с canonical/hreflang, Open Graph, Twitter Card и JSON-LD metadata.
- Индивидуальная editorial still-life обложка и responsive-варианты для каждого из 24 продуктов.
- Адаптивный bootstrap, watchdog и lazy-loading тяжёлых визуальных движков с читаемым degraded state.
- Централизованные performance/motion contracts, lifecycle-проверки для WebGL, image effects, sound и scene transitions.
- Автоматические проверки accessibility, responsive/orientation, SEO/CSP, deep links, 404 recovery, Firefox/WebKit smoke, reduced motion, performance budgets и visual release capture.
- Статические discovery-артефакты `404.html`, `robots.txt` и `sitemap.xml`, генерируемый sitemap содержит главную и все локализованные case-маршруты.
- Secret scan, live-route verifier, asset-version helper и отдельный visual QA runner.
- Scheduled production monitor с desktop/mobile synthetic vitals, функциональным smoke, проверкой live-маршрутов и сохраняемым JSON evidence.

### Changed

- Главная переработана как последовательность самостоятельных интерактивных сцен с общей дизайн-системой, доказательной продуктовой подачей и responsive-композицией.
- Каталог расширен до 24 уникальных карточек: четыре сильнейших проекта остаются первым актом, полный список раскрывается в том же разделе без дублей.
- Live-проекты открывают внешний продукт, а GitHub при наличии остаётся отдельным доказательным маршрутом; закрытые и чувствительные продукты ведут на безопасный case.
- Все case-страницы приведены к одной системе TTYL/BelfProctor, сохраняя уникальные hero, архитектурную схему, аргументацию, QA и boundary-блок каждого продукта.
- Intro, меню, межсекционная навигация, project return flow, mobile gallery, builder, CV, stack, services, FAQ, process, trust и contact получили новые desktop/mobile состояния и focus-safe поведение.
- Motion runtime теперь координирует уровень качества, visibility, offscreen pause, reduced motion и восстановление финального читаемого состояния вместо независимых эффектов.
- JSX компилируется ahead of time; build одновременно обновляет CSP, генерирует локализованные кейсы и sitemap и валидирует source/generated contracts.
- GitHub Actions используют locked dependencies, immutable action revisions, минимальные permissions и проверяют отсутствие незакоммиченного generated diff.
- Official GitHub actions обновлены до Node 24-compatible major-релизов и закреплены полными verified commit SHA; проектовый runtime остаётся на Node.js 20.

### Fixed

- Возврат с case-страницы восстанавливает конкретную карточку проекта и раскрывает скрытую часть каталога при необходимости.
- Устранены гонки и зависшие состояния при повторной навигации, timeout, performance cut, WebGL context loss, visibility change и повторном mount/unmount.
- Recovery-интро больше не оставляет невидимую блокирующую панель, если WebKit монтирует готовую React-оболочку сразу после hard deadline: shell повышается синхронно и возвращает accessibility tree/input без дополнительного таймера.
- Исправлены перекрытия focused controls мобильным dock, включая CV, горизонтальную project gallery, text zoom и короткую landscape-ориентацию.
- Исправлена несовместимость локального HTTP с WebKit, вызванная `upgrade-insecure-requests` в meta CSP; production-ресурсы при этом остаются same-origin и HTTPS на Pages.
- Устранены ложные section indicators, повторная intro-загрузка при deep link и некорректные переходы карточек без публичного live URL.
- Generated build нормализован в LF и проверяется в чистом Linux/Node 20 checkout; GitHub Pages action закреплён полным immutable SHA.

### Security

- CSP разделяет script/style/frame/form/object policies и разрешает только необходимые same-origin ресурсы, data/blob изображения и GitHub Events API.
- Inline data-блоки получают build-time SHA-256 hashes.
- Публичные кейсы содержат явные privacy boundaries и не раскрывают client data, credentials или неподтверждённые private-source детали.
- CI проверяет dependency graph на high-severity уязвимости и кандидатов на коммит — на секреты.

### Documentation

- README превращён в актуальную точку входа с установкой Node 20+, командами build/validate/test/performance/visual QA, source-of-truth картой, правилами разработки и Pages pipeline.
- Добавлены ADR для статически генерируемой архитектуры, общей motion policy и канонического product registry.

### Release status

- Release `v2.12.0` опубликован на commit `4f6af33` с cache graph `v230`. GitHub Actions `31339942716` завершил build, deploy и `verify-production` без annotations; независимый post-deploy smoke — 3/3, live routes — 9/9. Scheduled и manual production monitors (`31350135801`, `31364392491`) на том же SHA зелёные и сохранили JSON evidence.
