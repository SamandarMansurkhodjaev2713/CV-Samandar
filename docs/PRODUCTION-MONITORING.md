# Production monitoring

## Назначение

После выпуска портфолио проверяется не только в момент deploy. Отдельный
workflow `.github/workflows/production-monitor.yml` каждые шесть часов и по
ручному запуску выполняет синтетическую проверку фактически опубликованного
сайта.

Production URL:
https://samandarmansurkhodjaev2713.github.io/CV-Samandar/

Мониторинг не собирает пользовательские данные, не добавляет аналитику в
клиентский runtime и не является полевым RUM. Его результаты нельзя называть
реальными Core Web Vitals аудитории или доказательством физического устройства.

## Контур проверки

Каждый запуск последовательно выполняет:

1. `npm run test:production` — главная, 26 карточек, 48 RU / EN / UZ case URL,
   runtime/network errors и возврат case → точная карточка без intro;
2. `npm run monitor:production` — desktop 1440×1000 и mobile 412×839 в
   Chromium;
3. `npm run check:live` — 9 внешних live-продуктов;
4. загрузку `tmp/production-monitor/metrics.json` как GitHub Actions artifact
   с retention 14 дней, включая failed run.

Синтетический отчёт содержит:

- время до готовности основного интерфейса;
- TTFB, DOMContentLoaded, FCP и LCP;
- CLS;
- количество, сумму и максимум long tasks;
- максимальную измеренную event latency;
- p50/p95/max scroll-frame и baseline конкретного runner;
- transfer size, resource count и фактический motion tier;
- first-party HTTP, request и page errors.

## Пороги тревоги

| Метрика | Desktop | Mobile | Причина |
|---|---:|---:|---|
| Main ready | ≤ 9.0 s | ≤ 9.5 s | включает осознанное intro и сетевой запас Pages |
| LCP | ≤ 5.0 s | ≤ 5.5 s | аварийный production-порог, строже проверяется локальным performance gate |
| CLS | ≤ 0.15 | ≤ 0.15 | защищает композицию от заметного сдвига |
| Long task max | ≤ 2.0 s | ≤ 2.0 s | ловит зависание bootstrap/runtime |
| Scroll frame p95 | ≤ max(55 ms, baseline × 2.5) | ≤ max(65 ms, baseline × 2.5) | отделяет стоимость сайта от нагрузки shared runner |
| First-party failures | 0 | 0 | любой сбой опубликованного ресурса блокирует PASS |

Baseline-нормализация применяется только к frame pacing. Она не смягчает
HTTP/runtime, LCP, CLS, main-ready или long-task ограничения.

## Реакция на красный запуск

1. Открыть JSON artifact и failed step.
2. Повторить локально `npm run monitor:production` и
   `npm run test:production`.
3. Отличить воспроизводимый дефект от внешнего сбоя GitHub Pages/сети.
4. Для продуктового дефекта добавить regression test до исправления.
5. Выпустить обычный проверяемый commit по `docs/RELEASE-RUNBOOK.md` — без
   force-push, ручной подмены generated-файлов или отключения gate.
6. Закрывать инцидент только после зелёного deploy и следующего production
   monitor.

## 24–48-часовое наблюдение релиза 2.12.1

Release `v2.12.1` указывает на commit `eb3e405`. Deploy workflow
`31368347969` завершил build/deploy/verify-production без annotations;
независимый production smoke дал 3/3 PASS, а live verifier — 9/9 PASS.
Scheduled run `31368418978` и дополнительный manual run `31369244468` на том
же SHA также полностью зелёные и сохранили JSON artifacts. Последний artifact:
desktop ready 3337 ms, LCP 660 ms, CLS 0.0016; mobile ready 3010 ms, LCP 216
ms, CLS 0.0058; оба профиля — без first-party failures и violations. Следующие
scheduled runs являются продолжением наблюдения. Итог 24–48 часов фиксируется
в `docs/IMPLEMENTATION-LOG.md` только по фактически завершённым запускам.

Physical iPhone/Android и NVDA/VoiceOver/TalkBack остаются отдельным ручным
evidence и не подменяются этим workflow.

## Наблюдение релиза 2.13.1 — в работе

Runtime `v2.13.1 / v233` опубликован 2026-08-13. Code SHA — `374d4c80`,
финальный release/docs SHA — `07cb769`. Deploy workflow `31678159935` завершил
build, deploy и verify-production со статусом success; независимый smoke — 3/3,
live verifier — 9/9.

Final-SHA monitor `31678896168` завершился success и сохранил JSON artifact:

- desktop 1440×1000: main ready 3306 ms, FCP 208 ms, LCP 1488 ms,
  CLS 0.0014, frame p95 66.8 ms, long-task max 186 ms;
- mobile 412×839: main ready 3012 ms, FCP 140 ms, LCP 200 ms,
  CLS 0.0051, frame p95 33.4 ms, long-task max 137 ms;
- оба профиля: first-party failures 0, budget violations 0, motion tier `low`.

Окно наблюдения считается от final-SHA monitor 2026-08-13 07:42 UTC. Итог
после 24 и 48 часов фиксируется только по фактическим scheduled runs. Текущий
статус — `IN PROGRESS`; один зелёный запуск не объявляется завершённым окном.

Physical mobile и assistive technology выполняются отдельно по
[physical mobile/AT protocol](PHYSICAL-AT-QA-PROTOCOL.md) и до фактического
sign-off остаются `NOT RUN`.

Documentation-hardening SHA `fa0c63b` опубликован workflow `31681227107`:
build, deploy и verify-production — success; независимый smoke — 3/3, live
routes — 9/9. Monitor `31682231539` на этом SHA завершился success:

- desktop: main ready 3219 ms, LCP 1736 ms, CLS 0.0013,
  frame p95 83.4 ms, long-task max 265 ms;
- mobile: main ready 3063 ms, LCP 188 ms, CLS 0.0045,
  frame p95 33.3 ms, long-task max 177 ms;
- failures 0, violations 0, motion tier `low` в обоих профилях.

Этот запуск подтверждает опубликованный documentation hardening и неизменный
runtime `v233`, но не завершает календарное окно наблюдения.
