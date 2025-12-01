# Архитектура Shoro Chat2Desk Bot

## Общая схема
```
                                    ┌──────────────┐
                                    │  Chat2Desk   │
                                    │   Platform   │
                                    └──────┬───────┘
                                           │ Webhook
                                           ▼
                                    ┌──────────────┐
                                    │   Webhook    │
                                    │    Server    │◄── Health Check
                                    │ (Bun.serve)  │
                                    └──────┬───────┘
                                           │
                                           ▼
                                    ┌──────────────┐
                                    │    Redis     │
                                    │ Message Queue│
                                    └──────┬───────┘
                                           │
                                           ▼
                            ┌──────────────┴──────────────┐
                            │                             │
                     ┌──────▼───────┐           ┌────────▼────────┐
                     │   Worker 1   │   ...     │   Worker N      │
                     │              │           │                 │
                     └──────┬───────┘           └────────┬────────┘
                            │                             │
                            └──────────────┬──────────────┘
                                           │
                            ┌──────────────┼──────────────┐
                            │              │              │
                     ┌──────▼───────┐ ┌───▼────┐  ┌─────▼──────┐
                     │    Dialog    │ │  State │  │Chat2Desk   │
                     │   Handler    │ │  Mgmt  │  │  Service   │
                     └──────┬───────┘ └───┬────┘  └─────┬──────┘
                            │              │              │
                            └──────────────┼──────────────┘
                                           │
                                    ┌──────▼───────┐
                                    │  PostgreSQL  │
                                    │   Database   │
                                    └──────────────┘
```

## Компоненты

### 1. Webhook Server (src/server.ts)

**Технологии:** Bun.serve (native HTTP server)

**Роль:** Принимает webhooks от Chat2Desk и сразу отвечает 200 OK

**Endpoints:**
- `POST /webhook/chat2desk` - приём сообщений
- `GET /health` - health check
- `GET /` - server info

**Производительность:**
- Response time: 2-5ms
- Сразу отвечает клиенту (не ждёт обработки)
- Складывает сообщение в очередь

### 2. Message Queue (src/queues/)

**Технологии:** Bull + Redis

**Роль:** Буферизация и распределение сообщений между workers

**Очереди:**
- `messages` - основная очередь сообщений
- `outbox` - неотправленные ответы (retry до 50 раз)

**Retry стратегия:**
- 3 попытки с exponential backoff
- Stalled job detection (30 сек)
- Dead Letter Queue для failed jobs

### 3. Workers (src/workers/)

**Технологии:** Bull processor

**Роль:** Обработка сообщений из очереди

**Параметры:**
- Concurrency: 5 (по умолчанию, масштабируется до 50+)
- Идемпотентность через Redis (message_id → 7 дней TTL)

**Процесс:**
1. Достаёт сообщение из очереди
2. Проверяет не обработано ли (idempotency)
3. Передаёт в Dialog Handler
4. Маркирует как обработанное

### 4. Dialog Handler (src/handlers/)

**Роль:** Логика диалога с клиентом

**State Machine:**
```
INITIAL
   │
   ├─ Приветствие
   ▼
WAITING_ADDRESS
   │
   ├─ Валидация адреса (мин 5 символов)
   ▼
WAITING_PHONE
   │
   ├─ Валидация телефона (формат KG)
   ▼
WAITING_BOTTLES
   │
   ├─ Валидация количества (1-50)
   ▼
WAITING_CONFIRMATION
   │
   ├─ Показ итогов
   ├─ Ожидание "Да"/"Нет"
   ▼
COMPLETED
   │
   └─ Создание заказа в БД
```

### 5. State Management (src/services/state/)

**Технологии:** Redis

**Роль:** Хранение состояния диалогов

**Структура:**
```typescript
{
  clientId: string,
  state: DialogState,
  data: {
    address?: string,
    phone?: string,
    bottlesCount?: number
  },
  createdAt: number,
  updatedAt: number
}
```

**TTL:** 24 часа (автоочистка)

### 6. Chat2Desk Service (src/services/chat2desk/)

**Роль:** Отправка сообщений клиентам

**Retry механизм:**
- 3 попытки с exponential backoff (1s, 2s, 4s)
- Timeout: 10 секунд
- Fallback в Outbox Queue

**Rate Limiting:**
- 300 requests/minute (Chat2Desk limit)
- Sliding window algorithm

### 7. Order Service (src/services/order/)

**Роль:** Создание заказов в БД

**Валидация:**
- Телефон: +996XXXXXXXXX
- Адрес: 5-200 символов
- Количество: 1-50 бутылей

## Поток данных

### 1. Входящее сообщение
```
Client → Chat2Desk → Webhook → Queue (1-2ms)
```

### 2. Обработка
```
Queue → Worker → Dialog Handler → State/Validators (200ms)
```

### 3. Ответ клиенту
```
Dialog Handler → Chat2Desk Service → Chat2Desk → Client
                      ↓ (если fail)
                 Outbox Queue
```

### 4. Создание заказа
```
Dialog Handler → Order Service → PostgreSQL
```

## Отказоустойчивость

### Уровень 1: Chat2Desk → Webhook
- Chat2Desk retry до 5 раз
- Webhook отвечает за <5 секунд

### Уровень 2: Redis Queue
- AOF persistence
- Автоматический reconnect

### Уровень 3: Workers
- Bull retry (3 попытки)
- Stalled job detection
- Dead Letter Queue

### Уровень 4: PostgreSQL
- Connection pooling
- Retry strategy

### Уровень 5: Chat2Desk API
- 3 retry с exponential backoff
- Outbox Queue для failed sends

## Масштабирование

### Вертикальное
- Увеличение `WORKER_CONCURRENCY` (до 50)

### Горизонтальное
- Запуск нескольких worker процессов
- Все workers используют одну Redis очередь

**Пример:**
```bash
# 3 worker процесса × 5 concurrency = 15 параллельных обработок
pm2 start src/worker.ts -i 3
```

## Мониторинг

### Метрики
- Queue size (`LLEN bull:messages:wait`)
- Processing rate
- Failed jobs count
- Response time

### Health Check
```bash
curl http://localhost:3000/health
```

Проверяет:
- Redis connection
- PostgreSQL connection
- Queue size

## База данных

### Таблицы

**orders** - заказы
- id, client_phone, delivery_address, bottles_count
- source, chat2desk_client_id, status
- created_at, updated_at

**message_logs** - логи сообщений (для аналитики)
- client_id, message_id, text, dialog_state
- success, error_reason, timestamp

**dialog_outcomes** - результаты диалогов
- completed, dropoff_state, total_messages
- duration_seconds

### Индексы
- `idx_orders_created_at`
- `idx_orders_status`
- `idx_orders_chat2desk_client_id`