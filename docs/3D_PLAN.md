# 3D & Scroll Motion Plan — Executive AI Code Lab

Концепция: каждая секция = «сцена в IDE». Скролл = таймлайн исполнения программы. Один большой Three.js контекст, который трансформируется и подменяет ассеты по мере прокрутки. Стиль — terminal/IDE/код: моноширинный шрифт на текстурах, glow-линии, wireframe, particle data, no organic shapes.

---

## 1. Глобальная архитектура

- **Один WebGLRenderer** на весь сайт (fixed canvas, z-index: 1, под контентом).
- **SceneController**: держит scroll progress (0..1 по всему документу) + section progress (0..1 внутри секции).
- **GSAP-style timeline на чистом JS** (без зависимостей) — каждой секции даём `enter()`, `update(p)`, `exit()`.
- **Postprocessing**: `EffectComposer` + bloom (acid glow на accent) + slight chromatic aberration на быстром скролле.
- **Adaptive quality**: на мобайле / `prefers-reduced-motion` — статичный SVG fallback.

---

## 2. По секциям — модели и анимации

### S0 · HERO — `CodeCube` (centerpiece)
- 3D куб 6 граней = 6 секций. На каждой грани — `CanvasTexture` с кодом в моно-шрифте.
- Внутри куба — particle lattice (1600 точек) + KNN линии = «нейронная сеть».
- Орбитальное кольцо вокруг куба.
- **Interact**: drag = rotate, hover face = выезжает + glow, click face = scroll to section.
- **Анимация входа**: куб собирается из разлетевшихся вершин (10 wireframe boxes сходятся в один) → fade-in граней → particle lattice проявляется.

### S1 · SIGNAL — `DataStream`
- Куб уменьшается, отъезжает в верх-правый угол hero.
- Появляются **3 floating bar charts** (3D extruded) — KPI значения.
- При скролле столбики «строятся» снизу вверх, цифры считаются.
- **Interact**: hover столбика — tooltip с метрикой.

### S2 · ABOUT — `OrbitGlyphs`
- Куб уезжает в фон, становится полупрозрачным.
- Появляется **сфера-токенов**: 40-60 моно-глифов (TS, RU, ENG, MCP, GPT, Bot, SQL...) на сферической оболочке.
- Сфера медленно крутится. Pointer parallax.
- **Анимация входа**: глифы летят из камеры → выстраиваются на сфере.
- **Interact**: hover на глиф — приближается, остальные тускнеют.

### S3 · PROJECTS — `ProjectShelves`
- Сфера разваливается на 6 **3D-карточек проектов** (плоские плиты с texture-mock UI).
- Карточки выстраиваются в ленту, повёрнутую под углом — как «полка артефактов».
- **Скролл-анимация**: горизонтальный pin-scroll — карточки проезжают слева направо, текущая в фокусе светится.
- **Interact**: click карточки → она поворачивается фронтом, рядом всплывает текст-описание.

### S4 · SKILLS — `StackTower`
- Карточки уходят в пол → пол становится **terminal grid** (бесконечная сетка с MathHelper).
- На сетке поднимается **многоуровневая башня кубов**: 5 этажей = 5 категорий (Frontend / Backend / AI / DevOps / Tools).
- Каждый этаж — кластер маленьких кубов-логотипов.
- **Скролл**: камера облетает башню по орбите (полный круг от 0 до 1).
- **Interact**: click этажа → камера снапится на этаж, остальные тускнеют.

### S5 · SERVICES — `PipelineFlow`
- Камера ныряет внутрь башни → переход в **3D-pipeline** (как Blender geometry nodes).
- 4 узла-сферы с надписями (Web App / AI Bot / Automation / Admin Panel) связаны изогнутыми bezier-линиями.
- По линиям бегают partikle pulses от input к output.
- **Скролл**: pipeline разворачивается слева направо, узлы загораются по очереди.
- **Interact**: hover узла → подсвечиваются его связи + раскрывается «inspector» (HTML overlay).

### S6 · CV — `TimelineRibbon`
- Pipeline сворачивается в одну линию → линия становится **3D-лента истории**.
- Лента изогнута spline'ом, идёт в глубину сцены.
- На ленте 4-5 узлов = опыт работы. Узлы — это маленькие icosahedron'ы.
- **Скролл**: камера движется ВДОЛЬ ленты (camera-on-path), активный узел разворачивается → показывает данные.
- **Interact**: можно «ускорить»/«замедлить» движение по ленте колесом.

