# ADR 0003: Канонический product registry

- **Status:** Accepted

## Context

Карточки главной, live-ссылки, case-маршруты, изображения и локализованные страницы ранее могли расходиться. GitHub visibility также нельзя использовать как синоним зрелости: private/NDA, live availability и evidence level описывают разные свойства продукта.

## Decision

`src/content/product-registry.js` является единственным source of truth для публичной идентичности 29 продуктов:

- stable id/slug, порядок и portfolio state;
- lifecycle, confidentiality, presentation (`live` или `case`) и evidence level;
- live/GitHub/case routes, repository aliases, визуал и privacy boundary;
- краткие RU/EN/UZ name/descriptor.

Расширенный текст главной остаётся в `src/content/content.js`, а содержание всех 19 кейсов — в `src/projects/landings-data.js`. Валидатор связывает эти слои и останавливает build, если нарушены уникальность, порядок, 29/10/19 split, route contract, локальный паритет, asset contract или public-safety boundary.

## Consequences

- Один продукт имеет одну каноническую идентичность и не дублируется из-за нескольких repositories или переводов.
- Live-карточка всегда требует approved HTTPS URL; case-карточка всегда получает предсказуемый `/projects/<slug>/` route.
- Добавление или изменение продукта требует сначала обновить registry, затем синхронизировать richer copy и case data, выполнить build и validation.
- Registry намеренно не заменяет длинный продающий текст и архитектурное содержание кейса.

## Rejected alternatives

- **Автоматически считать каждый GitHub repository отдельным продуктом:** создаёт дубли, включает служебные/незрелые репозитории и теряет продуктовый контекст.
- **Поддерживать отдельные массивы проектов для каждой локали и страницы:** неизбежный drift порядка, URL и фактов.
- **Выводить зрелость из public/private или наличия live URL:** смешивает confidentiality, reachability и доказанность.
- **Хранить все длинные тексты внутри registry:** превращает структурный контракт в трудно проверяемый монолит.
