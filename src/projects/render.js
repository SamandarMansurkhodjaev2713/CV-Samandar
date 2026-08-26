/* render.js — single source of truth for the product-landing markup.
 *
 * Dual-mode: this same file is `require()`d by build.js (Node) to bake each
 * landing into a static HTML file, AND loaded as a plain <script> on the landing
 * page (browser) so the language switcher can re-render client-side. There is
 * therefore exactly ONE render function — no server/client template drift.
 *
 * Everything here is pure string-building over trusted, authored content, but
 * every interpolated value still passes through esc() so a stray "<" or "&" in
 * copy can never break markup (defensive, and correct if content is ever edited
 * by a less-trusted hand).
 */
(function (root) {
  "use strict";

  var TG = "https://t.me/killallofthem13"; // primary Telegram channel (see main site links)

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // UI chrome strings (section headings, buttons) per language. Product COPY
  // lives in landings-data.js; these are the fixed labels around it.
  var UI = {
    ru: {
      allProjects: "Все проекты",
      chapters: ["Тезис", "Контекст", "Система", "Доказательства", "Границы"],
      chapterNav: "Главы кейса",
      diagramHint: "Схему можно прокручивать по горизонтали",
      publicCase: "Открыть публичный кейс",
      closed: "Закрытый проект",
      discuss: "Обсудить проект",
      viewGithub: "Смотреть на GitHub",
      requestAccess: "Запросить доступ",
      quickView: "Кратко",
      product: "Продукт",
      complexity: "Сложность",
      impact: "Эффект",
      what: "Что это",
      problem: "Какую проблему решает",
      stack: "Технический стек",
      architecture: "Архитектура",
      systemMap: "Карта системы",
      why: "Почему именно так",
      unique: "Сильные стороны",
      employer: "Что это доказывает",
      quality: "Как обеспечивалось качество",
      boundary: "Честные границы",
      qaMatrix: "Полная матрица QA-доказательств",
      backHome: "К портфолио",
      footNote: "Часть портфолио Samandar · Full-Stack · AI Automation · QA",
      builtBy: "один инженер · код · архитектура · деплой · QA",
      ctaHead: "Нужен похожий продукт?",
      ctaSub: "Соберу под ключ — от архитектуры до деплоя и QA. Отвечу с оценкой за 24 часа.",
      telegram: "Написать в Telegram",
      languageLabel: "Язык страницы",
    },
    en: {
      allProjects: "All projects",
      chapters: ["Thesis", "Context", "System", "Evidence", "Boundaries"],
      chapterNav: "Case chapters",
      diagramHint: "Swipe horizontally to inspect the system",
      publicCase: "Open public case",
      closed: "Private project",
      discuss: "Discuss a project",
      viewGithub: "View on GitHub",
      requestAccess: "Request access",
      quickView: "At a glance",
      product: "Product",
      complexity: "Complexity",
      impact: "Impact",
      what: "What it is",
      problem: "The problem it solves",
      stack: "Technical stack",
      architecture: "Architecture",
      systemMap: "System map",
      why: "Why this architecture",
      unique: "Strengths",
      employer: "What it proves",
      quality: "How quality was engineered",
      boundary: "Honest boundaries",
      qaMatrix: "Full QA evidence matrix",
      backHome: "Back to portfolio",
      footNote: "Part of Samandar's portfolio · Full-Stack · AI Automation · QA",
      builtBy: "one engineer · code · architecture · deploy · QA",
      ctaHead: "Need something like this?",
      ctaSub: "I'll build it end-to-end — from architecture to deploy and QA. I'll reply with an estimate within 24 hours.",
      telegram: "Message on Telegram",
      languageLabel: "Page language",
    },
    uz: {
      allProjects: "Barcha loyihalar",
      chapters: ["Tezis", "Kontekst", "Tizim", "Dalillar", "Chegaralar"],
      chapterNav: "Keys bo‘limlari",
      diagramHint: "Tizimni ko‘rish uchun gorizontal suring",
      publicCase: "Ochiq keysni ko‘rish",
      closed: "Yopiq loyiha",
      discuss: "Loyihani muhokama qilish",
      viewGithub: "GitHub'da ko'rish",
      requestAccess: "Kirish so'rash",
      quickView: "Qisqacha",
      product: "Mahsulot",
      complexity: "Murakkablik",
      impact: "Samara",
      what: "Bu nima",
      problem: "Qanday muammoni yechadi",
      stack: "Texnik stek",
      architecture: "Arxitektura",
      systemMap: "Tizim xaritasi",
      why: "Nega aynan shunday",
      unique: "Kuchli tomonlari",
      employer: "Bu nimani isbotlaydi",
      quality: "Sifat qanday ta'minlangan",
      boundary: "Halol chegaralar",
      qaMatrix: "To'liq QA-dalillar matritsasi",
      backHome: "Portfolioga qaytish",
      footNote: "Samandar portfoliosining bir qismi · Full-Stack · AI Automation · QA",
      builtBy: "bitta muhandis · kod · arxitektura · deploy · QA",
      ctaHead: "Shunga o'xshash mahsulot kerakmi?",
      ctaSub: "Kalit topshiriladigan holda quraman — arxitekturadan deploy va QA'gacha. 24 soatda baho bilan javob beraman.",
      telegram: "Telegram'da yozish",
      languageLabel: "Sahifa tili",
    },
  };

  function chips(stack) {
    return (stack || [])
      .map(function (s) { return '<span class="lp-chip mono">' + esc(s) + "</span>"; })
      .join("");
  }

  function quickItems(q, ui) {
    var labels = [ui.product, ui.complexity, ui.impact];
    return (q || [])
      .map(function (row, i) {
        return (
          '<div class="lp-quick-item">' +
          '<span class="lp-quick-k mono">' + esc(labels[i] || row.k || "") + "</span>" +
          '<span class="lp-quick-v">' + esc(row.v) + "</span>" +
          "</div>"
        );
      })
      .join("");
  }

  function block(title, body) {
    if (!body) return "";
    return (
      '<div class="lp-block">' +
      '<h2 class="lp-h2">' + esc(title) + "</h2>" +
      '<p class="lp-p">' + esc(body) + "</p>" +
      "</div>"
    );
  }

  function tr(lang, ru, en, uz) {
    return lang === "en" ? en : lang === "uz" ? uz : ru;
  }

  function diagramFor(slug, lang, fallback) {
    function n(id, ru, en, uz, x, y, w) {
      return { id: id, label: tr(lang, ru, en, uz), x: x, y: y, w: w || 164 };
    }
    function e(from, to, label, via) {
      return { from: from, to: to, label: label || "", via: via || null };
    }
    switch (slug) {
      case "ttyl": return {
        kind: "boundary",
        nodes: [
          n("client", "Клиентские приложения", "Client apps", "Mijoz ilovalari", 38, 112, 170),
          n("rbac", "API + RBAC", "API + RBAC", "API + RBAC", 260, 112, 150),
          n("domain", "Доменные сервисы", "Domain services", "Domen servislar", 474, 112, 176),
          n("data", "Изолированные данные", "Isolated data", "Ajratilgan maʼlumot", 740, 112, 184),
          n("audit", "Аудит событий", "Audit trail", "Audit izi", 474, 270, 176)
        ],
        edges: [e("client","rbac"), e("rbac","domain"), e("domain","data","encrypted"), e("domain","audit","append-only")],
        zones: [{ x: 238, y: 66, w: 720, h: 188, label: tr(lang,"ЗАКРЫТЫЙ КОНТУР","PRIVATE BOUNDARY","YOPIQ KONTUR") }]
      };
      case "task-manager": return {
        kind: "timeline",
        nodes: [
          n("voice", "Голос", "Voice", "Ovoz", 34, 142, 126),
          n("stt", "Распознавание", "Transcription", "Transkripsiya", 210, 142, 160),
          n("task", "Нормализация задачи", "Task normalizer", "Vazifa normalizatori", 424, 142, 178),
          n("outbox", "Outbox + retry", "Outbox + retry", "Outbox + qayta", 654, 142, 154),
          n("delivery", "Доставка", "Delivery", "Yetkazish", 852, 142, 120)
        ],
        edges: [e("voice","stt"), e("stt","task"), e("task","outbox"), e("outbox","delivery"), e("delivery","outbox",tr(lang,"ошибка → повтор","failure → retry","xato → qayta"),[914,326,704,326])]
      };
      case "marketbot": return {
        kind: "fanin",
        nodes: [
          n("s1", "Источник A", "Source A", "Manba A", 34, 56, 126),
          n("s2", "Источник B", "Source B", "Manba B", 34, 166, 126),
          n("s3", "Источник C", "Source C", "Manba C", 34, 276, 126),
          n("queue", "Очередь событий", "Event queue", "Voqealar navbati", 306, 166, 170),
          n("rank", "Фильтр + ранжирование", "Filter + ranking", "Filtr + reyting", 570, 166, 190),
          n("offer", "Целевой оффер", "Target offer", "Maqsadli taklif", 830, 166, 142)
        ],
        edges: [e("s1","queue"),e("s2","queue"),e("s3","queue"),e("queue","rank","dedupe"),e("rank","offer","score")]
      };
      case "forge": return {
        kind: "cycle",
        nodes: [
          n("goal", "Цель обучения", "Learning goal", "Taʼlim maqsadi", 410, 34, 180),
          n("practice", "Практика", "Practice", "Amaliyot", 716, 146, 150),
          n("evidence", "Артефакт-доказательство", "Evidence artifact", "Dalil artefakti", 624, 306, 204),
          n("review", "Проверка", "Review", "Tekshiruv", 174, 306, 150),
          n("adapt", "Адаптация пути", "Path adaptation", "Yoʻlni moslash", 84, 146, 178)
        ],
        edges: [e("goal","practice"),e("practice","evidence"),e("evidence","review"),e("review","adapt"),e("adapt","goal",tr(lang,"следующая итерация","next iteration","keyingi iteratsiya"))]
      };
      case "belfproctor": return {
        kind: "chain",
        nodes: [
          n("capture", "Фиксация события", "Event capture", "Voqeani qayd etish", 34, 146, 170),
          n("seal", "Запечатанное доказательство", "Sealed evidence", "Muhrlangan dalil", 254, 146, 188),
          n("policy", "Проверка политики", "Policy checks", "Siyosat tekshiruvi", 492, 146, 168),
          n("human", "Решение эксперта", "Human decision", "Ekspert qarori", 710, 146, 170),
          n("report", "Протокол", "Decision record", "Qaror protokoli", 900, 146, 88)
        ],
        edges: [e("capture","seal","hash"),e("seal","policy","immutable"),e("policy","human"),e("human","report")],
        zones: [{ x: 224, y: 92, w: 472, h: 180, label: tr(lang,"ЦЕПОЧКА СОХРАННОСТИ","CHAIN OF CUSTODY","DALIL ZANJIRI") }]
      };
      case "vfs-killer": return {
        kind: "state",
        nodes: [
          n("request", "Запрос", "Request", "Soʻrov", 38, 152, 130),
          n("gate", "Нестабильный шлюз", "Unstable gateway", "Beqaror shlyuz", 240, 152, 180),
          n("ok", "Подтверждено", "Confirmed", "Tasdiqlandi", 520, 62, 160),
          n("fail", "Сбой", "Failure", "Xato", 520, 250, 140),
          n("recover", "Recovery state", "Recovery state", "Tiklash holati", 758, 250, 174),
          n("done", "Чистый результат", "Clean result", "Toza natija", 800, 62, 166)
        ],
        edges: [e("request","gate"),e("gate","ok","2xx"),e("ok","done"),e("gate","fail","timeout"),e("fail","recover","backoff"),e("recover","gate","retry",[845,366,328,366])]
      };
      case "med-exe": return {
        kind: "trace",
        nodes: [
          n("input", "Типизированный ввод", "Typed input", "Tiplashtirilgan kirish", 30, 150, 174),
          n("ipc", "Граница IPC", "IPC boundary", "IPC chegarasi", 250, 150, 154),
          n("calc", "Детерминированный расчёт", "Deterministic calc", "Deterministik hisob", 450, 150, 196),
          n("verify", "Проверка инвариантов", "Invariant checks", "Invariant tekshiruvi", 694, 150, 184),
          n("output", "Трассируемый вывод", "Traceable output", "Kuzatiladigan chiqish", 916, 150, 72)
        ],
        edges: [e("input","ipc","schema"),e("ipc","calc","typed"),e("calc","verify","trace"),e("verify","output","valid")]
      };
      case "bioflux": return {
        kind: "threshold",
        nodes: [
          n("sensor", "Датчик потока", "Flow sensor", "Oqim sensori", 34, 150, 154),
          n("stream", "Телеметрия", "Telemetry stream", "Telemetriya", 244, 150, 160),
          n("threshold", "Порог + гистерезис", "Threshold + hysteresis", "Chegara + gisterezis", 460, 150, 196),
          n("alert", "Событие", "Alert event", "Hodisa", 730, 62, 144),
          n("archive", "История", "Time archive", "Vaqt arxivi", 730, 254, 144)
        ],
        edges: [e("sensor","stream"),e("stream","threshold"),e("threshold","alert",tr(lang,"выше порога","above threshold","chegaradan yuqori")),e("stream","archive",tr(lang,"всегда","always","doim"))]
      };
      case "growthops-ai": return {
        kind: "factory",
        nodes: [
          n("brief", "Узкий бриф", "Narrow brief", "Aniq brif", 26, 150, 150),
          n("module", "Модуль продукта", "Product module", "Mahsulot moduli", 226, 150, 164),
          n("ai", "AI-операция", "AI operation", "AI operatsiya", 438, 58, 154),
          n("workflow", "Автоматизация", "Workflow", "Avtomatlashtirish", 438, 252, 154),
          n("verify", "Контур QA", "QA envelope", "QA konturi", 670, 150, 160),
          n("deploy", "Деплой", "Deploy", "Deploy", 884, 150, 104)
        ],
        edges: [e("brief","module"),e("module","ai"),e("module","workflow"),e("ai","verify"),e("workflow","verify"),e("verify","deploy","release gate")]
      };
      case "car-superapp": return {
        kind: "tenant",
        nodes: [
          n("client", "Клиент", "Customer", "Mijoz", 30, 68, 130),
          n("branch", "Филиал", "Branch", "Filial", 30, 262, 130),
          n("rls", "Auth + tenant RLS", "Auth + tenant RLS", "Auth + tenant RLS", 252, 162, 184),
          n("order", "Заказ-наряд", "Service order", "Servis buyurtmasi", 506, 162, 174),
          n("ops", "Операции сервиса", "Service operations", "Servis operatsiyalari", 730, 162, 184),
          n("ledger", "История", "Ledger", "Tarix", 926, 162, 62)
        ],
        edges: [e("client","rls"),e("branch","rls"),e("rls","order","tenant scope"),e("order","ops"),e("ops","ledger")],
        zones: [{ x: 226, y: 112, w: 752, h: 176, label: tr(lang,"ГРАНИЦА ТЕНАНТА","TENANT BOUNDARY","TENANT CHEGARASI") }]
      };
      case "ai-classroom": return {
        kind: "review",
        nodes: [
          n("signal", "Оптический сигнал", "Optical signal", "Optik signal", 28, 150, 168),
          n("detect", "Детектор событий", "Event detector", "Hodisa detektori", 244, 150, 170),
          n("evidence", "Пакет доказательств", "Evidence packet", "Dalil paketi", 466, 150, 174),
          n("human", "Проверка человеком", "Human review", "Inson tekshiruvi", 694, 150, 174),
          n("decision", "Подтверждённое событие", "Verified event", "Tasdiqlangan hodisa", 916, 150, 74)
        ],
        edges: [e("signal","detect"),e("detect","evidence","confidence"),e("evidence","human","provenance"),e("human","decision"),e("human","detect",tr(lang,"коррекция","feedback","tuzatish"),[780,346,330,346])]
      };
      case "laplacefx": return {
        kind: "gates",
        nodes: [
          n("data", "Исторические данные", "Historical data", "Tarixiy maʼlumot", 26, 150, 168),
          n("walk", "Walk-forward окна", "Walk-forward windows", "Walk-forward oynalar", 238, 150, 184),
          n("risk", "Risk gates", "Risk gates", "Risk gates", 474, 150, 148),
          n("paper", "Paper execution", "Paper execution", "Paper execution", 674, 62, 166),
          n("reject", "Отклонено", "Rejected", "Rad etildi", 674, 254, 150),
          n("report", "Измеримый отчёт", "Measured report", "Oʻlchangan hisobot", 894, 62, 94)
        ],
        edges: [e("data","walk"),e("walk","risk","out-of-sample"),e("risk","paper","pass"),e("risk","reject","fail"),e("paper","report","evidence")]
      };
      case "vacation-control": return {
        kind: "workflow",
        nodes: [
          n("schedule", "График Excel", "Excel schedule", "Excel jadvali", 24, 138, 148),
          n("normalize", "Нормализация", "Normalization", "Normalizatsiya", 212, 138, 154),
          n("state", "Workflow state", "Workflow state", "Workflow holati", 410, 138, 166),
          n("document", "Документ Word", "Word document", "Word hujjati", 624, 52, 164),
          n("confirm", "Подтверждение", "Confirmation", "Tasdiqlash", 824, 52, 148),
          n("recovery", "SQLite recovery", "SQLite recovery", "SQLite tiklash", 624, 254, 164)
        ],
        edges: [e("schedule","normalize"),e("normalize","state","validated"),e("state","document","next step"),e("document","confirm"),e("state","recovery","persist"),e("recovery","state",tr(lang,"продолжить","resume","davom"),[704,364,482,364])]
      };
      case "birthday-agent": return {
        kind: "calendar-lock",
        nodes: [
          n("registry", "Реестр Excel", "Excel registry", "Excel reyestri", 20, 144, 144),
          n("preview", "Черновик различий", "Change preview", "Farqlar drafti", 204, 52, 168),
          n("decision", "Решение человека", "Human decision", "Inson qarori", 204, 254, 168),
          n("domain", "Доменные инварианты", "Domain invariants", "Domain invariantlar", 418, 144, 178),
          n("scheduler", "Один scheduler", "Single scheduler", "Bitta scheduler", 642, 52, 156),
          n("guard", "Unique event guard", "Unique event guard", "Unique event guard", 642, 254, 156),
          n("channel", "Публикация", "Publication", "Yuborish", 850, 144, 128)
        ],
        edges: [
          e("registry","preview","parse"),
          e("preview","decision",tr(lang,"неоднозначно","ambiguous","noaniq")),
          e("preview","domain",tr(lang,"подтверждено","confirmed","tasdiqlandi")),
          e("decision","domain",tr(lang,"разрешено","resolved","hal qilindi")),
          e("domain","scheduler",tr(lang,"срок наступил","date due","sana keldi")),
          e("scheduler","guard","advisory lock"),
          e("domain","guard","unique constraint"),
          e("guard","channel","exactly once")
        ],
        zones: [
          { x: 184, y: 20, w: 212, h: 336, label: tr(lang,"ИМПОРТ БЕЗ ИЗМЕНЕНИЙ","NON-MUTATING IMPORT","O‘ZGARTIRMAYDIGAN IMPORT") },
          { x: 620, y: 20, w: 366, h: 336, label: tr(lang,"КОНТУР ОДНОЙ ПУБЛИКАЦИИ","EXACTLY-ONCE BOUNDARY","BITTA YUBORISH KONTURI") }
        ]
      };
      case "b24-sales-analyst": return {
        kind: "reconcile",
        nodes: [
          n("crm", "Bitrix24", "Bitrix24", "Bitrix24", 22, 144, 126),
          n("adapter", "Read-only adapter", "Read-only adapter", "Read-only adapter", 188, 144, 166),
          n("snapshot", "Source snapshot", "Source snapshot", "Source snapshot", 394, 144, 162),
          n("metrics", "SQL-метрики", "SQL metrics", "SQL metrikalar", 604, 52, 154),
          n("reconcile", "Сверка", "Reconciliation", "Solishtirish", 604, 254, 154),
          n("facts", "Verified facts", "Verified facts", "Verified facts", 806, 144, 158)
        ],
        edges: [e("crm","adapter","read only"),e("adapter","snapshot"),e("snapshot","metrics","deterministic"),e("snapshot","reconcile","control totals"),e("metrics","facts"),e("reconcile","facts","match")],
        zones: [{ x: 168, y: 92, w: 416, h: 174, label: tr(lang,"КОНТУР БЕЗ ЗАПИСИ","READ-ONLY BOUNDARY","READ-ONLY KONTUR") }]
      };
      case "chat-app": return {
        kind: "outbox",
        nodes: [
          n("message", "Локальное сообщение", "Local message", "Lokal xabar", 22, 144, 168),
          n("outbox", "SQLite outbox", "SQLite outbox", "SQLite outbox", 232, 144, 160),
          n("worker", "Sync worker", "Sync worker", "Sync worker", 438, 144, 148),
          n("firebase", "Firebase services", "Firebase services", "Firebase services", 638, 52, 168),
          n("rules", "Security rules", "Security rules", "Security rules", 638, 254, 168),
          n("delivery", "Delivery evidence", "Delivery evidence", "Delivery evidence", 852, 144, 132)
        ],
        edges: [e("message","outbox","durable"),e("outbox","worker","pending"),e("worker","firebase","bounded retry"),e("worker","rules","authorize"),e("rules","firebase","allow"),e("firebase","delivery","ack"),e("firebase","outbox",tr(lang,"сбой → retry","failure → retry","xato → retry"),[726,364,306,364])],
        zones: [{ x: 8, y: 92, w: 404, h: 174, label: tr(lang,"OFFLINE-FIRST КОНТУР","OFFLINE-FIRST BOUNDARY","OFFLINE-FIRST KONTUR") }]
      };
      case "dentforma": return {
        kind: "revision",
        nodes: [
          n("upload", "Приватный STL-кейс", "Private STL case", "Private STL keys", 22, 144, 166),
          n("preflight", "File preflight", "File preflight", "File preflight", 226, 144, 150),
          n("reference", "Reference · неизменно", "Immutable reference", "O‘zgarmas reference", 420, 54, 184),
          n("editor", "Deterministic editor", "Deterministic editor", "Deterministic editor", 420, 250, 184),
          n("draft", "Private draft", "Private draft", "Private draft", 652, 250, 150),
          n("revision", "Immutable revision", "Immutable revision", "Immutable revision", 842, 144, 146)
        ],
        edges: [e("upload","preflight","bounded"),e("preflight","reference","checksum"),e("preflight","editor","editable slot"),e("reference","revision","compare"),e("editor","draft","save"),e("draft","revision","confirm")],
        zones: [{ x: 398, y: 18, w: 408, h: 344, label: tr(lang,"КОНТУР КОНТРОЛИРУЕМОЙ ПРАВКИ","BOUNDED EDIT BOUNDARY","CHEGARALANGAN TAHRIR KONTURI") }]
      };
      case "meetingflow-ru-uz": return {
        kind: "relay",
        nodes: [
          n("request", "Разрешённый запрос", "Authorised request", "Ruxsatli so‘rov", 18, 144, 164),
          n("relay", "Signed relay", "Signed relay", "Signed relay", 220, 144, 144),
          n("state", "Meeting state", "Meeting state", "Meeting state", 404, 144, 154),
          n("record", "Recorder ready", "Recorder ready", "Recorder ready", 604, 52, 158),
          n("speech", "RU/UZ transcript", "RU/UZ transcript", "RU/UZ transcript", 604, 254, 158),
          n("delivery", "Doc + delivery receipt", "Doc + delivery receipt", "Doc + delivery receipt", 816, 144, 168)
        ],
        edges: [e("request","relay","signature"),e("relay","state","idempotent"),e("state","record","webhook + poll"),e("record","speech","audio ready"),e("speech","delivery","persist"),e("delivery","state",tr(lang,"статус доставки","delivery state","delivery holati"),[902,362,478,362])],
        zones: [{ x: 198, y: 94, w: 392, h: 168, label: tr(lang,"УПРАВЛЯЕМЫЙ GOOGLE-КОНТУР","MANAGED GOOGLE BOUNDARY","BOSHQARILADIGAN GOOGLE KONTURI") }]
      };
      case "telegram-sheets-task-bot": return {
        kind: "transaction",
        nodes: [
          n("update", "Telegram update", "Telegram update", "Telegram update", 18, 144, 150),
          n("auth", "Auth + signed action", "Auth + signed action", "Auth + signed action", 210, 144, 176),
          n("domain", "Domain transition", "Domain transition", "Domain transition", 428, 144, 164),
          n("batch", "Atomic batchUpdate", "Atomic batchUpdate", "Atomic batchUpdate", 634, 144, 174),
          n("state", "Task + audit + offset", "Task + audit + offset", "Task + audit + offset", 850, 52, 136),
          n("outbox", "Outbox + retry", "Outbox + retry", "Outbox + retry", 850, 254, 136)
        ],
        edges: [e("update","auth","telegram_id"),e("auth","domain","version"),e("domain","batch","transaction plan"),e("batch","state","one commit"),e("batch","outbox","one commit"),e("outbox","update",tr(lang,"ошибка → повтор","failure → retry","xato → retry"),[910,366,96,366])],
        zones: [{ x: 612, y: 18, w: 376, h: 344, label: tr(lang,"ОДНА АТОМАРНАЯ ЗАПИСЬ","ONE ATOMIC COMMIT","BITTA ATOMAR COMMIT") }]
      };
      default:
        return {
          kind: "pipeline",
          nodes: (fallback || []).slice(0, 5).map(function (label, i) { return { id: "n" + i, label: label, x: 32 + i * 194, y: 150, w: 154 }; }),
          edges: (fallback || []).slice(1, 5).map(function (_, i) { return e("n" + i, "n" + (i + 1)); })
        };
    }
  }

  function diagramMap(slug, lang, fallback, title, hint) {
    var d = diagramFor(slug, lang, fallback);
    var byId = {};
    d.nodes.forEach(function (node) { byId[node.id] = node; });
    var markerId = "lp-arrow-" + slug;
    function pathFor(edge) {
      var a = byId[edge.from]; var b = byId[edge.to];
      if (!a || !b) return "";
      var ax = a.x + a.w / 2; var ay = a.y + 36;
      var bx = b.x + b.w / 2; var by = b.y + 36;
      if (edge.via && edge.via.length === 4) {
        return "M" + ax + " " + ay + " C" + edge.via[0] + " " + edge.via[1] + "," + edge.via[2] + " " + edge.via[3] + "," + bx + " " + by;
      }
      return "M" + ax + " " + ay + " L" + bx + " " + by;
    }
    var zones = (d.zones || []).map(function (z) {
      return '<g class="lp-diagram-zone"><rect x="' + z.x + '" y="' + z.y + '" width="' + z.w + '" height="' + z.h + '" rx="20"></rect><text x="' + (z.x + 16) + '" y="' + (z.y + 24) + '">' + esc(z.label) + '</text></g>';
    }).join("");
    var edges = d.edges.map(function (edge) {
      var a = byId[edge.from]; var b = byId[edge.to];
      if (!a || !b) return "";
      var lx = (a.x + a.w / 2 + b.x + b.w / 2) / 2;
      var ly = (a.y + b.y) / 2 + 22;
      return '<g class="lp-diagram-edge"><path d="' + pathFor(edge) + '" marker-end="url(#' + markerId + ')"></path>' +
        (edge.label ? '<text x="' + lx + '" y="' + ly + '">' + esc(edge.label) + '</text>' : '') + '</g>';
    }).join("");
    var nodes = d.nodes.map(function (node, i) {
      return '<g class="lp-diagram-node" style="--node-i:' + i + '" transform="translate(' + node.x + ' ' + node.y + ')">' +
        '<rect width="' + node.w + '" height="72" rx="14"></rect>' +
        '<text x="' + (node.w / 2) + '" y="42" text-anchor="middle" textLength="' + Math.max(52, node.w - 24) + '" lengthAdjust="spacingAndGlyphs">' + esc(node.label) + '</text>' +
      '</g>';
    }).join("");
    return '<section class="lp-diagram" data-lp-reveal data-diagram="' + esc(d.kind) + '">' +
      '<div class="lp-diagram-head"><div><span class="lp-eyebrow mono">SYSTEM · ' + esc(d.kind.toUpperCase()) + '</span><h2 class="lp-h2">' + esc(title) + '</h2></div><span class="lp-diagram-hint mono">' + esc(hint) + '</span></div>' +
      '<div class="lp-diagram-scroll" tabindex="0"><svg class="lp-diagram-svg" viewBox="0 0 1000 420" role="img" aria-label="' + esc(title) + '"><defs><marker id="' + markerId + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z"></path></marker></defs>' + zones + edges + nodes + '</svg></div>' +
    '</section>';
  }

  function projectTheme(slug) {
    var themes = {
      ttyl: ["#4D9B9B", "77 155 155"],
      "task-manager": ["#C08A3E", "192 138 62"],
      marketbot: ["#4F9A68", "79 154 104"],
      forge: ["#8B72B7", "139 114 183"],
      belfproctor: ["#6F8EAD", "111 142 173"],
      "vfs-killer": ["#4D79A8", "77 121 168"],
      "med-exe": ["#4F9696", "79 150 150"],
      bioflux: ["#99984F", "153 152 79"],
      "growthops-ai": ["#5275A8", "82 117 168"],
      "car-superapp": ["#D47743", "212 119 67"],
      "ai-classroom": ["#6879BF", "104 121 191"],
      laplacefx: ["#659575", "101 149 117"],
      "vacation-control": ["#A59755", "165 151 85"],
      "birthday-agent": ["#C77B30", "199 123 48"],
      "b24-sales-analyst": ["#4E7A5C", "78 122 92"],
      "chat-app": ["#A4423F", "164 66 63"],
      dentforma: ["#4F7F7A", "79 127 122"],
      "meetingflow-ru-uz": ["#B8783D", "184 120 61"],
      "telegram-sheets-task-bot": ["#4F765B", "79 118 91"]
    };
    return themes[slug] || ["#D97757", "217 119 87"];
  }

  function projectHeroProfile(slug) {
    var profiles = {
      ttyl: "vault",
      "task-manager": "wave",
      marketbot: "converge",
      forge: "transformation",
      belfproctor: "evidence",
      "vfs-killer": "gateway",
      "med-exe": "measure",
      bioflux: "threshold",
      "growthops-ai": "factory",
      "car-superapp": "rotor",
      "ai-classroom": "lens",
      laplacefx: "gauge",
      "vacation-control": "timetable",
      "birthday-agent": "calendar",
      "b24-sales-analyst": "reconcile",
      "chat-app": "outbox",
      dentforma: "calibration",
      "meetingflow-ru-uz": "relay",
      "telegram-sheets-task-bot": "ledger"
    };
    return profiles[slug] || "split";
  }

  // Build the full <body> inner HTML for one product in one language.
  // `p` is the whole product record (with .i18n); `lang` selects the copy.
  function LP_render(p, lang, base) {
    var ui = UI[lang] || UI.ru;
    var c = (p.i18n && p.i18n[lang]) || (p.i18n && p.i18n.ru) || {};
    base = base || "../../";            // localized pages add one directory level
    var visualName = String(p.visual || "");
    var visualStem = visualName.replace(/\.webp$/i, "");
    var visual = base + "assets/proj/" + esc(visualName);
    var visualSet =
      base + "assets/proj/responsive/" + esc(visualStem) + "-768.webp 768w, " +
      base + "assets/proj/responsive/" + esc(visualStem) + "-1152.webp 1152w, " +
      visual + " 1536w";
    var langs = ["ru", "en", "uz"];

    function languageHref(targetLang) {
      if (lang === "ru") return targetLang === "ru" ? "./" : targetLang + "/";
      return targetLang === "ru" ? "../" : "../" + targetLang + "/";
    }

    var langBtns = langs
      .map(function (L) {
        return (
          '<a class="lp-lang-btn' +
          (L === lang ? " is-active" : "") +
          '" data-lang="' + L + '" href="' + languageHref(L) + '"' +
          (L === lang ? ' aria-current="page"' : "") + '>' +
          L.toUpperCase() +
          "</a>"
        );
      })
      .join("");

    // Secondary CTA. For a private/NDA product the whole card lives on THIS page
    // already, so "request access" goes to the contact form (talk to me) rather
    // than looping back to a GitHub card. Public code-bearing products link to
    // their real repo instead.
    var githubBtn;
    var confidentiality = p.meta && p.meta.confidentiality
      ? p.meta.confidentiality
      : (p.private === true ? "private_source" : "public");
    var isPrivate = confidentiality !== "public";
    var isPublicShowcase = isPrivate && !!p.github;
    if (isPublicShowcase) {
      githubBtn =
        '<a class="lp-btn lp-btn-ghost" href="' + esc(p.github) + '" target="_blank" rel="noopener noreferrer">' +
        esc(ui.publicCase) + ' <span class="lp-arr">↗</span></a>';
    } else if (isPrivate) {
      githubBtn =
        '<a class="lp-btn lp-btn-ghost" href="' + base + '#contact">' +
        esc(ui.requestAccess) + ' <span class="lp-arr">→</span></a>';
    } else if (p.github) {
      githubBtn =
        '<a class="lp-btn lp-btn-ghost" href="' + esc(p.github) + '" target="_blank" rel="noopener noreferrer">' +
        esc(ui.viewGithub) + ' <span class="lp-arr">↗</span></a>';
    } else {
      githubBtn = "";
    }

    var qaLink = p.qa
      ? '<a class="lp-qa-link mono" href="' + esc(p.qa) + '" target="_blank" rel="noopener noreferrer">' +
        esc(ui.qaMatrix) + " →</a>"
      : "";

    var theme = projectTheme(p.slug);
    var heroProfile = projectHeroProfile(p.slug);
    var chapterIds = ["thesis", "context", "system", "evidence", "boundary"];
    var chapterNav = chapterIds.map(function (id, i) {
      return '<a href="#' + id + '" data-lp-chapter-link="' + id + '"><span class="mono">' + String(i + 1).padStart(2, "0") + '</span><b>' + esc(ui.chapters[i]) + '</b></a>';
    }).join("");

    return (
      '<div class="lp-page lp-page--' + esc(p.slug) + '" style="--lp-accent:' + theme[0] + ';--lp-accent-rgb:' + theme[1] + '">' +
        '<header class="lp-bar">' +
          '<a class="lp-back mono" href="' + base + "#proj-" + esc(p.slug) + '"><span class="lp-back-arr">←</span><span>SAMANDAR</span></a>' +
          '<div class="lp-current mono"><span class="lp-current-index">01</span><span class="lp-current-divider">/05</span><b class="lp-current-name">' + esc(ui.chapters[0]) + '</b></div>' +
          '<div class="lp-bar-right">' +
            (p.status ? '<span class="lp-status mono lp-status--' + esc(String(p.status).toLowerCase()) + '">' + esc(p.status) + "</span>" : "") +
            '<div class="lp-lang" role="group" aria-label="' + esc(ui.languageLabel) + '">' + langBtns + "</div>" +
          "</div>" +
        "</header>" +

        '<main class="lp" id="lp-main">' +
          '<section class="lp-hero lp-hero--' + esc(heroProfile) + '" id="thesis" data-lp-chapter="thesis" data-hero-profile="' + esc(heroProfile) + '">' +
            '<div class="lp-hero-text" data-lp-reveal>' +
              '<div class="lp-eyebrow mono">' + esc(c.tag || "") + "</div>" +
              '<h1 class="lp-title">' + esc(p.name) + "</h1>" +
              '<p class="lp-signal">' + esc(c.signal || "") + "</p>" +
              '<div class="lp-cred mono"><span class="lp-cred-dot" aria-hidden="true"></span><span class="lp-cred-copy">' +
                (c.role ? '<b class="lp-cred-role">' + esc(c.role) + "</b> · " : "") + esc(ui.builtBy) + "</span></div>" +
              '<div class="lp-cta"><a class="lp-btn lp-btn-primary" href="' + base + '#contact">' + esc(ui.discuss) + ' <span class="lp-arr">→</span></a>' + githubBtn + "</div>" +
            "</div>" +
            '<figure class="lp-hero-visual" data-lp-reveal style="--reveal-delay:.08s"><div class="lp-photo"><img src="' + visual + '" srcset="' + visualSet + '" sizes="(max-width: 980px) calc(100vw - 28px), 55vw" alt="" loading="eager" fetchpriority="high" decoding="async" width="1536" height="512"></div><figcaption class="mono"><span>OBJECT / ' + esc(p.slug) + '</span><span>3:1 · RESPONSIVE EDITORIAL STUDY</span></figcaption></figure>' +
          "</section>" +

          '<nav class="lp-chapters" aria-label="' + esc(ui.chapterNav) + '">' + chapterNav + '</nav>' +

          (c.quick && c.quick.length ? '<section class="lp-quick" aria-label="' + esc(ui.quickView) + '" tabindex="0" data-lp-reveal>' + quickItems(c.quick, ui) + "</section>" : "") +

          '<section class="lp-act lp-act--context" id="context" data-lp-chapter="context">' +
            '<div class="lp-act-head" data-lp-reveal><span class="lp-act-num mono">02 / 05</span><h2>' + esc(ui.chapters[1]) + '</h2></div>' +
            '<div class="lp-grid2" data-lp-reveal>' + block(ui.what, c.what) + block(ui.problem, c.problem) + "</div>" +
          "</section>" +

          '<section class="lp-act lp-act--system" id="system" data-lp-chapter="system">' +
            '<div class="lp-act-head" data-lp-reveal><span class="lp-act-num mono">03 / 05</span><h2>' + esc(ui.chapters[2]) + '</h2></div>' +
            (p.stack && p.stack.length ? '<div class="lp-stack" data-lp-reveal><h2 class="lp-h2">' + esc(ui.stack) + '</h2><div class="lp-chips">' + chips(p.stack) + '</div></div>' : '') +
            '<div class="lp-grid2" data-lp-reveal>' + block(ui.architecture, c.architecture) + block(ui.why, c.why) + "</div>" +
            diagramMap(p.slug, lang, p.flow, ui.systemMap, ui.diagramHint) +
          "</section>" +

          '<section class="lp-act lp-act--evidence" id="evidence" data-lp-chapter="evidence">' +
            '<div class="lp-act-head" data-lp-reveal><span class="lp-act-num mono">04 / 05</span><h2>' + esc(ui.chapters[3]) + '</h2></div>' +
            '<div class="lp-grid2" data-lp-reveal>' + block(ui.unique, c.unique) + block(ui.employer, c.employer) + "</div>" +
            (c.quality ? '<section class="lp-quality" data-lp-reveal><div class="lp-quality-glow" aria-hidden="true"></div><div class="lp-eyebrow mono lp-quality-eyebrow">Quality · QA</div><h2 class="lp-h2">' + esc(ui.quality) + '</h2><p class="lp-p">' + esc(c.quality) + '</p>' + qaLink + '</section>' : '') +
          "</section>" +

          '<section class="lp-act lp-act--boundary" id="boundary" data-lp-chapter="boundary">' +
            '<div class="lp-act-head" data-lp-reveal><span class="lp-act-num mono">05 / 05</span><h2>' + esc(ui.chapters[4]) + '</h2></div>' +
            (c.boundary ? '<div class="lp-boundary" data-lp-reveal><span class="lp-boundary-mark mono" aria-hidden="true">!</span><div><div class="lp-eyebrow mono">' + esc(ui.boundary) + '</div><p class="lp-p">' + esc(c.boundary) + '</p></div></div>' : '') +
          "</section>" +

          '<section class="lp-final" data-lp-reveal><div class="lp-final-glow" aria-hidden="true"></div><span class="lp-eyebrow mono">NEXT · BUILD</span><h2 class="lp-final-head">' + esc(ui.ctaHead) + '</h2><p class="lp-final-sub">' + esc(ui.ctaSub) + '</p><div class="lp-cta lp-final-cta"><a class="lp-btn lp-btn-primary" href="' + base + '#contact">' + esc(ui.discuss) + ' <span class="lp-arr">→</span></a><a class="lp-btn lp-btn-ghost" href="' + TG + '" target="_blank" rel="noopener noreferrer">' + esc(ui.telegram) + ' <span class="lp-arr">↗</span></a></div></section>' +

          '<footer class="lp-foot"><a class="lp-foot-back mono" href="' + base + '#proj-' + esc(p.slug) + '"><span class="lp-back-arr">←</span> ' + esc(ui.allProjects) + '</a><span class="lp-foot-note mono">' + esc(ui.footNote) + '</span></footer>' +
        "</main>" +
      "</div>"
    );
  }

  root.LP_render = LP_render;
  root.LP_UI = UI;
  root.LP_esc = esc;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { LP_render: LP_render, LP_UI: UI, LP_esc: esc };
  }
})(typeof window !== "undefined" ? window : this);
