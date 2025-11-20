import Queue from 'bull';
import { redisConfig } from '@config/redis.config';
import { OutboxJob } from '@/types';
import { logger } from '@utils/logger';

/**
 * Outbox queue for retrying failed Chat2Desk API calls
 */
export const outboxQueue = new Queue<OutboxJob>('outbox', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 50,
    backoff: {
      type: 'exponential',
      delay: 60000,
    },
    removeOnComplete: 10,
    removeOnFail: false,
  },
});

outboxQueue.on('failed', (job, err) => {
  logger.error(`Outbox job ${job?.id} failed:`, err);
});

outboxQueue.on('completed', (job) => {
  logger.info(`Outbox job ${job.id} completed - message sent successfully`);
});

logger.info('Outbox queue initialized');
