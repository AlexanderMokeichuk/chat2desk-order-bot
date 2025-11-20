interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string;
  DATABASE_HOST: string;
  DATABASE_PORT: number;
  DATABASE_NAME: string;
  DATABASE_USER: string;
  DATABASE_PASSWORD: string;
  CHAT2DESK_API_URL: string;
  CHAT2DESK_API_TOKEN: string;
  CHAT2DESK_WEBHOOK_SECRET?: string;
  LOG_LEVEL: string;
  WORKER_CONCURRENCY: number;
}

function validateEnv(): EnvConfig {
  const requiredEnvs = [
    'PORT',
    'REDIS_HOST',
    'DATABASE_HOST',
    'DATABASE_NAME',
    'DATABASE_USER',
    'CHAT2DESK_API_TOKEN',
  ];

  const missing = requiredEnvs.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '3000', 10),
    REDIS_HOST: process.env.REDIS_HOST || 'localhost',
    REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    DATABASE_HOST: process.env.DATABASE_HOST!,
    DATABASE_PORT: parseInt(process.env.DATABASE_PORT || '5432', 10),
    DATABASE_NAME: process.env.DATABASE_NAME!,
    DATABASE_USER: process.env.DATABASE_USER!,
    DATABASE_PASSWORD: process.env.DATABASE_PASSWORD || '',
    CHAT2DESK_API_URL: process.env.CHAT2DESK_API_URL || 'https://api.chat2desk.com/v1',
    CHAT2DESK_API_TOKEN: process.env.CHAT2DESK_API_TOKEN!,
    CHAT2DESK_WEBHOOK_SECRET: process.env.CHAT2DESK_WEBHOOK_SECRET,
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    WORKER_CONCURRENCY: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
  };
}

export const config = validateEnv();
