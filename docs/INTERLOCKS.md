# Interlocks: как требования связаны и чем доказаны

Каждый interlock — это связь лендинга с остальной системой студии. Ниже: что именно связано, где это в коде и чем проверяется. Ни один пункт не «заявлен» без проверяемого артефакта.

## i-05 — инвестор видит ту же формулу, что считает хаб

- **Формула:** `дивиденд на NFT за квартал = (чистая прибыль студии за квартал × 25%) / 100`.
- **Реализация:** `src/math.js` → `calculateShare(profit, supply, poolPercent)`; `explainShare` возвращает ту же формулу строкой для интерфейса.
- **Совпадение с хабом:** параметры (`supply`, `poolPercent`, цена) живут в `src/config.js`; значения брифа зафиксированы тестами `100000 → {pool: 25000, annual: 250, quarterly: 62.5}`, `200000 → {…, 500, 125}`, `400000 → {…, 1000, 250}`.
- **Строки:** формула показывается на странице в `#snapshots` (`snapshots.formula`) и в FAQ; она не переписывается вручную в двух местах.
- **Доказательство:** `tests/math.test.js` (округление вниз, клампы, нулевые и отрицательные кварталы), `tests/client.test.js` (в таблице снапшотов `200000 → $125`, `0 → $0`).

## i-02 — согласие и отзыв согласия синхронизированы со студией

- **Реализация:** `src/api.js` → `buildLeadPayload`, `readConsents`, `writeConsents`; ключ журнала `watchtower.investor.consents.v1`; контракт `investor-lead-v1`.
- **Порядок:** запись согласия делается **до** отправки лида, чтобы отказ сети не оставил согласие незафиксированным.
- **Отзыв:** кнопка «Отозвать согласие» пишет `{email: false, optedOutAt}` — это и есть opt-out журнал.
- **Синхронизация:** при заданном `VITE_CONSENT_ENDPOINT` запись уходит `navigator.sendBeacon` в сервис согласий студии; без него журнал остаётся локальным и это видно пользователю.
- **Доказательство:** `tests/browser/honest-data.spec.js` → «the consent journal is written and can be withdrawn»; `tests/browser/form.spec.js` проверяет, что payload содержит `consents` с `termsVersion: investor-lead-v1` и что журнал записан.

## i-08 — конверсия лендинга (визит → лид → покупка)

- **Реализация:** ссылки CTA несут `#offer`/`#waitlist`, форма отправляет лид с `source: "watchtower-investor"`, а параметр `?campaign=` из URL попадает в payload (`buildLeadPayload({campaign})`).
- **Отчёт:** сами события визита живут в хабе (`GET /api/analytics/traffic`, `GET /api/read-model`). Лендинг не считает собственные конверсии и не публикует их: числа приходят из хаба с `dataQuality`.
- **Что уже видно:** каналы в дашборде трафика получают бейдж только при наличии ответа хаба (`data.campaigns`), иначе `unavailable`.
- **Доказательство:** `src/api.js` (payload + campaign), `tests/browser/form.spec.js` (перехваченный payload), `#snapshots`/`#status` показывают источник каждого числа.

## i-09 — привлечение: ad_click → wallet → first_action

- **Реализация:** воронка на лендинге берёт шаги из `GET /api/read-model` (`funnel`) и показывает счётчики только при наличии ответа; источник печатается строкой `GET /api/read-model · funnel`.
- **Границы:** `first_action` относится к игровым событиям — лендинг их не производит и не интерпретирует. Если хаб отдаёт `null`, печатается «—».
- **Доказательство:** `src/main.jsx` (`Dashboard`, вкладка Funnels: `funnelStages`), `tests/client.test.js` (мокнутая воронка рендерится, при недоступном хабе — «—»).

## i-13 — экран состояния экосистемы на `GET /api/ecosystem/status`

- **Единый источник:** тот же эндпоинт, что использует хаб для внутренней панели; контракт зафиксирован в `docs/ECOSYSTEM_STATUS_API.md`.
- **Поведение при отсутствии эндпоинта:** экран `#status` показывает причину `endpoint_not_deployed`, ожидаемую схему и то, что реально известно (готовность адаптеров из `read-model`, помеченная `unavailable`).
- **Запрет:** уровни L0–L4 не выводятся из других эндпоинтов и не присваиваются лендингом.
- **Доказательство:** `tests/render.test.js` («a missing ecosystem endpoint renders its reason, not invented levels», «mock payloads are always labelled DEMO DATA»), `tests/browser/honest-data.spec.js`, `tests/client.test.js`.
