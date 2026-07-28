# Product registry audit

Дата аудита: 2026-07-28
Источник: доступные репозитории GitHub + текущие данные портфолио
Статус: рабочий канон перед переносом в машинно-проверяемый registry

## 1. Правило учёта

Карточка соответствует **самостоятельному продукту**, а не репозиторию.

Один продукт может иметь:

- приватный рабочий репозиторий;
- публичный proof/showcase-репозиторий;
- live-сайт;
- внутреннюю безопасную case page.

Это всё одна карточка. Репозиторий-указатель, mirror, отдельная реализация того
же продукта или кодовая база публичной витрины не создают новую карточку.

## 2. Текущий канон: 21 продукт

| # | Product ID | Отображаемое имя | Репозиторий / доказательство | Маршрут |
|---:|---|---|---|---|
| 1 | `klawis` | Klawis — Legal AI Assistant | private `Klawis` | live `klawis.uz` |
| 2 | `softly` | CoupleOS / Softly | private `CoupleOS` | live `softlylove.uz` |
| 3 | `growthops-ai` | GrowthOps AI | public `growthops-ai` + private `platform` | internal case |
| 4 | `ttyl` | TTYL Platform | private `TTYL-platform` + public pointer `ttyl.uz` | internal case |
| 5 | `dostupnoe-pravo` | Доступное Право | public `dostupnoe-pravo` | live |
| 6 | `ai-classroom` | AI Classroom Intelligence | private `AI-Classroom` | internal case |
| 7 | `car-superapp` | CAR Superapp | private `CarSuperApp` | internal case |
| 8 | `helion` | Helion | public `helion` | GitHub Pages live |
| 9 | `stones` | Stones | public `stones` | GitHub Pages live |
| 10 | `sentinel` | Sentinel Edge | public `sentinel-edge-smart-system` | GitHub Pages live |
| 11 | `cardioguard` | CardioGuard | public `cardioguard` | GitHub Pages demo |
| 12 | `task-manager` | Task-manager / Task Manage Bot | public Rust `Task-manager` + private Python `task-manage-bot` | one internal case |
| 13 | `marketbot` | Marketbot | private `marketbot` | internal case |
| 14 | `izatullo` | IZATULO / BEL ALMA | private `izatullo-komir-` | live `izzatullo.uz` |
| 15 | `forge` | Forge / Learning OS | private `forge-learning-os` | internal case |
| 16 | `belfproctor` | BelfProctor | safe case evidence; отдельный repo не найден в доступном списке | internal case |
| 17 | `laplacefx` | LaplaceFX | private `tg-bot-trading` | internal case |
| 18 | `bioflux` | BioFlux Observer | public `bioflux-observer` | internal case + GitHub |
| 19 | `vfs-killer` | VFS Killer | private placeholder `Vfs-killer-main-add-supabase-logic` | internal case |
| 20 | `med-exe` | med-exe | private `med-exe` | internal case |
| 21 | `3d-landing` | 3D Landing | public `3d-landing` | GitHub Pages live |

### Объединения, которые нельзя снова разнести в дубли

- `growthops-ai` и `platform` — публичная витрина и приватное рабочее ядро
  одного GrowthOps AI.
- `TTYL-platform`, `ttyl.uz` и TTYL-card в `private-projects-showcase` — один
  TTYL Platform.
- `Task-manager` и `task-manage-bot` — две доказательные реализации одного
  направления Telegram task automation; текущая case page честно объясняет
  обе.
- `tg-bot-trading` — кодовая база LaplaceFX, а не отдельный продукт.
- `Vfs-killer-main-add-supabase-logic` — источник VFS Killer, а не новая
  карточка.

### Обязательные корректировки фактов

- **CAR Superapp:** repository подтверждает discovery/architecture phase, а не
  готовую production foundation. В машинном реестре и публичном тексте статус
  меняется на `DISCOVERY`; RLS, CI и production нельзя выдавать за уже
  реализованный результат.
- **VFS Killer:** связанный repository является placeholder без восстановленного
  source. Продукт сохраняется в полном каталоге только как
  `SOURCE_INCOMPLETE / HOLD`, не попадает в featured и не называется готовой
  NDA-системой до появления доказательств.
