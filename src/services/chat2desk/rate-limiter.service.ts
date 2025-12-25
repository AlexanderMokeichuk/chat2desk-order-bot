import { logger } from '@utils/logger';

/**
 * Simple rate limiter for Chat2Desk API
 * Limits: 300 requests per minute
 */
export class RateLimiter {
  private queue: number[] = [];
  private readonly limit: number;
  private readonly window: number;

  constructor(limit: number = 300, windowMs: number = 60000) {
    this.limit = limit;
    this.window = windowMs;
  }

  /**
   * Check if request can be made
   */
  canMakeRequest(): boolean {
    const now = Date.now();
    const windowStart = now - this.window;

    this.queue = this.queue.filter((timestamp) => timestamp > windowStart);

    if (this.queue.length >= this.limit) {
      logger.warn(`Rate limit reached: ${this.queue.length}/${this.limit} requests in window`);
      return false;
    }

    return true;
  }

  /**
   * Record a request
   */
  recordRequest(): void {
    this.queue.push(Date.now());
  }

  /**
   * Get current request count in window
   */
  getCurrentCount(): number {
    const now = Date.now();
    const windowStart = now - this.window;
    this.queue = this.queue.filter((timestamp) => timestamp > windowStart);
    return this.queue.length;
  }

  /**
   * Get time until next request is allowed (in ms)
   */
  getTimeUntilNextRequest(): number {
    if (this.canMakeRequest()) {
      return 0;
    }

    const oldest = this.queue[0];
    const timeUntilExpire = oldest + this.window - Date.now();
    return Math.max(0, timeUntilExpire);
  }
}
