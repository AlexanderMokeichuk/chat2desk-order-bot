import { redis } from '@config/redis.config';
import { DialogContext, DialogState } from '@/types';
import { logger } from '@utils/logger';

export class StateService {
  private readonly TTL = 86400;
  private readonly KEY_PREFIX = 'dialog:';

  async getContext(clientId: string): Promise<DialogContext | null> {
    try {
      const key = this.getKey(clientId);
      const data = await redis.get(key);

      if (!data) {
        return null;
      }

      return JSON.parse(data) as DialogContext;
    } catch (error) {
      logger.error(`Failed to get context for ${clientId}:`, error);
      return null;
    }
  }

  async setContext(clientId: string, context: DialogContext): Promise<void> {
    try {
      const key = this.getKey(clientId);
      await redis.setex(key, this.TTL, JSON.stringify(context));
      logger.debug(`Context saved for ${clientId}, state: ${context.state}`);
    } catch (error) {
      logger.error(`Failed to set context for ${clientId}:`, error);
      throw error;
    }
  }

  async deleteContext(clientId: string): Promise<void> {
    try {
      const key = this.getKey(clientId);
      await redis.del(key);
      logger.debug(`Context deleted for ${clientId}`);
    } catch (error) {
      logger.error(`Failed to delete context for ${clientId}:`, error);
    }
  }

  async initContext(clientId: string): Promise<DialogContext> {
    const context: DialogContext = {
      clientId,
      state: DialogState.INITIAL,
      data: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.setContext(clientId, context);
    return context;
  }

  async updateContext(
    clientId: string,
    updates: Partial<Omit<DialogContext, 'clientId' | 'createdAt'>>
  ): Promise<void> {
    const context = await this.getContext(clientId);

    if (!context) {
      throw new Error(`Context not found for ${clientId}`);
    }

    const updatedContext: DialogContext = {
      ...context,
      ...updates,
      updatedAt: Date.now(),
    };

    await this.setContext(clientId, updatedContext);
  }

  async hasContext(clientId: string): Promise<boolean> {
    try {
      const key = this.getKey(clientId);
      const exists = await redis.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error(`Failed to check context for ${clientId}:`, error);
      return false;
    }
  }

  private getKey(clientId: string): string {
    return `${this.KEY_PREFIX}${clientId}`;
  }
}
