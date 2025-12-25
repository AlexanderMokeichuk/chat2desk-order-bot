import { serve } from 'bun';
import { config } from '@config/env.config';
import { rabbitmq } from '@config/rabbitmq.config';
import { messageQueue } from '@/queues';
import { logger } from '@utils/logger';
import { testDatabaseConnection } from '@config/database.config';
import { redis } from '@config/redis.config';
import type { Chat2DeskWebhook } from '@/types';

async function startServer() {
  try {
    logger.info('Starting Chat2Desk Order Bot Server...');

    await rabbitmq.connect();

    const dbOk = await testDatabaseConnection();
    if (!dbOk) {
      throw new Error('Database connection failed');
    }

    await redis.ping();
    logger.info('Redis connection OK');

    serve({
      port: config.PORT,
      async fetch(req) {
        const url = new URL(req.url);
        let response: Response;

        if (url.pathname === '/webhook/chat2desk' && req.method === 'POST') {
          try {
            const body = (await req.json()) as Chat2DeskWebhook;

            logger.info(
              `Received webhook from client ${body.client_id}: "${body.text.substring(0, 20)}..."`
            );

            await messageQueue.add({
              clientId: body.client_id,
              messageText: body.text,
              messageId: body.message_id,
            });

            logger.debug(`Message queued for client ${body.client_id}`);

            response = new Response(JSON.stringify({ success: true }), {
              headers: { 'Content-Type': 'application/json' },
            });
          } catch (error) {
            logger.error('Webhook processing error:', error);
            response = new Response(
              JSON.stringify({ success: false, error: 'Internal server error' }),
              {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          }

          logger.info(`${req.method} ${url.pathname} ${response.status}`);
          return response;
        } else if (url.pathname === '/health' && req.method === 'GET') {
          response = new Response(
            JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }),
            {
              headers: { 'Content-Type': 'application/json' },
            }
          );
          return response;
        } else if (url.pathname === '/' && req.method === 'GET') {
          response = new Response(
            JSON.stringify({
              name: 'Chat2Desk Order Bot',
              version: '0.1.0',
              status: 'running',
            }),
            {
              headers: { 'Content-Type': 'application/json' },
            }
          );
          return response;
        }

        return new Response('Not Found', { status: 404 });
      },
    });

    logger.info(`✅ Webhook server started on port ${config.PORT}`);
    logger.info(`Environment: ${config.NODE_ENV}`);
    logger.info('Endpoints:');
    logger.info('  POST /webhook/chat2desk - Receive webhooks');
    logger.info('  GET  /health - Health check');
    logger.info('  GET  / - Server info');
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await rabbitmq.close();
  await redis.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await rabbitmq.close();
  await redis.quit();
  process.exit(0);
});

startServer();
