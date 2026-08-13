# Physical mobile and assistive technology QA protocol

Актуально для: `v2.13.1`, asset graph `v233`, 2026-08-13

Статус на момент создания: **NOT RUN**

## 1. Назначение

Этот протокол закрывает проверки, которые нельзя честно выполнить headless
браузером или viewport-эмуляцией. Он не заменяет автоматическую матрицу из
`QA-MATRIX.md`, а добавляет evidence с физических устройств и реальных screen
reader.

Допустимые статусы каждого сценария:

- `PASS` — шаг фактически выполнен в указанной среде, результат и evidence
  сохранены;
- `FAIL` — воспроизводимый дефект зарегистрирован;
- `BLOCKED` — среда была доступна, но внешний фактор не позволил закончить шаг;
- `NOT RUN` — сценарий не выполнялся. Этот статус нельзя переименовывать в
  `PASS BY PROXY`.

## 2. Evidence header

Для каждого устройства/AT создаётся отдельная запись:

| Поле | Значение |
|---|---|
| Date/time + timezone | |
| Tester | |
| Production URL | `https://samandarmansurkhodjaev2713.github.io/CV-Samandar/` |
| Release/tag | `v2.13.1` |
| Commit observed | |
| Device model | |
| OS + build | |
| Browser + version | |
| Screen reader + version | `N/A`, если visual-only |
| Viewport/orientation | portrait + landscape |
| DPR / text size / zoom | |
| Motion preference | normal + reduced |
| Network | Wi-Fi/mobile; normal/constrained |
| Clean storage run | yes/no |
| Result | PASS / FAIL / BLOCKED / NOT RUN |
| Evidence folder/link | |

Commit observed подтверждается asset version в network/HTML либо совпадением с
актуальным production deployment. Одного номера тега без проверки production
недостаточно.

## 3. Минимальная матрица сред

| ID | Среда | Обязательный охват |
|---|---|---|
| `IOS-SAFARI` | physical iPhone, поддерживаемый iOS, Safari | visual/touch, VoiceOver, portrait/landscape, reduced motion |
| `ANDROID-CHROME` | physical Android среднего класса, актуальный Chrome | visual/touch, TalkBack, portrait/landscape, reduced motion |
| `NVDA-CHROME` | Windows, актуальные NVDA + Chrome | landmarks, dialog, forms, route/language context |
| `NVDA-FIREFOX` | Windows, актуальные NVDA + Firefox | тот же путь, отдельный evidence |
| `VO-MAC-SAFARI` | macOS, Safari + VoiceOver | rotor, menu dialog, case navigation и announcements |

Если macOS недоступен, `VO-MAC-SAFARI` остаётся `NOT RUN`; VoiceOver на iPhone
не подменяет desktop Safari. Android high-end можно добавить, но он не заменяет
обязательный mid-range профиль.

## 4. Подготовка

1. Убедиться, что automated release gate, production smoke и последний monitor
   зелёные на проверяемом release.
2. Отключить browser extensions, translation и content blockers.
3. Сделать первый проход с чистым site storage и обычной сетью.
4. Не включать принудительный desktop mode на телефоне.
5. Записать системный text size, display zoom и motion preference до прохода.
6. Не использовать тестовые private URL или данные; contact form заполнять
   нейтральным текстом без отправки секретов.
7. При дефекте сначала сохранить видео/скриншот и точные шаги, затем reload и
   повторить один раз для проверки воспроизводимости.

## 5. Core journey — visual and touch

Каждый шаг выполняется на iPhone Safari и Android Chrome.

| ID | Действие | Ожидаемый результат | Evidence |
|---|---|---|---|
| `M01` | Первый вход с чистым storage | Intro длится примерно 2–3 s, не зависает и открывает полностью готовый Hero | video + duration |
| `M02` | Повторный reload | Intro короче первого, но не блокирует interaction и не оставляет overlay | video/notes |
| `M03` | Проверить Hero без скролла | имя, позиционирование, 2 CTA и proof rail читаемы; нет clipping/overlap | portrait screenshot |
| `M04` | Прокрутить Hero → Signal | нативный scroll отвечает с первого жеста; секция не требует 2–3 лишних swipe | video |
| `M05` | Открыть/закрыть menu | dialog имеет характерную анимацию, все 12 глав доступны, фон не скроллится, focus/scroll возвращаются | video |
| `M06` | Переключить RU → EN → UZ | язык меняется без потери текущей главы и без длинных обрезанных строк | 3 screenshots |
| `M07` | Пройти Projects | горизонтальный swipe не ломает vertical scroll; next-card peek и pager понятны | video |
| `M08` | Раскрыть «Все проекты» | все 25 карточек доступны ровно один раз, layout не прыгает | screenshot + count |
| `M09` | Открыть live-проект | primary CTA ведёт на ожидаемый live-site; back возвращает в понятный контекст | route note |
| `M10` | Открыть TTYL/BelfProctor case | thesis/system/evidence/boundary читаемы, fixed controls не закрывают текст | video/screenshots |
| `M11` | Вернуться из case | открывается точная исходная карточка, archive раскрыт, Intro не повторяется | video |
| `M12` | Использовать Builder | controls не меньше 44 px; result обновляется понятно; brief CTA доступен | video |
| `M13` | Stack/Services/CV | tab/disclosure state очевиден; светлая CV-сцена контрастна; PDF открывается | screenshots |
| `M14` | Method/FAQ/Quality | motion не мешает чтению; disclosure явно раскрываем; светлый текст не теряется | screenshots |
| `M15` | Contact validation | ошибки связаны с полями, не зависят от цвета; Telegram/email handoff понятен | video |
| `M16` | Portrait → landscape → portrait | state не теряется; menu/dock/focus не перекрывают content на 844×390-классе | video |
| `M17` | Увеличить системный текст / 200% browser zoom где доступно | нет horizontal page overflow, clipping и недоступных CTA | screenshots |
| `M18` | Увести браузер в background на 30 s и вернуть | Intro не повторяется, motion не ускоряется, audio/RAF не остаются зависшими | screen recording |
| `M19` | Включить Reduce Motion и повторить M01/M05/M07/M11 | весь смысл и navigation сохранены, continuous motion отсутствует | video |
| `M20` | 5 минут непрерывного scroll/navigation | нет заметного thermal runaway, crash, белых изображений или деградации input | device notes |

