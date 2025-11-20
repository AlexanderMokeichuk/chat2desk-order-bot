import { Request, Response } from 'express';
import { messageQueue } from '@/queues';
import { logger } from '@utils/logger';
import { Chat2DeskWebhook } from '@/types';

export class WebhookController {
  /**
   * Handle incoming webhook from Chat2Desk
   */
  async handleChat2DeskWebhook(req: Request, res: Response): Promise<void> {
    try {
      const webhook: Chat2DeskWebhook = req.body;
      const { client_id, text, message_id } = webhook;

      if (!client_id || !text || !message_id) {
        logger.warn('Invalid webhook payload:', webhook);
        res.status(400).json({ success: false, error: 'Missing required fields' });
        return;
      }

      logger.info(`Received webhook from client ${client_id}: "${text.substring(0, 50)}..."`);

      await messageQueue.add({
        clientId: client_id,
        messageText: text,
        messageId: message_id,
        timestamp: webhook.timestamp || Date.now(),
      });

      logger.debug(`Message queued for client ${client_id}`);

      res.status(200).json({ success: true });
    } catch (error) {
      logger.error('Webhook error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}