- **Task automation:** public Rust Task-manager и private Python voice-to-task
  bot — две реализации одной продуктовой семьи. В case page они подписываются
  отдельно со своими stack и maturity; общий `PROD` на обе реализации не
  распространяется.
- **GrowthOps AI:** public repository — showcase, private `platform` — source,
  а p03/p04/p06 — child implementations. Это смешанная visibility-модель, не
  просто «private project».
- **BelfProctor:** repository не найден. Допустим только evidence-level
  `CASE_ONLY`; новые технические утверждения без источника запрещены.
- **Sentinel Edge:** доступный GitHub Pages подтверждает `LIVE_DEMO`, но не
  production deployment.
- `NDA`, `private` и `sensitive` описывают confidentiality, а `DISCOVERY`,
  `BUILD`, `PROTOTYPE`, `DEMO`, `LIVE` и `PRODUCTION` — lifecycle. Эти оси
  больше не смешиваются в одном поле.

## 3. Подтверждённые новые продукты

### 22. Vacation Control Agent

**Repository:** private `Bodom-vacation-agent`
**Тип:** HR operations automation
**Предлагаемый slug:** `vacation-control`

Самостоятельный Telegram-агент, который:

- читает график отпусков из Excel;
- формирует Word-приказ;
- ведёт последовательное подтверждение внесения сотрудников в учётную
  систему;
- сохраняет state в SQLite;
- защищает от повторных отправок и не теряет незакрытые случаи;
- имеет 72 автоматических теста и отдельные QA/compliance документы.

**Решение:** `INCLUDE_AS_PRIVATE_CASE`.

**Privacy gate:** в рабочем Excel присутствуют реальные ФИО. Ни имена,
ни строки таблицы, ни внутренний шаблон компании, ни Telegram username клиента
не публикуются. В case page показывается только абстрактный workflow и
инженерные гарантии.

### 23. B24 Sales Analyst

**Repository:** private `b24agent`
**Тип:** CRM analytics / decision support
**Предлагаемый slug:** `b24-sales-analyst`

Самостоятельный агент-аналитик:

- читает Bitrix24 через read-only webhook;
- синхронизирует сделки в локальную SQLite;
- считает метрики детерминированным SQL;
- использует LLM только для объяснения уже рассчитанных данных;
- отправляет day/week/month отчёты в Telegram;
- сверяет локальные цифры с CRM;
- маскирует secrets и персональные данные;
- имеет 80 тестов и отдельный QA-журнал.

**Решение:** `INCLUDE_AS_PRIVATE_CASE`.

**Privacy gate:** не публикуются CRM endpoint, структура реального портала,
названия клиентов, сотрудники, суммы, chat ID и фактические показатели
компании.

### 24. ChAT — Offline-first Messenger

**Repositories:** public `ChAT-app` и `alif-chat`
**Тип:** React Native / realtime / security
**Предлагаемый slug:** `chat-app`

Оба репозитория описывают один продукт и не могут стать двумя карточками.
Каноническим источником до дополнительной diff-проверки считается более свежий
`ChAT-app`; `alif-chat` — duplicate/mirror reference.

Доказанная поверхность:

- React Native + Expo + TypeScript;
- Firebase Auth / Firestore / Realtime DB / Storage / Cloud Functions;
- SQLite offline outbox с idempotency и retries;
- server-side OTP с HMAC, rate limiting и timing-safe comparison;
- lint-enforced architecture;
- 171 client tests, 28 Functions tests и 35 emulator security-rule tests;
- честно задокументированы отсутствие production backend и непроведённый
  physical-device pass.

**Решение:** `INCLUDE_AS_PUBLIC_CASE`, не `LIVE`.

Пока production backend отсутствует, карточка не получает ложную кнопку
«Открыть приложение». Primary action ведёт на честную внутреннюю case page,
secondary — на публичный GitHub. Статус: `LAB` / `OPEN SOURCE`.

## 4. Служебные репозитории — без карточек

| Репозиторий | Роль |
|---|---|
| `CV-Samandar` | исходники самого портфолио |
| `private-projects-showcase` | proof/index для приватных кейсов |
| `selected-work` | router/index |
| `frontend-work-index` | frontend index |
| `qa-engineering-portfolio` | доказательная QA-база, усиливает Stack/Quality |
| `SamandarMansurkhodjaev2713` | profile README |

