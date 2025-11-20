import app from './app';
import { config } from '@config/env.config';
import { logger } from '@utils/logger';
import { testDatabaseConnection } from '@config/database.config';
import { redis } from '@config/redis.config';

async function startServer() {
  try {
    logger.info('Starting Shoro Chat2Desk Bot Server...');

    const dbOk = await testDatabaseConnection();
    if (!dbOk) {
      throw new Error('Database connection failed');
    }

    await redis.ping();
    logger.info('Redis connection OK');

    app.listen(config.PORT, () => {
      logger.info(`✅ Webhook server started on port ${config.PORT}`);
      logger.info(`Environment: ${config.NODE_ENV}`);
      logger.info(`Endpoints:`);
      logger.info(`  POST /webhook/chat2desk - Receive webhooks`);
      logger.info(`  GET  /health - Health check`);
      logger.info(`  GET  / - Server info`);
    });
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
