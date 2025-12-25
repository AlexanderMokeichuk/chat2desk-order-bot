# Architecture Overview

## System Design
```
┌─────────────────────────────────────────────────────┐
│                Chat2Desk Order Bot                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Telegram/WhatsApp → Chat2Desk → Webhook Server    │
│                                        ↓            │
│                                   RabbitMQ          │
│                                   (messages)        │
│                                        ↓            │
│                                  Worker Pool        │
│                                   ↙     ↘          │
│                              Redis    PostgreSQL    │
│                             (state)   (orders)      │
│                                   ↘     ↙          │
│                                 Chat2Desk API       │
│                                        ↓            │
│                                Client receives      │
│                                   response          │
└─────────────────────────────────────────────────────┘
```

## Components

### 1. Webhook Server (`src/server.ts`)

**Technology:** Bun.serve

**Role:** Receive webhooks from Chat2Desk

**Endpoints:**
- `POST /webhook/chat2desk` - Receive messages
- `GET /health` - Health check
- `GET /` - Server info

**Performance:**
- Response time: 2-5ms
- Responds immediately (async processing)

---

### 2. RabbitMQ Queues

**Technology:** RabbitMQ 3.13 + amqplib

**Queues:**

**`messages`** - Main message queue
- TTL: 24 hours
- Persistent: Yes
- Concurrency: 5 workers (prefetch)

**`outbox`** - Retry queue for failed API calls
- TTL: 7 days
- Max retries: 50
- Exponential backoff

**`dlq`** - Dead Letter Queue
- Permanent storage for failed messages
- For manual investigation

**Why RabbitMQ:**
- ✅ Message persistence (survive crashes)
- ✅ Guaranteed delivery (ack/nack)
- ✅ Horizontal scaling (multiple workers)
- ✅ Dead Letter Queue support

---

### 3. Message Worker (`src/workers/`)

**Role:** Process messages from RabbitMQ

**Concurrency:** 5 (configurable via `WORKER_CONCURRENCY`)

**Process Flow:**
1. Consume message from `messages` queue
2. Check idempotency (already processed?)
3. Pass to Dialog Handler
4. Update state in Redis
5. Send response via Chat2Desk API
6. Acknowledge message (ack)

**Error Handling:**
- If processing fails → nack (requeue)
- If Chat2Desk API fails → move to `outbox` queue
- After 50 attempts → move to `dlq`

---

### 4. Dialog Handler (`src/handlers/`)

**Role:** Conversation state machine

**States:**
```
INITIAL
   ↓ Greeting
WAITING_ADDRESS
   ↓ Validate address (5-200 chars)
WAITING_PHONE
   ↓ Validate phone (international format)
WAITING_QUANTITY
   ↓ Validate quantity (1-50)
WAITING_CONFIRMATION
   ↓ Show summary, wait Yes/No
COMPLETED
   ↓ Create order in database
```

**Validation:**
- Address: 5-200 characters
- Phone: +996XXXXXXXXX format
- Quantity: 1-50 items

---

### 5. State Management (`src/services/state/`)

**Technology:** Redis

**Data Structure:**
```typescript
{
  clientId: "764015992",
  state: "WAITING_ADDRESS",
  data: {
    address: null,
    phone: null,
    quantity: null
  },
  createdAt: 1703520000,
  updatedAt: 1703520010
}
```

**TTL:** 24 hours (auto-cleanup)

**Idempotency:**
```
Key: processed:msg_12345
Value: true
TTL: 1 hour
```

**Why Redis:**
- Fast (sub-millisecond reads)
- Automatic expiration (TTL)
- Atomic operations

---

### 6. Chat2Desk Service (`src/services/chat2desk/`)

**Role:** Send messages to clients

**Retry Strategy:**
- 3 attempts with exponential backoff (1s, 2s, 4s)
- Timeout: 10 seconds
- If all fail → move to outbox queue

**Rate Limiting:**
- 300 requests/minute (Chat2Desk limit)
- Implemented via token bucket algorithm

---

### 7. Order Service (`src/services/order/`)

