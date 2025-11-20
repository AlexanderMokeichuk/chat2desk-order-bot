import { Pool } from 'pg';
import { config } from '@config/env.config';
import { logger } from '@utils/logger';

export const pool = new Pool({
  host: config.DATABASE_HOST,
  port: config.DATABASE_PORT,
  database: config.DATABASE_NAME,
  user: config.DATABASE_USER,
  password: config.DATABASE_PASSWORD,
  max: 20,
  min: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
  logger.info('PostgreSQL client connected');
});

pool.on('error', (err) => {
  logger.error('PostgreSQL pool error:', err);
});

export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const result = await pool.query('SELECT NOW()');
    logger.info(`Database connection test successful: ${result.rows[0].now}`);
    return true;
  } catch (error) {
    logger.error('Database connection test failed:', error);
    return false;
  }
}
