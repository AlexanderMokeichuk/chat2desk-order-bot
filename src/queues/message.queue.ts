import { Buffer } from 'node:buffer';
import { rabbitmq } from '@config/rabbitmq.config';
import { logger } from '@utils/logger';
import { MessageJob } from '@/types';
import type { ConsumeMessage } from 'amqplib';

export class MessageQueue {
  private queueName = 'messages';

  async add(job: MessageJob): Promise<void> {
    try {
      const channel = rabbitmq.getChannel();

      const message = Buffer.from(JSON.stringify(job));

      channel.sendToQueue(this.queueName, message, {
        persistent: true,
      });

      logger.debug(`Message added to queue: ${job.clientId}`);
    } catch (error) {
      logger.error('Failed to add message to queue:', error);
      throw error;
    }
  }

  async process(concurrency: number, handler: (job: MessageJob) => Promise<void>): Promise<void> {
    try {
      const channel = rabbitmq.getChannel();

      await channel.prefetch(concurrency);

      logger.info(
        `Starting to consume from ${this.queueName} queue with concurrency ${concurrency}`
      );

      await channel.consume(this.queueName, async (msg: ConsumeMessage | null) => {
        if (!msg) return;

        const job: MessageJob = JSON.parse(msg.content.toString());

        try {
          await handler(job);
          channel.ack(msg);
        } catch (error) {
          logger.error('Error processing message:', error);
          channel.nack(msg, false, true);
        }
      });
    } catch (error) {
      logger.error('Failed to process messages:', error);
      throw error;
    }
  }
}

export const messageQueue = new MessageQueue();
