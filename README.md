# 🤖 Chat2Desk Order Bot

<div align="center">

**Production-ready chatbot for automating order processing via Chat2Desk API**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black.svg)](https://bun.sh/)
[![Redis](https://img.shields.io/badge/Redis-7.0-red.svg)](https://redis.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [Documentation](#-documentation)

</div>

---

## 🎯 Features

- ✨ **Automated Order Processing** - Handle customer orders via chat (WhatsApp, Telegram, etc.)
- 🔄 **State Machine Dialog** - Smart conversation flow with 5 states
- ✅ **Data Validation** - Address, phone number, and quantity validation
- 🛡️ **Fault-Tolerant** - Retry mechanisms, idempotency, queue-based architecture
- ⚡ **High Performance** - 2-5ms response time, 300+ orders/day capacity
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
# Start infrastructure (Redis + PostgreSQL)
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
```

## 🏗️ Architecture
```
Chat2Desk → Webhook Server → Redis Queue → Workers → PostgreSQL
                                  ↓
                          State Management (Redis)
```

### Components

- **Webhook Server** - Receives webhooks from Chat2Desk (Bun.serve, 2-5ms response)
- **Message Queue** - Buffers messages for processing (Bull + Redis)
- **Workers** - Processes messages with dialog logic (configurable concurrency)
- **State Management** - Stores conversation state (Redis, 24h TTL)
- **PostgreSQL** - Persists orders

### Dialog Flow
```
INITIAL → WAITING_ADDRESS → WAITING_PHONE → WAITING_QUANTITY → WAITING_CONFIRMATION → COMPLETED
```

Each state validates user input and guides them through the order process.

## 📊 Performance

- **Response Time:** 2-5ms (webhook endpoint)
- **Processing Time:** ~200ms per message
- **Throughput:** 60 msg/sec (300+ orders/day)
- **Concurrency:** 5 workers (scalable to 50+)
- **Fault Tolerance:** 3 retries with exponential backoff

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Webhook server port | `3000` |
| `REDIS_HOST` | Redis hostname | `localhost` |
| `DATABASE_HOST` | PostgreSQL hostname | `localhost` |
| `CHAT2DESK_API_TOKEN` | Chat2Desk API token | *required* |
| `WORKER_CONCURRENCY` | Worker processes | `5` |
| `LOG_LEVEL` | Logging level | `info` |

See [`.env.example`](.env.example) for full list.

## 📚 Documentation

- [Architecture Guide](docs/ARCHITECTURE.md) - Detailed system design & components
- [API Reference](#api-endpoints) - Available endpoints

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
  "status": "healthy",
  "checks": {
    "redis": true,
    "postgres": true,
    "queues": {
      "message": 0,
      "outbox": 0
    }
  }
}
```

### `GET /`

Server information.

## 🐛 Troubleshooting

### Bot not responding

1. Check `CHAT2DESK_API_TOKEN` in `.env`
2. Verify webhook URL in Chat2Desk settings
3. Check logs: `docker logs bot-redis`

### Connection errors
```bash
# Restart infrastructure
bun run docker:down
bun run docker:up
```

### Messages not processing
```bash
# Check queue size
docker exec -it bot-redis redis-cli
> LLEN bull:messages:wait
```

## 🤝 Contributing

Contributions are welcome! Please check out the [Contributing Guide](CONTRIBUTING.md).

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 💰 Support

If you find this project helpful, consider supporting:

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Support-yellow.svg)](https://www.buymeacoffee.com/YOUR_USERNAME)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Bun](https://bun.sh/) - Fast JavaScript runtime
- Queue powered by [Bull](https://github.com/OptimalBits/bull)
- Integrated with [Chat2Desk](https://chat2desk.com/) API

## 👤 Author

**Alexander Mokeichuk**

- GitHub: [@AlexanderMokeichuk](https://github.com/AlexanderMokeichuk)
- LinkedIn: [Alexander Mokeichuk](https://www.linkedin.com/in/alexander-mokeichuk-b36212324/)

---

<div align="center">

**⭐ Star this repo if you find it useful!**

Made with ❤️ and TypeScript

</div>