### S7 · PROCESS — `BuildPipelineLive`
- Лента «выстреливает» вверх → становится **9-step CI/CD машиной**.
- 9 шестерёнок/иконок в ряду, между ними поток данных (instanced particles).
- При проходе через каждый узел частица меняет цвет (parsing → compile → test → deploy).
- **Скролл**: ускоряет/замедляет поток. На pause = тоже хорошо смотрится.

### S8 · TRUST — `QuoteHolograms`
- Машина гаснет → 3 **голографические карточки** с цитатами клиентов парят в пространстве.
- Карточки — плоские плиты с scanline шейдером (CRT эффект).
- Лёгкая глитч-анимация на буквах.
- **Interact**: card flip на hover.

### S9 · CONTACT — `DeployTerminal`
- Карточки собираются в один центральный **3D-терминал** (как hero, но monumental).
- Терминал «дышит» (geometric scaling). На экране — реальный typing эффект `> deploy --connect`.
- При фокусе на input формы — терминал выводит `> awaiting message...`
- При submit — particle explosion + текст `> 200 OK`.

---

## 3. Переходы между секциями

Никаких резких смен сцены. Каждый переход = **continuous morph**:

| From → To | Morph |
|-----------|-------|
| Hero → Signal | Cube shrinks + slides to corner, bars rise from below |
| Signal → About | Bars implode into points → form orbit sphere |
| About → Projects | Sphere unwraps → cards fly out tangentially |
| Projects → Skills | Cards drop to floor → grid emerges → tower rises |
| Skills → Services | Camera dives into tower → reappears at pipeline level |
| Services → CV | Pipeline lines stretch → become single ribbon |
| CV → Process | Ribbon coils up → unrolls as belt of gears |
| Process → Trust | Particles freeze → form 3 floating cards |
| Trust → Contact | Cards converge → form terminal |

---

## 4. Микро-анимации на скролле (всегда активны)

- **Scroll-progress shader uniform** `uScroll` (0..1) — глобальный.
- **Speed-based chromatic aberration**: при быстром скролле — лёгкий RGB split.
- **Inertia camera shake**: камера слегка отстаёт от целевой позиции с пружинной физикой.
- **Particle wake**: при изменении скролла > X — частицы оставляют trail-вектора по направлению движения.
- **Section-enter flash**: каждый раз когда новая секция > 50% viewport — accent rim-flash на куб/сцену.

---

## 5. Глобальные интеракции

- **Cursor parallax** на всю сцену (group.rotation += pointer * 0.05).
- **Mouse-following light**: PointLight идёт за курсором, освещает ближайшие grani.
- **Click anywhere on canvas** = пинг (ripple на ground grid).
- **Hold Shift + scroll** = «turbo mode» — fast forward по таймлайну сцены.
- **Hidden cheat code**: написать `dev` на клавиатуре → debug overlay (wireframe + axis helpers + FPS).

---

## 6. Tweaks (расширение существующей панели)

- `core variant`: crystal / nebula / grid / hologram
- `camera mode`: cinematic / locked / orbit
- `quality`: low / mid / high / ultra (управляет particle count + bloom)
- `debug 3D`: toggle wireframe + axis helpers
- `pause timeline`: фиксирует scroll progress = 0.5 (для скриншотов)

---

## 7. Тех-стек

- `three@0.160` (ESM)
- `three/addons/postprocessing/EffectComposer.js` + `UnrealBloomPass` + `RGBShiftShader`
- `three/addons/loaders/RGBELoader.js` (для env-map, optional)
- Кастомные GLSL шейдеры для:
  - particle billboards с time-based pulse
  - hologram scanlines
  - chromatic aberration final pass
- Custom timeline (no GSAP) — 200 строк.
- Lazy-load: 3D код подключается только если WebGL2 + не reduced-motion.

---

## 8. Стиль (визуальный язык)

- Палитра: `#07090B` фон → `#B8FF3D` acid → `#4DEBFF` cyan → `#C89B5E` bronze.
- Все 3D-объекты в **wireframe + filled translucent**.
- Текст внутри 3D — **строго JetBrains Mono**, эмулирует терминал.
- Никаких organic shape'ов / лиц / реалистичных материалов. Только geometry primitives + extruded shapes.
- Bloom только на accent-цветах, не на белом.

---

## 9. Реализация (порядок)

1. Расширить `ai-core.js` → `scene-controller.js` с поддержкой scenes-as-modules.
2. Каждая секция = отдельный JS файл-сцена (HeroScene.js, SignalScene.js, ...).
3. Добавить `Timeline` (scroll → progress mapper) + section observer.
4. Внедрить `EffectComposer` + bloom + RGB shift.
5. По одной секции имплементировать, начиная с Hero (уже есть) → Signal → About...

---

Это план — реализуем поэтапно. Скажи, с какой секции начать или хочешь ли скорректировать концепцию.