## 6. Screen-reader journey

Порядок выполняется отдельно в `NVDA-CHROME`, `NVDA-FIREFOX`,
`VO-MAC-SAFARI`, VoiceOver/iOS Safari и TalkBack/Android Chrome.

| ID | Проверка | Ожидаемый результат |
|---|---|---|
| `A01` | Начало страницы | title/lang объявлены корректно; первым доступен skip link |
| `A02` | Landmarks/headings | один main; логичный heading outline; 12 глав различимы без визуального счётчика |
| `A03` | Fullscreen menu | trigger сообщает expanded state; focus ограничен dialog; Escape/close возвращает focus trigger |
| `A04` | Locale | control имеет понятное имя; после смены язык документа и context соответствуют выбранной locale |
| `A05` | Projects | название, descriptor, status и назначение CTA объявляются без декоративного шума; 25 карточек не дублируются |
| `A06` | Mobile gallery | swipe/focus order остаётся линейным; горизонтальная композиция не скрывает карточки от accessibility tree |
| `A07` | Builder | группы и выбранные значения имеют label/state; обновлённый result доступен без поиска по странице |
| `A08` | Services/FAQ | button сообщает expanded/collapsed; скрытая панель не читается преждевременно |
| `A09` | CV | tab semantics, selected state и panel relationship корректны; PDF link имеет понятное назначение |
| `A10` | Contact | required/error/help связаны с input; focus приходит к первой ошибке; status не объявляется многократно |
| `A11` | Case page | пять глав, язык, primary/secondary CTA и privacy boundary имеют логичный reading order |
| `A12` | Case return | ссылка объясняет возврат к проектам; после navigation focus/context не теряются на неизвестном месте |
| `A13` | Reduced motion | screen reader state не меняется из-за отключения animation; контент не исчезает |
| `A14` | 404 | ошибка, домашняя ссылка и язык читаются без зависимости от графики |

Для каждого FAIL сохранить дословно только короткую проблемную фразу
announcement; не записывать длинные синтезированные речи в документацию.

## 7. Визуальная приёмка 12 сцен и 16 кейсов

На iPhone и Android пройти все 12 глав главной и все 16 case route хотя бы в RU;
EN и UZ проверяются полной sweep-матрицей длинных строк на одном из устройств,
а критические Hero/Projects/Case/Contact — на обоих.

Особое внимание:

- белые CV/Quality сцены: body, mono metadata, secondary CTA и focus ring не
  должны сливаться с paper background;
- Projects: одинаковая card shell, самостоятельные изображения, отсутствие
  обрезанных CTA и ложной кликабельности;
- fixed navigation/dock: не закрывают heading, focused control или нижний CTA;
- изображения: нет белого flash, stretch, broken fallback или скрытия content
  при WebGL/context loss;
- RU/UZ: apostrophe, Cyrillic и длинные слова не создают overflow;
- 200% text: информация остаётся доступной без горизонтального scroll страницы.

## 8. Defect record

| Поле | Значение |
|---|---|
| Defect ID | `EXT-###` |
| Severity | P0 / P1 / P2 / P3 |
| Environment | matrix ID + exact versions |
| Release/SHA | |
| Preconditions | |
| Steps | 1…n |
| Expected | |
| Actual | |
| Reproducibility | n/n |
| Evidence | screenshot/video/announcement excerpt |
| Privacy checked | yes/no |
| Regression test added | path or `external-only` explanation |
| Fix SHA + verification | |

Severity:

- `P0` — security/privacy leak, unusable site or data loss;
- `P1` — основной route/CTA, menu, language, case return или чтение с AT
  заблокированы;
- `P2` — существенная visual/motion/accessibility проблема с обходным путём;
- `P3` — polish без потери смысла и действия.

P0/P1 блокируют sign-off. Исправление выпускается только вместе с
воспроизводимым automated regression, если дефект можно автоматизировать, и
повтором исходной physical/AT среды.

## 9. Sign-off record

| Gate | Result | Evidence | Tester/date |
|---|---|---|---|
| iPhone Safari visual/touch | NOT RUN | | |
| Android Chrome visual/touch | NOT RUN | | |
| NVDA + Chrome | NOT RUN | | |
| NVDA + Firefox | NOT RUN | | |
| VoiceOver + macOS Safari | NOT RUN | | |
| VoiceOver + iOS Safari | NOT RUN | | |
| TalkBack + Android Chrome | NOT RUN | | |
| 200% text / orientation / reduced motion | NOT RUN | | |
| Final privacy review | NOT RUN | | |

**Release decision:** `PENDING EXTERNAL SIGN-OFF`

**Known P0/P1:** none may be declared until the matrix is run

**Approved by:**

**Date/time:**

После фактического выполнения копия таблицы с evidence-ссылками добавляется в
`IMPLEMENTATION-LOG.md`. Пустая таблица является протоколом, а не доказательством
PASS.
