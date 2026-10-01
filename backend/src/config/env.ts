import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface EnvConfig {
  PORT: number;
  NODE_ENV: string;
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  ELASTICSEARCH_NODE: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_CALLBACK_URL: string;
  SLACK_CLIENT_ID: string;
  SLACK_CLIENT_SECRET: string;
  SLACK_REDIRECT_URI: string;
  WORKER_CONCURRENCY: number;
  MIN_DELAY_BETWEEN_EMAILS_MS: number;
  MAX_EMAILS_PER_HOUR: number;
  MAX_EMAILS_PER_HOUR_PER_SENDER: number;
  JWT_SECRET: string;
  FRONTEND_URL: string;
}

function loadEnv(): EnvConfig {
  const requiredVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'JWT_SECRET',
  ];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      console.warn(`Warning: ${varName} is not set in environment variables.`);
    }
  }

  return {
    PORT: parseInt(process.env.PORT || '3001', 10),
    NODE_ENV: process.env.NODE_ENV || 'development',
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
    DB_NAME: process.env.DB_NAME || 'email_scheduler',
    DB_USER: process.env.DB_USER || 'postgres',
    DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
    REDIS_HOST: process.env.REDIS_HOST || 'localhost',
    REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
    ELASTICSEARCH_NODE: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
    GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback',
    SLACK_CLIENT_ID: process.env.SLACK_CLIENT_ID || '',
    SLACK_CLIENT_SECRET: process.env.SLACK_CLIENT_SECRET || '',
    SLACK_REDIRECT_URI: process.env.SLACK_REDIRECT_URI || 'http://localhost:3001/api/slack/callback',
    WORKER_CONCURRENCY: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
    MIN_DELAY_BETWEEN_EMAILS_MS: parseInt(process.env.MIN_DELAY_BETWEEN_EMAILS_MS || '2000', 10),
    MAX_EMAILS_PER_HOUR: parseInt(process.env.MAX_EMAILS_PER_HOUR || '200', 10),
    MAX_EMAILS_PER_HOUR_PER_SENDER: parseInt(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER || '50', 10),
    JWT_SECRET: process.env.JWT_SECRET || 'fallback-dev-secret',
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  };
}

export const env = loadEnv();
