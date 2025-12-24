import { messageQueue } from '@/queues';
import { DialogHandler } from '@/handlers';
import { logger } from '@utils/logger';
import type { MessageJob } from '@/types';

export class MessageWorker {
  private dialogHandler: DialogHandler;

  constructor() {
    this.dialogHandler = new DialogHandler();
  }

  start(concurrency: number = 5): void {
    logger.info(`Starting message worker with concurrency: ${concurrency}`);

    messageQueue
      .process(concurrency, async (job: MessageJob) => {
        await this.processJob(job);
      })
      .catch((error) => {
        logger.error('Worker process error:', error);
      });

    logger.info('Message worker started');
  }

  private async processJob(job: MessageJob): Promise<void> {
    const { clientId, messageText, messageId } = job;

    try {
      logger.info(`Processing message from ${clientId}: "${messageText.substring(0, 20)}..."`);

      await this.dialogHandler.processMessage(clientId, messageText);

      logger.debug(`Message ${messageId} processed successfully`);
    } catch (error) {
      logger.error(`Failed to process message ${messageId}:`, error);
      throw error;
    }
  }
}
