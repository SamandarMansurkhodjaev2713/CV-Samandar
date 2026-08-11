# Канонический реестр продуктов

Актуально на: 2026-08-11

Машинный источник истины: `src/content/product-registry.js`

Проверяемый контракт: `scripts/validate-site.js`

## 1. Зафиксированная модель

Портфолио содержит ровно **25 уникальных продуктов**:

- **9 live-продуктов**: primary CTA ведёт на работающий внешний сайт;
- **16 case-продуктов**: primary CTA ведёт на безопасную внутреннюю визитку;
- **3 полные локали**: `ru`, `en`, `uz`;
- **48 generated landing HTML**: 16 case-продуктов × 3 локали;
- **49 URL в sitemap**: главная + 48 локализованных case-маршрутов.

Единица учёта — продукт, а не репозиторий. Публичная витрина, приватный source,
предыдущая реализация, дочерний модуль и evidence-репозиторий могут принадлежать
одному продукту и не создают дополнительные карточки.

## 2. Полный каталог и порядок

Таблица отсортирована по `featuredRank`. Этот ранг является единственным
каноническим порядком карточек во всех трёх локалях.

| Rank | ID / slug | Публичное имя | Portfolio / lifecycle / confidentiality | Primary route | Secondary GitHub |
|---:|---|---|---|---|---|
| 1 | `klawis` / `klawis` | Klawis — Legal AI Assistant | featured / live / private_source | `https://klawis.uz` | `https://github.com/SamandarMansurkhodjaev2713/Klawis-PAA` |
| 2 | `growthops-ai` / `growthops-ai` | GrowthOps AI | featured / build / private_source | `projects/growthops-ai/` | `https://github.com/SamandarMansurkhodjaev2713/growthops-ai` |
| 3 | `ttyl` / `ttyl` | TTYL Platform | featured / build / nda | `projects/ttyl/` | `https://github.com/SamandarMansurkhodjaev2713/ttyl.uz` |
| 4 | `dostupnoe-pravo` / `dostupnoe-pravo` | Доступное Право | featured / live / public | `https://dostupnoe-pravo-alpha.vercel.app/` | `https://github.com/SamandarMansurkhodjaev2713/dostupnoe-pravo` |
| 5 | `birthday-agent` / `birthday-agent` | Birthday Agent | featured / build / sensitive | `projects/birthday-agent/` | — |
| 6 | `softly` / `softly` | CoupleOS / Softly | featured / live / sensitive | `https://softlylove.uz` | — |
| 7 | `ai-classroom` / `ai-classroom` | AI Classroom Intelligence | catalog / build / sensitive | `projects/ai-classroom/` | — |
| 8 | `car-superapp` / `car-superapp` | CAR Superapp | catalog / discovery / private_source | `projects/car-superapp/` | — |
| 9 | `helion` / `helion` | Helion | catalog / demo / public | `https://samandarmansurkhodjaev2713.github.io/helion/` | `https://github.com/SamandarMansurkhodjaev2713/helion` |
| 10 | `stones` / `stones` | Stones | catalog / demo / public | `https://samandarmansurkhodjaev2713.github.io/stones/` | `https://github.com/SamandarMansurkhodjaev2713/stones` |
| 11 | `sentinel-edge` / `sentinel-edge` | Sentinel Edge | catalog / demo / public | `https://samandarmansurkhodjaev2713.github.io/sentinel-edge-smart-system/` | `https://github.com/SamandarMansurkhodjaev2713/sentinel-edge-smart-system` |
| 12 | `cardioguard` / `cardioguard` | CardioGuard | catalog / demo / public | `https://samandarmansurkhodjaev2713.github.io/cardioguard/` | `https://github.com/SamandarMansurkhodjaev2713/cardioguard` |
| 13 | `task-automation` / `task-manager` | Task-manager / Task Manage Bot | catalog / demo / private_source | `projects/task-manager/` | `https://github.com/SamandarMansurkhodjaev2713/Task-manager` |
| 14 | `marketbot` / `marketbot` | Marketbot | catalog / build / nda | `projects/marketbot/` | — |
| 15 | `izatullo-bel-alma` / `izatullo` | IZATULO / BEL ALMA | catalog / live / private_source | `https://izzatullo.uz/` | — |
| 16 | `forge-learning-os` / `forge` | Forge / Learning OS | catalog / build / nda | `projects/forge/` | — |
| 17 | `belfproctor` / `belfproctor` | BelfProctor | catalog / prototype / sensitive | `projects/belfproctor/` | — |
| 18 | `laplacefx` / `laplacefx` | LaplaceFX | catalog / demo / private_source | `projects/laplacefx/` | — |
| 19 | `bioflux-observer` / `bioflux` | BioFlux Observer | catalog / prototype / public | `projects/bioflux/` | `https://github.com/SamandarMansurkhodjaev2713/bioflux-observer` |
| 20 | `vfs-killer` / `vfs-killer` | VFS Killer | hold / source_incomplete / private_source | `projects/vfs-killer/` | — |
| 21 | `med-exe` / `med-exe` | med-exe | catalog / prototype / sensitive | `projects/med-exe/` | — |
| 22 | `3d-landing` / `3d-landing` | 3D Landing | catalog / demo / public | `https://samandarmansurkhodjaev2713.github.io/3d-landing/` | `https://github.com/SamandarMansurkhodjaev2713/3d-landing` |
| 23 | `vacation-control` / `vacation-control` | Vacation Control Agent | catalog / build / sensitive | `projects/vacation-control/` | — |
| 24 | `b24-sales-analyst` / `b24-sales-analyst` | B24 Sales Analyst | catalog / build / nda | `projects/b24-sales-analyst/` | — |
| 25 | `chat-messenger` / `chat-app` | ChAT — Offline-first Messenger | catalog / prototype / public | `projects/chat-app/` | `https://github.com/SamandarMansurkhodjaev2713/ChAT-app` |

