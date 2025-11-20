import { config } from '@config/env.config';
import { logger } from '@utils/logger';
import { redis } from '@config/redis.config';
import { testDatabaseConnection } from '@config/database.config';

async function test() {
  logger.info('=== Testing Configuration ===');
  logger.info(`Environment: ${config.NODE_ENV}`);
  logger.info(`Port: ${config.PORT}`);
  logger.info(`Redis: ${config.REDIS_HOST}:${config.REDIS_PORT}`);
  logger.info(`Database: ${config.DATABASE_HOST}:${config.DATABASE_PORT}/${config.DATABASE_NAME}`);

  logger.info('=== Testing Redis Connection ===');
  try {
    const pong = await redis.ping();
    logger.info(`Redis ping: ${pong}`);
  } catch (error) {
    logger.error('Redis connection failed:', error);
  }

  logger.info('=== Testing PostgreSQL Connection ===');
  await testDatabaseConnection();

  logger.info('=== All Tests Completed ===');

  // Cleanup
  await redis.quit();
  process.exit(0);
}

test();
