import { Job } from 'bull';
import { messageQueue } from '@/queues';
import { DialogHandler } from '@/handlers';
import { redis } from '@config/redis.config';
import { logger } from '@utils/logger';
import { MessageJob } from '@/types';

export class MessageWorker {
  private dialogHandler: DialogHandler;

  constructor() {
    this.dialogHandler = new DialogHandler();
  }

  /**
   * Start processing messages from queue
   */
  start(concurrency: number = 5): void {
    logger.info(`Starting message worker with concurrency: ${concurrency}`);

    messageQueue.process(concurrency, async (job: Job<MessageJob>) => {
      await this.processJob(job);
    });

    logger.info('Message worker started');
  }

  /**
   * Process single message job
   */
  private async processJob(job: Job<MessageJob>): Promise<void> {
    const { clientId, messageText, messageId } = job.data;

    try {
      const processed = await this.isProcessed(messageId);
      if (processed) {
        logger.warn(`Message ${messageId} already processed, skipping`);
        return;
      }

      logger.info(`Processing message from ${clientId}: "${messageText.substring(0, 50)}..."`);

      await this.dialogHandler.processMessage(clientId, messageText);

      await this.markProcessed(messageId);

      logger.debug(`Message ${messageId} processed successfully`);
    } catch (error) {
      logger.error(`Failed to process message ${messageId}:`, error);
      throw error;
    }
  }

  /**
   * Check if message already processed
   */
  private async isProcessed(messageId: string): Promise<boolean> {
    try {
      const key = `processed:${messageId}`;
      const exists = await redis.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error(`Failed to check if message ${messageId} is processed:`, error);
      return false;
    }
  }

  /**
   * Mark message as processed
   */
  private async markProcessed(messageId: string): Promise<void> {
    try {
      const key = `processed:${messageId}`;
      const TTL = 604800;
      await redis.setex(key, TTL, '1');
    } catch (error) {
      logger.error(`Failed to mark message ${messageId} as processed:`, error);
    }
  }
}
