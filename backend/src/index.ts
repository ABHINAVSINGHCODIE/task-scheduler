import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import { env } from './config/env';
import { connectDatabase } from './config/database';
import { initializeElasticsearch } from './config/elasticsearch';
import { emailQueue } from './queues/emailQueue';
import { startEmailWorker, stopEmailWorker } from './queues/emailWorker';
import { recoverOrphanedJobs } from './services/emailService';
import { errorHandler } from './middleware/errorHandler';

// Import models to register associations
import './models';

// Import routes
import authRoutes from './routes/authRoutes';
import emailRoutes from './routes/emailRoutes';
import senderRoutes from './routes/senderRoutes';
import slackRoutes from './routes/slackRoutes';

async function startServer(): Promise<void> {
  const app = express();

  // ─── Middleware ───────────────────────────────────────
  app.use(cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(passport.initialize());

  // ─── BullMQ Dashboard (Bull Board) ───────────────────
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: [new BullMQAdapter(emailQueue)],
    serverAdapter,
  });

  app.use('/admin/queues', serverAdapter.getRouter());

  // ─── API Routes ──────────────────────────────────────
  app.use('/api/auth', authRoutes);
  app.use('/api/emails', emailRoutes);
  app.use('/api/senders', senderRoutes);
  app.use('/api/slack', slackRoutes);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // ─── Error Handler ──────────────────────────────────
  app.use(errorHandler);

  // ─── Initialize Services ────────────────────────────
  console.log('─────────────────────────────────────────');
  console.log('  Email Scheduler Service Starting...');
  console.log('─────────────────────────────────────────');

  // 1. Connect to PostgreSQL
  await connectDatabase();

  // 2. Initialize Elasticsearch
  await initializeElasticsearch();

  // 3. Start BullMQ Worker
  startEmailWorker();

  // 4. Recovery sweep: re-create any orphaned BullMQ jobs
  await recoverOrphanedJobs();

  // 5. Start Express server
  app.listen(env.PORT, () => {
    console.log('─────────────────────────────────────────');
    console.log(`  Server running on http://localhost:${env.PORT}`);
    console.log(`  BullMQ Dashboard: http://localhost:${env.PORT}/admin/queues`);
    console.log(`  Environment: ${env.NODE_ENV}`);
    console.log('─────────────────────────────────────────');
  });

  // ─── Graceful Shutdown ──────────────────────────────
  const shutdown = async (signal: string) => {
    console.log(`\n[${signal}] Shutting down gracefully...`);
    await stopEmailWorker();
    await emailQueue.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
