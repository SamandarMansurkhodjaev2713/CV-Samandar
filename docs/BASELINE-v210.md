# Baseline v210

Дата фиксации: 2026-07-28  
Production: `https://samandarmansurkhodjaev2713.github.io/CV-Samandar/`  
Commit: `6aa3665`  
Резервный тег: `pre-awwwards-v210`  
Рабочая ветка: `codex/awwwards-rebuild`

## Назначение

Это контрольная точка до Awwwards-переработки. Она нужна не как образец
дизайна, а как доказательство того, что новая версия не потеряла существующие
маршруты, контент, адаптивность и технические свойства.

## Фактическая структура

- 12 смысловых секций:
  `hero`, `signal`, `about`, `projects`, `builder`, `skills`, `services`,
  `cv`, `process`, `faq`, `trust`, `contact`;
- 21 проектная карточка;
- 12 внутренних project-case маршрутов;
- 9 карточек с внешним live-маршрутом;
- 21 проектное изображение;
- RU / EN / UZ;
- desktop document height: 20 961 px при viewport 1440×1000;
- mobile document height: 22 401 px при viewport 390×844;
- horizontal overflow на проверенном mobile viewport отсутствует.

## Lighthouse production baseline

Lighthouse 12.8.2:

| Метрика | Desktop | Mobile |
|---|---:|---:|
| Performance | 54 | 26 |
| Accessibility | 97 | 97 |
| Best Practices | 100 | 100 |
| SEO | 100 | 100 |
| FCP | 1.5 s | 5.1 s |
| LCP | 2.8 s | 13.6 s |
| Total Blocking Time | 380 ms | 9 450 ms |
| CLS | 0.02 | 0.012 |
| Speed Index | 4.1 s | 15.8 s |
| Initial transfer | 978 KiB | 814 KiB |
| Requests | 39 | 39 |

## Размер статического артефакта

Текущая локальная копия публикуемого набора:

| Группа | Размер |
|---|---:|
| Всего | 3 361 665 bytes |
| JavaScript | 1 462 601 bytes |
| Изображения | 1 139 090 bytes |
| CSS | 353 937 bytes |
| HTML | 188 343 bytes |

В `src` сейчас попадают исходные `.jsx`, хотя runtime использует скомпилированные
`.js`. Это не ломает сайт, но является лишним весом deployment artifact и
должно быть устранено в архитектурном этапе.

## Browser baseline

Проверено на опубликованной v210:

- intro завершается и не остаётся поверх основного контента;
- переход по hash пропускает intro;
- все 12 section anchors существуют;
- deep-link действительно прокручивает к целевой секции;
- 21 изображение присутствует в DOM;
- 12 ссылок ведут на внутренние project-case страницы;
- console errors/warnings на desktop и mobile first screen не обнаружены;
- mobile viewport не имеет горизонтального переполнения.

### Высоты mobile-секций

| Секция | Высота |
|---|---:|
| Hero | 726 px |
| Signal | 880 px |
| About | 1 860 px |
| Projects | 1 206 px |
| Builder | 2 531 px |
| Skills | 1 131 px |
| Services | 2 017 px |
| CV | 2 217 px |
| Process | 2 826 px |
| FAQ | 1 856 px |
| Trust | 1 365 px |
| Contact | 1 915 px |

Builder, Process, CV и Services формируют основную долю чрезмерной мобильной
длины. Они требуют отдельной информационной компрессии, а не простого
уменьшения шрифта.

## Зафиксированные проблемы

### P2 — художественная несвязность

Hero и часть интерфейса используют sci-fi/terminal язык: cockpit-фото,
`EXEC.AI.LAB`, технические pseudo-status подписи и crosshair-слои. Projects,
About и другие части пытаются быть материальным editorial-интерфейсом. Из-за
этого сайт не воспринимается одной авторской работой.

### P2 — слишком долгий нечитаемый вход по deep-link

Через 700 ms после перехода на `#about` секция ещё была сильно размыта и
затемнена. Только примерно к 3 s computed state достиг:

```text
opacity: 1
filter: blur(0px) brightness(1)
```

Deep-link и явная навигация должны давать читаемый результат значительно
быстрее и не заставлять пользователя ждать декоративную сцену.

### P2 — первый экран перегружен конкурирующими сообщениями

На desktop имя, cockpit-фото, роли, status labels, навигация и два CTA борются
за внимание. На mobile имя, три крупные роли и два CTA занимают почти весь
первый экран, но позиционирование Builder + QA не сформулировано одним ясным
предложением.

### P2 — чрезмерная mobile-длина

Документ достигает 22 401 px. Самые длинные сцены не дают пропорционального
роста понимания. Нужны более сильная иерархия, progressive disclosure с явным
affordance и сокращение повторов.

### P2 — много постоянных compositing-слоёв на mobile

DOM содержит фиксированные background, nav, dock, act veils/shutters/light и
набор custom-cursor/crosshair элементов. Даже когда часть из них визуально
скрыта CSS, их жизненный цикл и реальная стоимость должны быть проверены и
сведены к performance tier.

### P2 — производительность ниже целевого допуска

Desktop Performance 54, LCP 2.8 s и TBT 380 ms не соответствуют финальным
бюджетам. Mobile-картина критичнее: Performance 26, LCP 13.6 s и TBT 9 450 ms.
Главные кандидаты на аудит: font loading, initial script graph, WebGL/background
effects, motion initialization и лишние исходники в deployment artifact.

### Ограничение visual regression

Стандартный `fullPage` screenshot повторяет sticky Hero в каждом viewport
сегменте и не является достоверным изображением нижних сцен. Финальная
visual-regression система должна:

- снимать Hero отдельно;
- переходить к каждой секции по известному anchor;
- ждать конкретное stable-state условие, а не произвольный timeout;
- делать viewport screenshot каждой секции;
- отдельно снимать переходные состояния.

## Сильные свойства, которые нельзя потерять

- правильные внутренние маршруты и hash-навигация;
- отсутствие horizontal overflow на проверенном mobile viewport;
- 21 уникальное предметное изображение с небольшим общим весом;
- высокий Accessibility baseline;
- CLS 0.02;
- отсутствие console errors на проверенных маршрутах;
- статическая архитектура без runtime CDN-зависимости React/Three;
- корректный bypass intro для deep links;
- прямая live-маршрутизация публичных проектов.

## Визуальные артефакты

Папка `docs/baseline-v210/` содержит:

- первый экран desktop 1440×1000;
- первый экран mobile 390×844;
- отдельные screenshots всех смысловых секций;
- settled-state About;
- технический full-page capture только для демонстрации sticky-capture
  ограничения;
- Lighthouse desktop JSON.

## Rollback

Резервный тег указывает на стабильный commit до новой реализации.

```bash
git show pre-awwwards-v210
```

При аварийном откате создаётся отдельная ветка от тега. Рабочая ветка не
перезаписывает `main` до прохождения release gate.
