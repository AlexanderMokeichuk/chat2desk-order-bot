/* eslint-disable @typescript-eslint/no-explicit-any */
import amqp from 'amqplib';
import { config } from './env.config';
import { logger } from '@utils/logger';

class RabbitMQConnection {
  private connection: any = null;
  private channel: any = null;
  private isConnecting = false;

  async connect(): Promise<void> {
    if (this.connection && this.channel) {
      logger.debug('RabbitMQ already connected');
      return;
    }

    if (this.isConnecting) {
      logger.debug('RabbitMQ connection in progress');
      return;
    }

    this.isConnecting = true;

    try {
      this.connection = await amqp.connect(config.RABBITMQ_URL);
      this.channel = await this.connection.createChannel();

      await this.channel.assertQueue('messages', {
        durable: true,
        arguments: {
          'x-message-ttl': 86400000,
        },
      });

      await this.channel.assertQueue('outbox', {
        durable: true,
        arguments: {
          'x-message-ttl': 604800000,
        },
      });

      await this.channel.assertQueue('dlq', {
        durable: true,
      });

      await this.channel.prefetch(config.WORKER_CONCURRENCY);

      logger.info('RabbitMQ connected');

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        this.connection = null;
        this.channel = null;
        this.isConnecting = false;
      });

      this.connection.on('error', (err: Error) => {
        logger.error('RabbitMQ connection error:', err);
      });

      this.isConnecting = false;
    } catch (error) {
      this.isConnecting = false;
      logger.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  getChannel(): any {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized. Call connect() first.');
    }
    return this.channel;
  }

  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      logger.info('RabbitMQ connection closed');
    } catch (error) {
      logger.error('Error closing RabbitMQ connection:', error);
    }
  }
}

export const rabbitmq = new RabbitMQConnection();