`portfolioState` и `featuredRank` решают разные задачи:

- `featuredRank` задаёт полный порядок 1–25 и обязан быть уникальным;
- `portfolioState=featured` отмечает верхний кураторский набор;
- первый экран раздела намеренно показывает **первые 4 карточки**, а кнопка
  «Показать ещё 21» раскрывает весь каталог без изменения порядка;
- `hold` не означает удаление: VFS Killer остаётся честно раскрытым архивным
  case, но не получает claim о готовности.

## 3. Маршрутизация карточки

### Primary CTA

Поле `presentation` является переключателем маршрута:

- `presentation: "live"` → только `liveUrl`; `casePage` обязан быть `null`;
- `presentation: "case"` → только `projects/<slug>/`; `liveUrl` не используется
  как публичное доказательство.

Live URL обязан использовать HTTPS и принадлежать allowlist хостов в
валидаторе. Case route обязан буквально совпадать с `projects/<slug>/`.

### Secondary GitHub CTA

`githubUrl` разрешён только если в `repositoryAliases[]` существует публичный
репозиторий. Приватный URL никогда не попадает в карточку или generated HTML.

- у live-продукта GitHub является отдельной вторичной ссылкой;
- у публичного case-продукта GitHub открывается из визитки;
- у private/NDA case с публичным showcase ссылка подписывается как публичный
  case/showcase, а не как source закрытого продукта;
- если публичного evidence нет, вторичная CTA ведёт в контактный сценарий или
  не рендерится — приватная ссылка не подставляется.

### Возврат к исходной карточке

Каждая case page содержит верхнюю и нижнюю ссылки вида:

```text
../../#proj-<slug>       # RU
../../../#proj-<slug>    # EN / UZ
```

Главная распознаёт `#proj-<slug>`, пропускает повторное intro, раскрывает полный
каталог при необходимости и возвращает посетителя к конкретной карточке, а не
к началу страницы. Этот контракт проверяют validator, catalog, landings,
responsive и browser-smoke тесты.

## 4. Приватность и доказательность

`confidentiality` и `lifecycle` — независимые оси. NDA не означает production,
а публичный репозиторий не означает live-продукт.

Разрешённые значения:

```text
confidentiality: public | private_source | nda | sensitive
lifecycle: discovery | build | prototype | demo | live | production | source_incomplete
portfolioState: featured | catalog | hold
presentation: live | case
```

Для каждого продукта обязательны `privacyBoundary[]` и `evidenceLevel`.
Публичная карточка/визитка может раскрывать задачу, роль, архитектурный принцип,
стек, QA-подход, ограничения и проверяемые публичные артефакты. Запрещено
публиковать:

