import Queue from 'bull';
import { redisConfig } from '@config/redis.config';
import { logger } from '@utils/logger';
import { MessageJob } from '@/types';

/**
 * Message queue for processing incoming messages from Chat2Desk
 */
export const messageQueue = new Queue<MessageJob>('messages', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 1000,
    timeout: 30000,
  },
  settings: {
    lockDuration: 30000,
    stalledInterval: 5000,
    maxStalledCount: 2,
  },
});

messageQueue.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed after ${job?.attemptsMade} attempts:`, err);
});

messageQueue.on('completed', (job) => {
  logger.debug(`Job ${job.id} completed successfully`);
});

messageQueue.on('stalled', (job) => {
  logger.warn(`Job ${job.id} stalled`);
});

messageQueue.on('error', (error) => {
  logger.error('Queue error:', error);
});

logger.info('Message queue initialized');
