import { Request, Response } from 'express';
import { redis } from '@config/redis.config';
import { pool } from '@config/database.config';
import { messageQueue, outboxQueue } from '@/queues';
import { logger } from '@utils/logger';

export class HealthController {
  /**
   * Health check endpoint
   */
  async checkHealth(_req: Request, res: Response): Promise<void> {
    try {
      const checks = {
        redis: false,
        postgres: false,
        queues: {
          message: 0,
          outbox: 0,
        },
      };

      try {
        await redis.ping();
        checks.redis = true;
      } catch (err) {
        logger.error('Redis health check failed:', err);
      }

      try {
        await pool.query('SELECT 1');
        checks.postgres = true;
      } catch (err) {
        logger.error('PostgreSQL health check failed:', err);
      }

      try {
        checks.queues.message = await messageQueue.count();
        checks.queues.outbox = await outboxQueue.count();
      } catch (err) {
        logger.error('Queue health check failed:', err);
      }

      const isHealthy = checks.redis && checks.postgres;

      res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'healthy' : 'unhealthy',
        checks,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Health check error:', error);
      res.status(500).json({
        status: 'error',
        error: 'Health check failed',
      });
    }
  }
}
