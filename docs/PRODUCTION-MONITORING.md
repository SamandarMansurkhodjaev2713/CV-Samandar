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

1. `npm run test:production` — главная, 24 карточки, 45 RU / EN / UZ case URL,
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

## 24–48-часовое наблюдение релиза 2.12.0

Начальный post-deploy smoke коммита `155c73c` прошёл 2026-08-10 в GitHub
Actions run `31336811572`; независимый локальный запуск production smoke дал
3/3 PASS, а live verifier — 9/9 PASS. Следующие scheduled runs являются
продолжением наблюдения. Итог 24–48 часов фиксируется в
`docs/IMPLEMENTATION-LOG.md` только по фактически завершённым запускам.

Physical iPhone/Android и NVDA/VoiceOver/TalkBack остаются отдельным ручным
evidence и не подменяются этим workflow.
