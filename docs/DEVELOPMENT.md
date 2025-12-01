# Development Guide

## Начало работы

### 1. Установка зависимостей
```bash
bun install
```

### 2. Настройка окружения
```bash
cp .env.example .env
```

Отредактируй `.env` и добавь реальные значения.

### 3. Запуск инфраструктуры
```bash
bun run docker:up
```

Это запустит:
- Redis на порту 6379
- PostgreSQL на порту 5432

### 4. Разработка

**Терминал 1** - Webhook сервер:
```bash
bun run dev:server
```

**Терминал 2** - Worker:
```bash
bun run dev:worker
```

**Терминал 3** - Тестовые запросы:
```bash
curl -X POST http://localhost:3000/webhook/chat2desk \
  -H "Content-Type: application/json" \
  -d '{"client_id":"test","message_id":"msg_1","text":"Привет"}'
```

## Git Flow

### Ветки

- `main` - production code
- `dev` - development branch
- `feature/*` - feature branches

### Процесс разработки
```bash
# 1. Создаём feature ветку
git checkout -b feature/my-feature dev

# 2. Пишем код

# 3. Коммитим (Conventional Commits)
git commit -m "feat(service): add new feature"

# 4. Мержим в dev
git checkout dev
git merge feature/my-feature

# 5. Удаляем feature ветку
git branch -d feature/my-feature
```

### Conventional Commits
```
feat: новая функция
fix: исправление бага
docs: изменения в документации
style: форматирование
refactor: рефакторинг кода
test: добавление тестов
chore: обновление зависимостей
```

## Структура кода

### Добавление нового валидатора

1. Создай файл `src/validators/my-validator.ts`
2. Экспортируй в `src/validators/index.ts`
3. Используй в Dialog Handler

Пример:
```typescript
export function validateMyData(input: string): ValidationResult {
  if (!input || input.length < 5) {
    return {
      isValid: false,
      error: 'Данные слишком короткие'
    };
  }

  return {
    isValid: true
  };
}
```

### Добавление нового сервиса

1. Создай директорию `src/services/my-service/`
2. Создай `my-service.service.ts`
3. Экспортируй в `src/services/index.ts`

### Добавление нового endpoint

Открой `src/server.ts` и добавь:
```typescript
else if (url.pathname === '/my-endpoint' && req.method === 'GET') {
  response = new Response(JSON.stringify({ data: 'value' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

## Debugging

### Логи

Уровни логов: `debug`, `info`, `warn`, `error`
```typescript
import { logger } from '@utils/logger';

logger.debug('Debug message');
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message', error);
```

### Redis
```bash
# Подключиться к Redis
docker exec -it shoro-redis redis-cli

# Посмотреть очередь
LLEN bull:messages:wait

# Посмотреть ключи
KEYS dialog:*

# Посмотреть состояние диалога
GET dialog:client_123
```

### PostgreSQL
```bash
# Подключиться к БД
docker exec -it shoro-postgres psql -U postgres -d shoro_bot_dev

# Посмотреть заказы
SELECT * FROM orders ORDER BY id DESC LIMIT 10;

# Посмотреть логи сообщений
SELECT * FROM message_logs ORDER BY created_at DESC LIMIT 10;
```

## Тестирование

### Ручное тестирование

Используй curl для отправки тестовых webhooks:
```bash
# Полный диалог
curl -X POST http://localhost:3000/webhook/chat2desk \
  -H "Content-Type: application/json" \
  -d '{"client_id":"test","message_id":"msg_1","text":"Привет"}'

# ... (остальные шаги)
```

### Health check
```bash
curl http://localhost:3000/health
```

## Качество кода

### Линтинг
```bash
bun run lint
bun run lint:fix
```

### Форматирование
```bash
bun run format
bun run format:check
```

## Troubleshooting

### Worker не обрабатывает сообщения

1. Проверь что Redis запущен: `docker ps`
2. Проверь логи worker: смотри терминал где запущен worker
3. Проверь размер очереди: `redis-cli LLEN bull:messages:wait`

### Webhook виснет

- Используй `curl -v` для детальной информации
- Проверь логи сервера
- Проверь что порт 3000 не занят: `lsof -i :3000`

### База данных не доступна
```bash
# Перезапусти контейнеры
bun run docker:down
bun run docker:up

# Проверь что PostgreSQL запущен
docker ps | grep postgres
```

## Полезные команды
```bash
# Очистить очередь Redis
docker exec -it shoro-redis redis-cli FLUSHALL

# Очистить БД
docker exec -it shoro-postgres psql -U postgres -d shoro_bot_dev -c "TRUNCATE orders, message_logs, dialog_outcomes CASCADE;"

# Перезапустить всё
bun run docker:down
bun run docker:up
bun run dev:server  # в одном терминале
bun run dev:worker  # в другом терминале
```