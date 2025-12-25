import axios, { AxiosInstance } from 'axios';
import { config } from '@config/env.config';
import { logger } from '@utils/logger';
import { Chat2DeskMessage, Chat2DeskResponse } from '@/types';
import { outboxQueue } from '@/queues';

export class Chat2DeskService {
  private client: AxiosInstance;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;

  constructor() {
    this.client = axios.create({
      baseURL: config.CHAT2DESK_API_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        Authorization: config.CHAT2DESK_API_TOKEN,
      },
    });
  }

  /**
   * Send message to client via Chat2Desk
   */
  async sendMessage(clientId: string, text: string): Promise<boolean> {
    const message: Chat2DeskMessage = {
      client_id: clientId,
      text,
    };

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const response = await this.client.post<Chat2DeskResponse>('/messages', message);

        if (response.data.status === 'success' || response.status === 200) {
          logger.debug(`Message sent to ${clientId}`);
          return true;
        }

        logger.warn(`Chat2Desk API returned success=false for ${clientId}:`, response.data);
      } catch (error) {
        logger.error(
          `Failed to send message to ${clientId} (attempt ${attempt}/${this.MAX_RETRIES}):`,
          error
        );

        if (attempt === this.MAX_RETRIES) {
          await this.saveToOutbox(clientId, text);
          return false;
        }

        await this.sleep(this.RETRY_DELAY * Math.pow(2, attempt - 1));
      }
    }

    return false;
  }

  /**
   * Save failed message to outbox queue for later retry
   */
  private async saveToOutbox(clientId: string, text: string): Promise<void> {
    try {
      await outboxQueue.add({
        clientId,
        text,
        createdAt: Date.now(),
        attempts: 0,
      });

      logger.info(`Message saved to outbox queue for ${clientId}`);
    } catch (error) {
      logger.error(`Failed to save message to outbox for ${clientId}:`, error);
    }
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
