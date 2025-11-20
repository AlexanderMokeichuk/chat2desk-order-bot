import { Request, Response, NextFunction } from 'express';
import { logger } from '@utils/logger';

/**
 * Global error handler middleware
 */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  logger.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
}
