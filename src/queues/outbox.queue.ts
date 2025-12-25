import { Buffer } from 'node:buffer';
import { rabbitmq } from '@config/rabbitmq.config';
import { logger } from '@utils/logger';
import { OutboxJob } from '@/types';
import type { ConsumeMessage } from 'amqplib';

export class OutboxQueue {
  private queueName = 'outbox';

  async add(job: OutboxJob): Promise<void> {
    try {
      const channel = rabbitmq.getChannel();

      const message = Buffer.from(JSON.stringify(job));

      channel.sendToQueue(this.queueName, message, {
        persistent: true,
      });

      logger.debug(`Message added to outbox queue: ${job.clientId}`);
    } catch (error) {
      logger.error('Failed to add message to outbox queue:', error);
      throw error;
    }
  }

  async process(concurrency: number, handler: (job: OutboxJob) => Promise<void>): Promise<void> {
    try {
      const channel = rabbitmq.getChannel();

      await channel.prefetch(concurrency);

      logger.info(
        `Starting to consume from ${this.queueName} queue with concurrency ${concurrency}`
      );

      await channel.consume(this.queueName, async (msg: ConsumeMessage | null) => {
        if (!msg) return;

        const job: OutboxJob = JSON.parse(msg.content.toString());

        try {
          await handler(job);
          channel.ack(msg);
        } catch (error) {
          logger.error('Error processing outbox message:', error);

          if (job.attempts >= 50) {
            logger.error(`Max retries reached for ${job.clientId}, moving to DLQ`);

            const dlqChannel = rabbitmq.getChannel();
            dlqChannel.sendToQueue('dlq', msg.content, { persistent: true });

            channel.ack(msg);
          } else {
            job.attempts += 1;
            const updatedMessage = Buffer.from(JSON.stringify(job));
            channel.sendToQueue(this.queueName, updatedMessage, { persistent: true });

            channel.ack(msg);
          }
        }
      });
    } catch (error) {
      logger.error('Failed to process outbox messages:', error);
      throw error;
    }
  }
}

export const outboxQueue = new OutboxQueue();
