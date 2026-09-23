# Контракт `GET /api/ecosystem/status`

Лендинг читает состояние студии **только** из этого эндпоинта. Сейчас он не реализован в сборке хаба: на 404 экран `#status` показывает «The hub does not serve this endpoint yet», словарь уровней L0–L4 как документацию и готовность адаптеров из `GET /api/read-model`, но **не присваивает уровни самостоятельно**.

Файл — запрос к хабу (репозиторий `Leo88q/Games-watchtower`, read-only для этого репозитория). Пока контракт не реализован, лендинг менять не нужно: экран включится сам.

## Схема ответа

```json
{
  "generatedAt": "2026-09-23T12:00:00.000Z",
  "source": "hub",
  "dataQuality": "partial",
  "levelVocabularyVersion": "2026-09-23",
  "levels": [
    { "id": "L0", "definition": "Idea: repository and description" },
    { "id": "L1", "definition": "Mockup: interfaces on mock data" },
    { "id": "L2", "definition": "Integration: adapters configured, events flowing" },
    { "id": "L3", "definition": "Live data: confirmed stream, reports reconcile" },
    { "id": "L4", "definition": "Autonomy: alerts and regular reporting" }
  ],
  "games": [
    {
      "id": "ares1",
      "name": "ARES-1",
      "stage": "beta",
      "level": "L1",
      "connected": ["watchtower-api"],
      "disconnected": [
        { "id": "game-events", "reason": "adapter not configured (ARES1_API_BASE_URL unset)" }
      ],
      "notes": ""
    }
  ],
  "apps": [
    {
      "id": "watchtower-api",
      "name": "Watchtower API",
      "level": "L1",
      "connected": false,
      "reason": "read-model runs in mock mode"
    }
  ]
}
```

## Правила

- `source: "mock"` или `demo: true` → лендинг помечает **всё** содержимое экрана чипом `DEMO DATA`. Mock никогда не подаётся как live.
- `dataQuality` — из словаря хаба: `complete | partial | unavailable`. Неизвестное значение нормализуется в `unavailable`, а не в «нормально».
- `level` присваивает **хаб**. Лендинг не выводит уровень из других эндпоинтов и не подставляет «похожий» уровень для игры без записи.
- `disconnected[].reason` — обязательное человекочитаемое объяснение. Пустая причина честнее выдуманной, но менее информативна: пустую строку лендинг покажет как есть.
- Отсутствующие `games`/`apps` — это не пустой список: экран переходит в состояние «эндпоинт вернул неполные данные» и не показывает ни одного подключения.
- Ответ должен быть JSON. HTML от static fallback (типичный случай, когда `/api` не проксируется) распознаётся как `not_json` и не принимается за данные.
- Эндпоинт read-only и публичный: без токенов, без записи в блокчейн (`writes: false`), с rate limit не ниже, чем у остальных публичных маршрутов хаба.

## Что лендинг делает с ответом

| Поле                      | Где видно                                                                     |
| ------------------------- | ----------------------------------------------------------------------------- |
| `levels`                  | словарь L0–L4 в `#status` (если хаб его не прислал — словарь из копии)         |
| `games[]`                 | колонка «Игры»: стадия, уровень, подключённые и неподключённые интеграции      |
| `apps[]`                  | колонка «Сервисы»: состояние, уровень, причина                                 |
| `generatedAt`             | штамп «Данные обновлены» в UTC рядом со статусом и в баннере под шапкой        |
| `dataQuality`, `source`   | бейдж качества и чип `DEMO DATA` на каждом элементе экрана                     |

## Проверка после реализации

```bash
curl -s http://127.0.0.1:5174/api/ecosystem/status | head
npx playwright test tests/browser/honest-data.spec.js -g "ecosystem"
```

Ожидаемое поведение в тестах: при `source: "mock"` появляется `DEMO DATA`; при 404 — текст «missing from the current hub build»; при неполном ответе — ни одного `[data-connected="true"]` и бейдж `unavailable`.