Они используются как доказательства и вторичные ссылки, но не считаются
продуктами.

## 5. Закрытый аудит спорных репозиториев

| Репозиторий | Итог | Причина |
|---|---|---|
| `delo` | `EXCLUDE_DUPLICATE` | зрелый legaltech-прототип, но та же задача и почти тот же продуктовый контур, что у более сильного «Доступного Права»; прежний demo URL отвечает 404, а основной CI не совпадает с default branch |
| `p03-support` | `GROUP_WITH_GROWTHOPS` | vertical slice GrowthOps: grounded support, обязательные citations, guardrails, handoff и eval-контур; сильное evidence, но не самостоятельный продукт |
| `p04-booking` | `GROUP_WITH_GROWTHOPS` | vertical slice GrowthOps: FSM, атомарная бронь, PostgreSQL race-test и fail-closed guardrails; сильнейшее QA-evidence, но пока не автономный booking-продукт |
| `p06-leadhunter` | `GROUP_WITH_GROWTHOPS` | vertical slice GrowthOps: детерминированные фильтры, AI scoring, ручное решение, dedupe, tenant isolation и concurrency-тесты; зависит от общего Gateway |
| `TravelSuperApp` | `HOLD_EMPTY` | private repository без default branch, коммитов, README, кода, тестов и CI; назначение нельзя домысливать по названию |
| `lazy-coding` | `HOLD_PROTOTYPE` | самостоятельный gesture-mouse прототип, но только четыре unit-теста, workflow лежит не на распознаваемом GitHub Actions пути, нет camera/hardware E2E и provenance требует уточнения |

### Как используются grouped-репозитории

Они не получают карточки, но становятся проверяемыми доказательствами в case
GrowthOps AI:

- `p03-support` — grounded retrieval, citation enforcement и безопасный handoff;
- `p04-booking` — concurrency-safe reservation и детерминированная FSM;
- `p06-leadhunter` — human-in-the-loop qualification, dedupe и tenant isolation.

В публичной формулировке разрешены только архитектурные принципы и
подтверждённые агрегированные QA-факты. Нельзя раскрывать реальные базы знаний,
ICP, лиды, tenant identifiers, provider keys и клиентские конфигурации.

## 6. Окончательный итог аудита

- 21 существующий продукт сохраняется;
- добавляются 3 самостоятельных продукта;
- окончательный каталог: **24 карточки**;
- внутренних case pages: **15** — 12 текущих + 3 новых;
- внешних live-переходов остаётся **9**;
- `ChAT-app`/`alif-chat` считаются одной карточкой;
- `growthops-ai`, `platform`, `p03-support`, `p04-booking` и
  `p06-leadhunter` считаются одной продуктовой семьёй;
- `delo`, `TravelSuperApp` и `lazy-coding` в текущий релиз не входят;
- повторная оценка HOLD-кандидатов проводится только после появления
  проверяемых фактов зрелости, а не по названию или обещанию.

## 7. Машинный контракт следующего этапа

Документ должен быть перенесён в единый source-of-truth registry. Обязательные
поля:

```text
id
slug
name
visibility
maturity
presentation
featuredRank
liveUrl
githubUrl
repositoryAliases[]
casePage
image
role
stack[]
evidence[]
privacyBoundary[]
i18n.ru/en/uz
```

Финальный машинный контракт также хранит:

```text
kind: standalone | family
confidentiality: public | private_source | nda | sensitive
lifecycle: discovery | build | prototype | demo | live | production | source_incomplete
repositoryAliases[]: { name, visibility, role }
evidenceLevel: source | showcase_plus_private_source | case_only | incomplete
portfolioState: featured | catalog | hold
```

Build должен завершаться ошибкой при:

- повторе `id`, `slug`, name или канонического URL;
- отсутствующем изображении;
- внутреннем route без case data;
- `LIVE` без `liveUrl`;
- private repo URL в публичном CTA;
- неполных RU / EN / UZ данных;
- продукте без явного `privacyBoundary`;
- ссылке, которая одновременно объявлена primary live и internal case без
  заданного правила приоритета.
