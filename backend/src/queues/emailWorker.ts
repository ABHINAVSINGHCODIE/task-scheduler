import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { env } from '../config/env';
import { Email, Sender } from '../models';
import { QUEUE_NAME, EmailJobData, emailQueue } from './emailQueue';
import { sendEmail } from '../services/smtpService';
import { updateEmailIndex } from '../services/elasticsearchService';
import {
  checkAndIncrementSenderRate,
  checkAndIncrementGlobalRate,
  getRateLimitRescheduleDelay,
} from '../services/rateLimitService';
import { notifyRateLimitReached } from '../services/slackService';
import { v4 as uuidv4 } from 'uuid';

let emailWorker: Worker<EmailJobData> | null = null;

/**
 * Process a single email job
 * Handles idempotency, rate limiting, SMTP sending, and status updates
 */
export async function processEmailJob(job: { id?: string; data: EmailJobData }): Promise<void> {
  const { emailId, senderId, userId } = job.data;

  console.log(`[Worker] Processing job ${job.id} for email ${emailId}`);

  // Step 1: Fetch email from DB and check idempotency
  const email = await Email.findByPk(emailId);

  if (!email) {
    console.log(`[Worker] Email ${emailId} not found in DB. Skipping.`);
    return;
  }

  // Idempotency: if already sent, don't send again
  if (email.status === 'sent') {
    console.log(`[Worker] Email ${emailId} already sent. Skipping (idempotency).`);
    return;
  }

  // Step 2: Check global rate limit
  const globalRate = await checkAndIncrementGlobalRate();
  if (!globalRate.allowed) {
    console.log(`[Worker] Global rate limit reached (${globalRate.currentCount}/${globalRate.limit}). Rescheduling.`);
    const rescheduleDelay = getRateLimitRescheduleDelay();
    const newJobId = `${emailId}-reschedule-${uuidv4().slice(0, 8)}`;

    await emailQueue.add(
      'send-email',
      { emailId, senderId, userId },
      { jobId: newJobId, delay: rescheduleDelay }
    );

    await email.update({ bullmqJobId: newJobId });
    return;
  }

  // Step 3: Check per-sender rate limit
  const senderRate = await checkAndIncrementSenderRate(senderId);
  if (!senderRate.allowed) {
    console.log(`[Worker] Sender ${senderId} rate limit reached (${senderRate.currentCount}/${senderRate.limit}). Rescheduling.`);

    const rescheduleDelay = getRateLimitRescheduleDelay();
    const newJobId = `${emailId}-reschedule-${uuidv4().slice(0, 8)}`;

    await emailQueue.add(
      'send-email',
      { emailId, senderId, userId },
      { jobId: newJobId, delay: rescheduleDelay }
    );

    await email.update({ bullmqJobId: newJobId });

    // Fetch sender email for Slack notification
    const sender = await Sender.findByPk(senderId);
    const senderEmail = sender?.email || 'unknown';

    // Send Slack notification — won't crash if not connected
    await notifyRateLimitReached(
      userId,
      senderEmail,
      senderRate.currentCount,
      senderRate.limit
    );

    return;
  }

  // Step 4: Update status to "sending"
  await email.update({ status: 'sending' });

  // Step 5: Get sender SMTP config and send
  const sender = await Sender.findByPk(senderId);
  if (!sender) {
    await email.update({ status: 'failed', errorMessage: 'Sender not found' });
    await updateEmailIndex(emailId, { status: 'failed' });
    throw new Error(`Sender ${senderId} not found`);
  }

  try {
    const result = await sendEmail(
      sender,
      email.recipientEmail,
      email.subject,
      email.body
    );

    console.log(`[Worker] Email sent to ${email.recipientEmail}. MessageId: ${result.messageId}`);
    if (result.previewUrl) {
      console.log(`[Worker] Preview URL: ${result.previewUrl}`);
    }

    // Step 6: Update DB and Elasticsearch
    const sentAt = new Date();
    await email.update({ status: 'sent', sentAt });
    await updateEmailIndex(emailId, { status: 'sent', sentAt: sentAt.toISOString() });

  } catch (sendError: any) {
    console.error(`[Worker] Failed to send email ${emailId}:`, sendError.message);
    await email.update({
      status: 'failed',
      errorMessage: sendError.message,
    });
    await updateEmailIndex(emailId, { status: 'failed' });
    throw sendError; // BullMQ will retry based on attempts config
  }
}

/**
 * Start the BullMQ worker with configurable concurrency
 */
export function startEmailWorker(): Worker<EmailJobData> {
  emailWorker = new Worker<EmailJobData>(
    QUEUE_NAME,
    processEmailJob,
    {
      connection: redisConnection,
      concurrency: env.WORKER_CONCURRENCY,
      limiter: {
        max: env.MAX_EMAILS_PER_HOUR,
        duration: 3600000, // 1 hour in ms
      },
    }
  );

  emailWorker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed.`);
  });

  emailWorker.on('failed', (job, error) => {
    console.error(`[Worker] Job ${job?.id} failed:`, error.message);
  });

  emailWorker.on('error', (error) => {
    console.error('[Worker] Error:', error.message);
  });

  emailWorker.on('stalled', (jobId) => {
    console.warn(`[Worker] Job ${jobId} stalled.`);
  });

  console.log(`[Worker] Started with concurrency=${env.WORKER_CONCURRENCY}, ` +
    `globalLimit=${env.MAX_EMAILS_PER_HOUR}/hr, ` +
    `perSenderLimit=${env.MAX_EMAILS_PER_HOUR_PER_SENDER}/hr, ` +
    `minDelay=${env.MIN_DELAY_BETWEEN_EMAILS_MS}ms`);

  return emailWorker;
}

/**
 * Gracefully stop the worker
 */
export async function stopEmailWorker(): Promise<void> {
  if (emailWorker) {
    await emailWorker.close();
    console.log('[Worker] Stopped.');
  }
}
