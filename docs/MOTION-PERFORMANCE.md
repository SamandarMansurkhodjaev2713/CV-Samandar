# Motion and performance contract

Этот документ — обязательный контракт для всех анимаций главной страницы и
проектных визиток. Он не описывает отдельный эффект: он определяет, как эффекты
могут сосуществовать, прерываться, деградировать и освобождать ресурсы.

## 1. Источники истины

- `src/engine/perf.js` — единственная политика качества и движения.
- `src/engine/motion-runtime.js` — единственный общий поток scroll, pointer и
  viewport-событий и общий планировщик кадров.
- `src/engine/motion.js` — authored motion: reveal, parallax, magnetic controls,
  cursor и spotlight.
- `src/engine/img-fx.js` — управляемый WebGL-слой изображений.
- `src/engine/scene-cinema.js` — переходы между главной и case/live-маршрутами.

Новый визуальный модуль не может самостоятельно определять tier, запускать
постоянный `requestAnimationFrame`, подписываться на scroll/pointer/resize или
перезаписывать transform, принадлежащий другому модулю.

## 2. Политика качества

Публичный контракт:

```text
window.__SM_PERF === window.__SM_MOTION_POLICY

state:
  tier              low | mid | high
  reducedMotion     boolean
  documentVisible   boolean
  saveData          boolean
  pointerClass      coarse | fine
  viewportClass     phone | tablet | desktop
  measuredFps       number | null
  longTaskPressure  boolean
```

Hardware hints задают только первоначальную гипотезу. Рабочий tier уточняется
по фактической доставке кадров и long tasks. `prefers-reduced-motion` и
`saveData` всегда сильнее аппаратной гипотезы.

Бюджет WebGL:

| Tier | Одновременные image shaders | Характер движения |
| --- | ---: | --- |
| high | 2 | полная режиссура в пределах frame budget |
| mid | 1 | композиция сохранена, вторичные эффекты облегчены |
| low | 0 | живые CSS/DOM-состояния без WebGL и постоянного движения |

Low tier — не статичная или сломанная копия. Смысловая композиция, навигация,
контент, фокус, pressed-состояния и понятная обратная связь сохраняются.

## 3. Кадровый runtime

Каждый кадр выполняется в фиксированном порядке:

```text
input snapshot → measure → compute → mutate → render
```

- `measure` читает layout и состояние.
- `compute` рассчитывает следующую позу без DOM-записей.
- `mutate` изменяет DOM/CSS variables.
- `render` отправляет результат в Canvas/WebGL.

Планировщик засыпает, когда нет dirty- или continuous-работы. Hidden tab,
явный suspend и reduced motion останавливают постоянное планирование. Каждый
subscriber имеет уникальный id и возвращает обязательный unsubscribe.

## 4. Владение состоянием

- Позиция authored cursor принадлежит только `authored-cursor`.
- Parallax, pinning и section composition принадлежат
  `scroll-composition`.
- Magnetic controls используют индивидуальное CSS-свойство `translate` и не
  занимают общий `transform`.
- Image shader принадлежит одному subscriber `image-shader`; настоящий
  `<img>` остаётся доступным fallback.
- Scene transition не имеет права скрыть конечную страницу после timeout,
  ошибки, смены visibility или нового пользовательского намерения.

## 5. Прерывание и восстановление

Переходы работают по правилу «последнее намерение побеждает». Для каждого
старта существует ровно одно завершение. Wall-clock timeout — 1800 ms; после
него восстанавливается запрошенное конечное состояние, освобождается shell и
возвращается взаимодействие.

Обязательные recovery-сценарии:

- пользователь нажал вторую ссылку до конца перехода;
- browser Back/Forward;
- вкладка стала hidden;
- включился reduced motion;
- View Transition API отклонил promise;
- WebGL context lost/restored;
- компонент был dispose/re-init;
- tier изменился во время эффекта.

Ни один recovery-путь не может прятать основной текст или оставлять
`pointer-events: none` на странице.

## 6. Производительные бюджеты

- high tier: целевой диапазон 55–60 FPS;
- mid tier: устойчивый диапазон не ниже 45 FPS;
- обычный scroll не создаёт устойчивых long tasks более 50 ms;
- CLS не выше 0.1;
- INP не выше 200 ms;
- LCP не выше 2.5 s на целевой mobile-проверке;
- WebGL texture cache ограничен шестью элементами;
- скрытая вкладка и неактивный shader не потребляют постоянные кадры.

Эти значения подтверждаются измерением перед релизом. Если целевой бюджет не
достигнут, эффект упрощается по смысловому приоритету, а не случайным
отключением деталей.

## 7. Reduced motion и touch

Reduced motion сохраняет финальные композиции и причинно-следственные
переходы, но убирает параллакс, длительные траектории, постоянный cursor и
WebGL-деформации. Видимый текст не ожидает IntersectionObserver.

На coarse pointer нет имитации мыши. Touch получает собственные press,
center-stage и scroll-реакции; ключевое действие всегда доступно обычным tap и
никогда не зависит только от hover или swipe.

## 8. Проверка изменений

Перед слиянием motion-изменения обязаны пройти:

1. `node scripts/validate-site.js --generated`;
2. policy/runtime/scene/image/lifecycle Playwright-набор;
3. полный `npm test`;
4. browser QA production-mode на desktop и mobile;
5. проверку reduced motion, coarse pointer, hidden tab и context loss;
6. `git diff --check`;
7. повторную сборку без generated drift.

Валидатор запрещает частный RAF, interval и прямые
scroll/resize/pointermove-listeners в `motion.js` и `img-fx.js`, а также
проверяет правильный порядок загрузки policy → runtime → consumers.
