import { MessageWorker } from '@/workers';
import { config } from '@config/env.config';
import { logger } from '@utils/logger';
import { testDatabaseConnection } from '@config/database.config';
import { redis } from '@config/redis.config';

async function startWorker() {
  try {
    logger.info('Starting Chat2Desk Order Bot Worker...');

    const dbOk = await testDatabaseConnection();
    if (!dbOk) {
      throw new Error('Database connection failed');
    }

    await redis.ping();
    logger.info('Redis connection OK');

    const worker = new MessageWorker();
    worker.start(config.WORKER_CONCURRENCY);

    logger.info('✅ Worker started successfully');
    logger.info(`Concurrency: ${config.WORKER_CONCURRENCY}`);
    logger.info('Waiting for messages...');
  } catch (error) {
    logger.error('Failed to start worker:', error);
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

startWorker();