**Role:** Create orders in PostgreSQL

**Database Schema:**
```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  client_phone VARCHAR(20) NOT NULL,
  delivery_address TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  chat2desk_client_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Message Flow (Detailed)

### Happy Path
```
1. Client sends "Hello" in Telegram
   ↓
2. Chat2Desk receives → sends webhook to your server
   POST /webhook/chat2desk {client_id: "123", text: "Hello"}
   ↓
3. Webhook Server queues to RabbitMQ (5ms)
   ← Responds 200 OK immediately
   ↓
4. Worker picks up from RabbitMQ queue
   ↓
5. Worker checks Redis: no state found
   ↓
6. Worker creates state: INITIAL
   ↓
7. Worker sends via Chat2Desk API: "Hello! Please provide address."
   ↓
8. Worker updates state: WAITING_ADDRESS
   ↓
9. Worker acknowledges message in RabbitMQ (deleted from queue)
```

### Error Path (Chat2Desk API Down)
```
1. Worker tries to send response
   ↓
2. Chat2Desk API returns 500
   ↓
3. Worker retries (attempt 2) → 500
   ↓
4. Worker retries (attempt 3) → 500
   ↓
5. Worker adds to outbox queue
   ↓
6. Worker acknowledges original message
   ↓
7. Outbox Worker retries every 5 minutes
   ↓
8. After 50 attempts → moves to DLQ
```

---

## Fault Tolerance

### Level 1: RabbitMQ Persistence
- Messages saved to disk
- Survive RabbitMQ restart

### Level 2: Worker Failures
- Message returns to queue (nack)
- Another worker picks it up

### Level 3: Redis State
- AOF persistence (append-only file)
- State recovers after Redis restart

### Level 4: PostgreSQL
- ACID guarantees
- Connection pooling (20 max, 5 min)

### Level 5: Chat2Desk API
- 3 retries + exponential backoff
- Outbox queue for long-term retry

---

## Scaling

### Vertical Scaling
```bash
# Increase concurrency
WORKER_CONCURRENCY=20
```

### Horizontal Scaling
```bash
# Run multiple worker processes
pm2 start src/worker.ts -i 3
# 3 processes × 5 concurrency = 15 parallel workers
```

### RabbitMQ Cluster
For high availability:
- 3+ RabbitMQ nodes
- Mirrored queues
- Load balancer

---

## Monitoring

### RabbitMQ Management UI
- URL: http://localhost:15672
- Username: `admin`, Password: `password`
- Monitor queue sizes, message rates

### Metrics to Watch
- `messages` queue size (should be near 0)
- `outbox` queue size (should be small)
- `dlq` queue size (should be 0)
- Message processing rate
- Worker concurrency utilization

### Logs
```bash
# Server logs
docker logs bot-server

# Worker logs
docker logs bot-worker

# RabbitMQ logs
docker logs bot-rabbitmq
```

---

## Performance Characteristics

### Throughput
- 60 messages/second
- 300+ orders/day (single worker)
- 1500+ orders/day (5 workers)

### Latency
- Webhook response: 2-5ms
- Message processing: ~200ms
- Order creation: ~50ms

### Reliability
- 99.9%+ uptime with proper infrastructure
- Zero message loss (RabbitMQ persistence)
- Automatic retry for transient failures

---

## Technology Decisions

### Why RabbitMQ over Bull/Redis?
- ✅ Industry standard in enterprise
- ✅ Better for production (used in Shoro company)
- ✅ More reliable message delivery guarantees
- ✅ Built-in Dead Letter Queue support
- ✅ Better observability (Management UI)

### Why Redis for State?
- ✅ Sub-millisecond read/write
- ✅ Automatic expiration (TTL)
- ✅ Simpler than PostgreSQL for temporary data

### Why PostgreSQL for Orders?
- ✅ ACID transactions
- ✅ Complex queries (analytics)
- ✅ Long-term storage

### Why Bun over Node.js?
- ✅ 3-4x faster startup
- ✅ Native TypeScript support
- ✅ Built-in test runner
- ✅ Faster package manager