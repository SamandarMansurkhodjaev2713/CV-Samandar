# Release runbook

## 1. Назначение

Порядок выпуска статического портфолио на GitHub Pages без ручного расхождения
между source, generated HTML и production. Текущий контракт: 25 продуктов,
9 live-маршрутов, 16 case-маршрутов, RU/EN/UZ, 48 generated case pages и
49 URL в sitemap.

Production:
https://samandarmansurkhodjaev2713.github.io/CV-Samandar/

Baseline rollback: tag pre-awwwards-v210.

## 2. Перед началом

- Node.js 20+.
- Чистый checkout release-ветки.
- npm ci завершён без изменения lockfile.
- _otvety_extracted.txt и другие пользовательские untracked-файлы не входят
  в staging.
- Все публичные утверждения и NDA-границы прошли truth review.
- Следующий asset version выбран один раз и не меняется в середине приёмки.

Проверить состояние:

    git status --short
    git branch --show-current
    git fetch origin --prune
    npm ci

## 3. Локальный release gate

Выполнять в указанном порядке:

    npm run scan:secrets
    npm audit --audit-level=high
    npm run validate
    npm run check:build
    npm test
    npm run test:performance
    npm run check:live
    npm run qa:visual
    git diff --check

qa:visual сохраняет ignored-артефакты в tmp/release-qa/: 12 сцен главной и
16 полноразмерных case pages на desktop/mobile плюс четыре contact sheet.
Full-page case capture сначала выполняет реальный scroll-sweep, поэтому
IntersectionObserver/lazy content входит в проверку.

Ручная приёмка:

- открыть четыре contact sheet;
- точечно открыть самые длинные full-page PNG;
- проверить Chrome/Android и Safari/iOS на реальном устройстве;
- проверить критический keyboard flow;
- проверить NVDA или VoiceOver;
- записать выполненное и ограничения в docs/QA-MATRIX.md.

Ручной пункт нельзя отмечать по эмуляции.

## 4. Финальный asset bump

Только после принятия контента и визуала:

    npm run bump:assets -- NEXT
    npm run check:build
    npm run validate
    npm test
    npm run test:performance

Проверить, что index.html содержит один version number, а generated case pages
ссылаются на него. Повторный bump без новой runtime-правки не делать.

## 5. Commit и review

    git status --short
    git add EXPLICIT_FILE_LIST
    git diff --cached --check
    git diff --cached --stat
    git commit -m "feat: выпустить Awwwards-переработку портфолио"
    git push -u origin codex/awwwards-rebuild

Перед merge убедиться, что _otvety_extracted.txt, tmp/, test-results/ и локальные
отчёты не staged. Quality workflow должен быть зелёным.

## 6. Публикация

Deploy workflow запускается push в main или вручную через workflow_dispatch.
Рекомендуемый путь — review ветки, затем fast-forward или merge подтверждённого
commit в main.

Workflow обязан:

1. установить locked dependencies;
2. выполнить dependency audit и secret scan;
3. дважды собрать generated artifacts;
4. проверить отсутствие generated drift;
5. выполнить полную Playwright-матрицу;
6. сформировать Pages artifact только из allowlist;
7. развернуть artifact;
8. после deploy выполнить production smoke и проверить 9 live URL.

Не считать GitHub Pages зелёным только по завершению job deploy: обязательна
зелёная verify-production.

## 7. Post-deploy проверка

Автоматически:

    npm run test:production
    npm run check:live

test:production проверяет:

- реальную главную и 25 карточек;
- отсутствие first-party HTTP errors/runtime page errors;
- 48 статических case URL и правильный lang;
- возврат TTYL к #proj-ttyl без повторного intro.

Ручной smoke:

- hard refresh production с уникальным query;
- intro первого и повторного визита;
- menu → Projects → case → back;
- RU/EN/UZ;
- mobile dock/landscape;
- Builder result → Contact;
- CV PDF;
- custom 404.

После подтверждения создать release tag на фактически развернутом commit.

## 8. Откат

### Обычный откат

Предпочтителен новый revert commit: история остаётся аудируемой, а Pages
получает обычный проверяемый deploy.

    git switch main
    git pull --ff-only origin main
    git revert RELEASE_COMMIT
    git push origin main

Дождаться полного workflow и повторить production smoke.

### Откат серии commit

Создать отдельную rollback-ветку от актуального main, выполнить
последовательные git revert в обратном порядке, прогнать локальный gate и только
затем merge/push. Не использовать reset --hard или force-push.

### Аварийный baseline

pre-awwwards-v210 — последняя защищённая baseline-точка. Она используется для
анализа/восстановления, но не публикуется force-push. Сформировать обычный
commit, возвращающий нужные файлы к baseline, затем пройти текущий security и
deployment gate.

## 9. Hotfix

1. Воспроизвести production-дефект.
2. Добавить regression test.
3. Исправить минимальный source-of-truth.
4. Пересобрать generated files.
5. Выполнить targeted test и полный обязательный gate.
6. Поднять asset version, если менялся загружаемый runtime/стиль/контент.
7. Выпустить обычным workflow и подтвердить production.

P0/P1 нельзя обходить отключением эффекта без документированного degraded
решения и теста.

## 10. Доказательства релиза

Сохранить:

- release commit и tag;
- URL/ID зелёных quality и deploy workflows;
- вывод validate, determinism, audit, secret scan и performance gate;
- production smoke;
- visual contact sheets;
- выполненные реальные device/screen-reader пункты;
- известные P2/ограничения, если они согласованы.
