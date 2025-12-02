# Architecture Guide

## System Overview

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

## Components

### 1. Webhook Server (src/server.ts)

**Technology:** Bun.serve (native HTTP server)

**Role:** Receives webhooks from Chat2Desk and responds with 200 OK immediately

**Endpoints:**

- `POST /webhook/chat2desk` - Receive messages
- `GET /health` - Health check
- `GET /` - Server information

**Performance:**

- Response time: 2-5ms
- Responds to client immediately (doesn't wait for processing)
- Enqueues message to Redis

### 2. Message Queue (src/queues/)

**Technology:** Bull + Redis

**Role:** Message buffering and distribution between workers

**Queues:**

- `messages` - Main message queue
- `outbox` - Failed messages (retry up to 50 times)

**Retry Strategy:**

- 3 attempts with exponential backoff
- Stalled job detection (30 sec timeout)
- Dead Letter Queue for failed jobs

### 3. Workers (src/workers/)

**Technology:** Bull processor

**Role:** Process messages from queue

**Parameters:**

- Concurrency: 5 (default, scalable to 50+)
- Idempotency via Redis (message_id → 7 days TTL)

**Process:**

1. Fetch message from queue
2. Check if already processed (idempotency)
3. Pass to Dialog Handler
4. Mark as processed

### 4. Dialog Handler (src/handlers/)

**Role:** Dialog logic with client

**State Machine:**

```
INITIAL
   │
   ├─ Greeting
   ▼
WAITING_ADDRESS
   │
   ├─ Address validation (min 5 chars)
   ▼
WAITING_PHONE
   │
   ├─ Phone validation (international format)
   ▼
WAITING_QUANTITY
   │
   ├─ Quantity validation (1-50)
   ▼
WAITING_CONFIRMATION
   │
   ├─ Show summary
   ├─ Wait for "Yes"/"No"
   ▼
COMPLETED
   │
   └─ Create order in database
```

### 5. State Management (src/services/state/)

**Technology:** Redis

**Role:** Store dialog state

**Structure:**

```typescript
{
  clientId: string,
    state
:
  DialogState,
    data
:
  {
    address ? : string,
      phone ? : string,
      quantity ? : number
  }
,
  createdAt: number,
    updatedAt
:
  number
}
```

**TTL:** 24 hours (auto-cleanup)

### 6. Chat2Desk Service (src/services/chat2desk/)

**Role:** Send messages to clients

**Retry Mechanism:**

- 3 attempts with exponential backoff (1s, 2s, 4s)
- Timeout: 10 seconds
- Fallback to Outbox Queue

**Rate Limiting:**

- 300 requests/minute (Chat2Desk limit)
- Sliding window algorithm

### 7. Order Service (src/services/order/)

**Role:** Create orders in database

**Validation:**

- Phone: International format with country code
- Address: 5-200 characters
- Quantity: 1-50 items

## Data Flow

### 1. Incoming Message

```
Client → Chat2Desk → Webhook → Queue (1-2ms)
```

### 2. Processing

```
Queue → Worker → Dialog Handler → State/Validators (200ms)
```

### 3. Response to Client

```
Dialog Handler → Chat2Desk Service → Chat2Desk → Client
                      ↓ (if failed)
                 Outbox Queue
```

### 4. Order Creation

```
Dialog Handler → Order Service → PostgreSQL
```

## Fault Tolerance

### Level 1: Chat2Desk → Webhook

- Chat2Desk retries up to 5 times
- Webhook responds within 5 seconds

### Level 2: Redis Queue

- AOF persistence
- Automatic reconnect

### Level 3: Workers

- Bull retry (3 attempts)
- Stalled job detection
- Dead Letter Queue

### Level 4: PostgreSQL

- Connection pooling
- Retry strategy

### Level 5: Chat2Desk API

- 3 retries with exponential backoff
- Outbox Queue for failed sends

## Scaling

### Vertical Scaling

- Increase `WORKER_CONCURRENCY` (up to 50)

### Horizontal Scaling

- Run multiple worker processes
- All workers use the same Redis queue

**Example:**

```bash
# 3 worker processes × 5 concurrency = 15 parallel processing
pm2 start src/worker.ts -i 3
```

## Monitoring

### Metrics

- Queue size (`LLEN bull:messages:wait`)
- Processing rate
- Failed jobs count
- Response time

### Health Check

```bash
curl http://localhost:3000/health
```

Checks:

- Redis connection
- PostgreSQL connection
- Queue size

## Database

### Tables

**orders** - Customer orders

- id, client_phone, delivery_address, quantity
- source, chat2desk_client_id, status
- created_at, updated_at

**message_logs** - Message logs (for analytics)

- client_id, message_id, text, dialog_state
- success, error_reason, timestamp

**dialog_outcomes** - Dialog results

- completed, dropoff_state, total_messages
- duration_seconds

### Indexes

- `idx_orders_created_at`
- `idx_orders_status`
- `idx_orders_chat2desk_client_id`

## Technology Stack

### Runtime & Language

- **Bun** - Fast JavaScript runtime
- **TypeScript** - Type-safe development

### Infrastructure

- **Redis** - Message queue & state storage
- **PostgreSQL** - Persistent data storage
- **Bull** - Queue management

### Key Libraries

- **ioredis** - Redis client
- **pg** - PostgreSQL client
- **axios** - HTTP client for Chat2Desk API
- **winston** - Logging

## Performance Characteristics

### Throughput

- 60 messages/second
- 300+ orders/day capacity
- Scalable to 3,600+ orders/day with horizontal scaling

### Latency

- Webhook response: 2-5ms
- Message processing: ~200ms
- Order creation: ~50ms

### Reliability

- 99.9%+ uptime with proper infrastructure
- Zero message loss with Redis persistence
- Automatic retry for failed operations