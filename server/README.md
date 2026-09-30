# SpeechSteps — бэкенд синхронизации 3D-мира

Крошечный REST-сервер для прогресса игры «Остров Эха»: ребёнок играет на своём
устройстве, прогресс уходит сюда, а логопед/родитель видят его со своего.
Без зависимостей и без БД (хранит данные в `world-data.json`).

## Запуск

```bash
node server/index.js
# или
cd server && npm start
```

По умолчанию слушает `http://localhost:4000`. Порт можно поменять:

```bash
# Windows PowerShell
$env:PORT=5000; node server/index.js
# macOS/Linux
PORT=5000 node server/index.js
```

## Подключение приложения

В корне проекта создайте файл `.env` (см. `.env.example`):

```
VITE_WORLD_SYNC_URL=http://localhost:4000
```

Затем перезапустите веб-приложение, чтобы Vite прочитал переменную:

```bash
npm run web
```

- **Веб** (localhost): `http://localhost:4000` подойдёт как есть.
- **Другое устройство**: `localhost` указывает на само устройство — впишите IP
  компьютера в локальной сети, например `http://192.168.1.5:4000`.

## API

| Метод | Путь                          | Тело / ответ |
|-------|-------------------------------|--------------|
| GET   | `/health`                     | `{ ok: true }` |
| GET   | `/world-progress/:childId`    | `200 { childId, state, updatedAt }` или `404` |
| PUT   | `/world-progress/:childId`    | тело `{ state, updatedAt }` → `200 { ok }` |

`state` — непрозрачная строка (сейв игры); сервер её не разбирает. Более старый
`updatedAt` не затирает более свежий.

## Проверка вручную

```bash
curl -X PUT http://localhost:4000/world-progress/child-4 \
  -H "Content-Type: application/json" \
  -d '{"state":"{\"gateOpen\":true}","updatedAt":1700000000000}'

curl http://localhost:4000/world-progress/child-4
```

## Заметки

- Это прототип для одного инстанса (файловое хранилище). Для продакшена замените
  `world-data.json` на настоящую БД (Postgres/SQLite/Redis) и добавьте авторизацию —
  контракт ручек менять не нужно.
- CORS открыт (`*`) для удобства разработки.