- персональные, медицинские, учебные, CRM, HR и клиентские данные;
- реальные переписки, медиа, телеметрию, суммы и идентификаторы tenants;
- credentials, webhook/API endpoints и deployment-конфигурацию;
- закрытый source, внутреннюю топологию и детали, защищённые NDA;
- readiness, production, accuracy, scale или business claims без evidence;
- автоматический медицинский, финансовый или proctoring-вердикт там, где
  решение остаётся за человеком.

Case copy обязана содержать отдельный `boundary` на RU/EN/UZ. Для discovery,
prototype и source-incomplete формулировки описывают подтверждённый этап и
следующий gate, но не превращают план в выполненный результат.

## 5. Репозитории, объединённые в один продукт

- GrowthOps AI: `growthops-ai`, private `platform`, `p03-support`,
  `p04-booking`, `p06-leadhunter` — одна product family.
- TTYL Platform: `TTYL-platform`, `ttyl.uz`, карточка в
  `private-projects-showcase` — один продукт.
- Task automation: public Rust `Task-manager` и private Python
  `task-manage-bot` — две явно разделённые реализации одной product family.
- LaplaceFX: `tg-bot-trading` — source alias, не отдельная карточка.
- ChAT: `ChAT-app` — канонический public source; `alif-chat` — legacy/duplicate.
- Доступное Право: private `delo` — predecessor, не отдельный текущий продукт.
- VFS Killer: private placeholder фиксирует provenance, но не доказывает
  восстановленный source или readiness.
- Klawis: private `Klawis` остаётся source, public `Klawis-PAA` является
  безопасным evidence-репозиторием и отдельной secondary CTA.
- Birthday Agent: private `birthday-agent` — один самостоятельный HR-продукт;
  его Excel-, scheduler-, audit- и QA-модули не превращаются в отдельные карточки.

Служебные `CV-Samandar`, `private-projects-showcase`, `selected-work`,
`frontend-work-index`, `qa-engineering-portfolio`, `System-sales-automation`
и профильный README являются
evidence/index-инфраструктурой и карточек не получают.

## 6. Числовые claims и стабильные evidence anchors

Числовой claim разрешён только через `claims[]` с единицей измерения,
`evidenceRef` и датой ревью. Эти значения не суммируются между продуктами и не
используются как общий счётчик портфолио.

### 5. Birthday Agent

- `automated-tests`: **718 tests**;
- `authored-templates`: **260 templates**;
- `menu-sections`: **20 sections**;
- reviewed at: `2026-08-11`;
- scope: проверенный private repository и его документированный test suite;
  значения не являются production SLA или общим счётчиком портфолио.

### 23. Vacation Control Agent

- `automated-tests`: **72 tests**;
- reviewed at: `2026-08-08`;
- scope: test suite самого Vacation Control Agent, не portfolio test count.

### 24. B24 Sales Analyst

- `automated-tests`: **80 tests**;
- reviewed at: `2026-08-08`;
- scope: test suite самого B24 Sales Analyst.

### 25. ChAT — Offline-first Messenger

- `client-tests`: **171 tests**;
- `functions-tests`: **28 tests**;
- `rules-checks`: **35 checks**;
- reviewed at: `2026-08-08`;
- scope: три разные поверхности; их нельзя выдавать за physical-device pass
  или production backend validation.

Заголовки этого раздела являются стабильными anchors для `evidenceRef` в
реестре. Значение меняется только одновременно с источником и `reviewedAt`.

## 7. Машинные инварианты

Сборка останавливается, если нарушен хотя бы один контракт:

- количество отличается от 25, а split — от 9 live / 16 case;
- повторяются `id`, `slug`, display name, rank, live/GitHub/case URL;
- route не соответствует `presentation` и `slug`;
- публичный GitHub CTA не подтверждён public alias;
- отсутствуют lifecycle, confidentiality, evidence или privacy boundary;
- RU/EN/UZ не имеют одинаковой структуры либо обязательного текста;
- карточки главной расходятся с реестром по порядку или маршрутам;
- отсутствует одна из трёх WebP-версий изображения 3:1 или превышен её
  зафиксированный byte budget;
- отсутствуют case data, architecture flow или generated HTML;
- source и generated body/metadata расходятся.

После изменения продукта порядок действий один: обновить реестр и связанный
контент, выполнить build, затем `npm run validate`. Generated HTML и sitemap
являются артефактами сборки, но их состав всегда выводится из этого реестра.
