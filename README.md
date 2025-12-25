# 🤖 Chat2Desk Order Bot

Production-ready chatbot for automating order processing via Chat2Desk API with RabbitMQ message queue.

## 🎯 Features

- ✨ **Automated Order Processing** - Handle customer orders via chat (WhatsApp, Telegram, etc.)
- 🐰 **RabbitMQ Message Queue** - Reliable message delivery with retry mechanisms
- 🔄 **State Machine Dialog** - Smart conversation flow with validation
- ✅ **Data Validation** - Address, phone number, and quantity validation
- 🛡️ **Fault-Tolerant** - Retry with exponential backoff, Dead Letter Queue
- ⚡ **High Performance** - 2-5ms webhook response, scalable workers
- 📊 **Production Ready** - Graceful shutdown, health checks, comprehensive logging

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh/) 1.0+
- [Docker](https://www.docker.com/) & Docker Compose
- [Chat2Desk](https://chat2desk.com/) account with API token

### Installation

```bash
# Clone the repository
git clone https://github.com/AlexanderMokeichuk/chat2desk-order-bot.git
cd chat2desk-order-bot

# Install dependencies
bun install

# Setup environment
cp .env.example .env
# Edit .env and add your CHAT2DESK_API_TOKEN
```

### Running

```bash
# Start infrastructure (RabbitMQ + Redis + PostgreSQL)
bun run docker:up

# Terminal 1: Start webhook server
bun run dev:server

# Terminal 2: Start worker
bun run dev:worker
```

### Testing

```bash
# Send test webhook
curl -X POST http://localhost:3000/webhook/chat2desk \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "test_user",
    "message_id": "msg_001",
    "text": "Hello"
  }'

# Check health
curl http://localhost:3000/health

# Access RabbitMQ Management UI
open http://localhost:15672
# Username: admin, Password: password
```

## 🏗️ Architecture

```
Telegram/WhatsApp
       ↓
   Chat2Desk
       ↓ (webhook)
  Webhook Server ───→ RabbitMQ (messages queue)
       ↓                    ↓
   Health Check        Worker Pool (5 workers)
                            ↓
                    ┌───────┼───────┐
                    ↓       ↓       ↓
                 Redis  PostgreSQL  Chat2Desk API
                (state)  (orders)   (send response)
```

### Components

- **Webhook Server** - Receives webhooks from Chat2Desk (Bun.serve, 2-5ms response)
- **RabbitMQ** - Message queue with 3 queues: messages, outbox, dlq
- **Workers** - Process messages with dialog logic (configurable concurrency)
- **Redis** - Stores conversation state (24h TTL) and idempotency keys
- **PostgreSQL** - Persists orders

### Dialog Flow

```
INITIAL
   ↓
WAITING_ADDRESS → validate address
   ↓
WAITING_PHONE → validate phone (international format)
   ↓
WAITING_QUANTITY → validate quantity (1-50)
   ↓
WAITING_CONFIRMATION → show summary, wait Yes/No
   ↓
COMPLETED → create order in database
```

## 📊 Tech Stack

| Component       | Technology         |
|-----------------|--------------------|
| Runtime         | Bun 1.0+           |
| Language        | TypeScript         |
| Message Queue   | RabbitMQ 3.13      |
| Cache/State     | Redis 7.0          |
| Database        | PostgreSQL 15      |
| API Integration | Chat2Desk REST API |
| Logging         | Winston            |

## 🔧 Configuration

### Environment Variables

| Variable              | Description             | Default                  |
|-----------------------|-------------------------|--------------------------|
| `PORT`                | Webhook server port     | `3000`                   |
| `RABBITMQ_URL`        | RabbitMQ connection URL | `amqp://localhost:5672/` |
| `REDIS_HOST`          | Redis hostname          | `localhost`              |
| `DATABASE_HOST`       | PostgreSQL hostname     | `localhost`              |
| `CHAT2DESK_API_TOKEN` | Chat2Desk API token     | *required*               |
| `WORKER_CONCURRENCY`  | Concurrent workers      | `5`                      |
| `LOG_LEVEL`           | Logging level           | `info`                   |

See [`.env.example`](.env.example) for complete list.

## 📡 API Endpoints

### `POST /webhook/chat2desk`

Receives webhooks from Chat2Desk.

**Request:**

```json
{
  "client_id": "user_123",
  "message_id": "msg_001",
  "text": "Hello"
}
```

**Response:**

```json
{
  "success": true
}
```

### `GET /health`

Health check endpoint.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2025-12-25T10:00:00.000Z"
}
```

### `GET /`

Server information.

## 📚 Documentation

- [Architecture Guide](ARCHITECTURE.md) - Detailed system design
- [Contributing Guide](CONTRIBUTING.md) - How to contribute

## 🐛 Troubleshooting

### Bot not responding

1. Check `CHAT2DESK_API_TOKEN` in `.env`
2. Verify webhook URL in Chat2Desk settings
3. Check RabbitMQ is running: `docker ps | grep rabbitmq`
4. Check worker logs for errors

### RabbitMQ connection failed

```bash
# Restart RabbitMQ
docker restart bot-rabbitmq

# Check RabbitMQ logs
docker logs bot-rabbitmq
```

### Messages stuck in queue

Access RabbitMQ Management UI at http://localhost:15672:

- Check `messages` queue size
- Check `outbox` queue for failed sends
- Check `dlq` for permanently failed messages

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 👤 Author

**Alexander Mokeichuk**

- GitHub: [@AlexanderMokeichuk](https://github.com/AlexanderMokeichuk)
- LinkedIn: [Alexander Mokeichuk](https://www.linkedin.com/in/alexander-mokeichuk-b36212324/)

---

**⭐ Star this repo if you find it useful!**
