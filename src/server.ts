import { messageQueue } from '@/queues';
import { config } from '@config/env.config';
import { logger } from '@utils/logger';
import { testDatabaseConnection } from '@config/database.config';
import { redis } from '@config/redis.config';
import { pool } from '@config/database.config';

interface WebhookBody {
  client_id: string;
  text: string;
  message_id: string;
  timestamp?: number;
}

async function startServer() {
  try {
    logger.info('Starting Shoro Chat2Desk Bot Server...');

    const dbOk = await testDatabaseConnection();
    if (!dbOk) {
      throw new Error('Database connection failed');
    }

    await redis.ping();
    logger.info('Redis connection OK');
    Bun.serve({
      port: config.PORT,
      hostname: '0.0.0.0',

      async fetch(req) {
        const url = new URL(req.url);

        const start = Date.now();

        try {
          let response: Response;

          if (url.pathname === '/' && req.method === 'GET') {
            response = new Response(
              JSON.stringify({
                name: 'Shoro Chat2Desk Bot',
                version: '0.1.0',
                status: 'running',
              }),
              {
                headers: { 'Content-Type': 'application/json' },
              }
            );
          } else if (url.pathname === '/health' && req.method === 'GET') {
            const checks = {
              redis: false,
              postgres: false,
              queues: {
                message: 0,
                outbox: 0,
              },
            };

            try {
              await redis.ping();
              checks.redis = true;
            } catch (err) {
              logger.error('Redis health check failed:', err);
            }

            try {
              await pool.query('SELECT 1');
              checks.postgres = true;
            } catch (err) {
              logger.error('PostgreSQL health check failed:', err);
            }

            try {
              checks.queues.message = await messageQueue.count();
            } catch (err) {
              logger.error('Queue health check failed:', err);
            }

            const isHealthy = checks.redis && checks.postgres;

            response = new Response(
              JSON.stringify({
                status: isHealthy ? 'healthy' : 'unhealthy',
                checks,
                timestamp: new Date().toISOString(),
              }),
              {
                status: isHealthy ? 200 : 503,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          } else if (url.pathname === '/webhook/chat2desk' && req.method === 'POST') {
            const body = (await req.json()) as WebhookBody;
            const { client_id, text, message_id } = body;

            if (!client_id || !text || !message_id) {
              logger.warn('Invalid webhook payload:', body);
              response = new Response(
                JSON.stringify({
                  success: false,
                  error: 'Missing required fields',
                }),
                {
                  status: 400,
                  headers: { 'Content-Type': 'application/json' },
                }
              );
            } else {
              logger.info(
                `Received webhook from client ${client_id}: "${text.substring(0, 50)}..."`
              );

              await messageQueue.add({
                clientId: client_id,
                messageText: text,
                messageId: message_id,
                timestamp: body.timestamp || Date.now(),
              });

              logger.debug(`Message queued for client ${client_id}`);

              response = new Response(JSON.stringify({ success: true }), {
                headers: { 'Content-Type': 'application/json' },
              });
            }
          } else {
            response = new Response('Not Found', { status: 404 });
          }

          const duration = Date.now() - start;
          logger.info(`${req.method} ${url.pathname} ${response.status} - ${duration}ms`);

          return response;
        } catch (error) {
          logger.error('Request error:', error);
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Internal server error',
            }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      },
    });

    logger.info(`✅ Webhook server started on port ${config.PORT}`);
    logger.info(`Environment: ${config.NODE_ENV}`);
    logger.info(`Endpoints:`);
    logger.info(`  POST /webhook/chat2desk - Receive webhooks`);
    logger.info(`  GET  /health - Health check`);
    logger.info(`  GET  / - Server info`);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await redis.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await redis.quit();
  process.exit(0);
});

startServer();
