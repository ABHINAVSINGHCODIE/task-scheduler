import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import { Email, Sender } from '../models';
import { addEmailJob, emailQueue } from '../queues/emailQueue';
import { indexEmail } from './elasticsearchService';
import { generateIdempotencyKey } from '../utils/idempotency';
import { env } from '../config/env';

interface ScheduleEmailParams {
  userId: string;
  senderId: string;
  subject: string;
  body: string;
  recipients: string[];
  startTime: string;
  delayBetweenEmails: number; // in seconds
  hourlyLimit: number;
}

/**
 * Schedule a batch of emails to be sent at staggered intervals
 * Uses BullMQ delayed jobs — NOT cron
 */
export async function scheduleEmailBatch(
  params: ScheduleEmailParams
): Promise<{ scheduled: number; skipped: number; emails: any[] }> {
  const { userId, senderId, subject, body, recipients, startTime, delayBetweenEmails } = params;

  // Verify sender exists and belongs to user
  const sender = await Sender.findOne({ where: { id: senderId, userId } });
  if (!sender) {
    throw new Error('Sender not found or does not belong to this user');
  }

  const startDate = new Date(startTime);
  const createdEmails: any[] = [];
  let skipped = 0;

  for (let i = 0; i < recipients.length; i++) {
    const recipientEmail = recipients[i].trim();
    if (!recipientEmail) continue;

    // Calculate scheduled time with staggered delay
    const scheduledAt = new Date(
      startDate.getTime() + i * delayBetweenEmails * 1000
    );

    // Generate idempotency key
    const idempotencyKey = generateIdempotencyKey(
      senderId,
      recipientEmail,
      subject,
      scheduledAt.toISOString()
    );

    // Check for existing email with same idempotency key
    const existing = await Email.findOne({ where: { idempotencyKey } });
    if (existing) {
      console.log(`[EmailService] Skipping duplicate: ${recipientEmail} at ${scheduledAt}`);
      skipped++;
      continue;
    }

    // Generate unique job ID
    const bullmqJobId = `email-${uuidv4()}`;

    // Create email record in DB
    const email = await Email.create({
      idempotencyKey,
      userId,
      senderId,
      recipientEmail,
      subject,
      body,
      scheduledAt,
      status: 'scheduled',
      bullmqJobId,
    });

    // Add delayed job to BullMQ
    await addEmailJob(email.id, senderId, userId, scheduledAt, bullmqJobId);

    // Index in Elasticsearch
    await indexEmail({
      id: email.id,
      userId,
      senderId,
      senderEmail: sender.email,
      recipientEmail,
      subject,
      body,
      status: 'scheduled',
      scheduledAt: scheduledAt.toISOString(),
      sentAt: null,
      createdAt: new Date().toISOString(),
    });

    createdEmails.push(email.toJSON());
  }

  return {
    scheduled: createdEmails.length,
    skipped,
    emails: createdEmails,
  };
}

/**
 * Get scheduled emails for a user (paginated)
 */
export async function getScheduledEmails(
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ emails: any[]; total: number; page: number; totalPages: number }> {
  const offset = (page - 1) * limit;

  const { rows, count } = await Email.findAndCountAll({
    where: {
      userId,
      status: { [Op.in]: ['scheduled', 'queued'] },
    },
    include: [{ model: Sender, as: 'sender', attributes: ['email'] }],
    order: [['scheduledAt', 'ASC']],
    limit,
    offset,
  });

  return {
    emails: rows,
    total: count,
    page,
    totalPages: Math.ceil(count / limit),
  };
}

/**
 * Get sent emails for a user (paginated)
 */
export async function getSentEmails(
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ emails: any[]; total: number; page: number; totalPages: number }> {
  const offset = (page - 1) * limit;

  const { rows, count } = await Email.findAndCountAll({
    where: {
      userId,
      status: { [Op.in]: ['sent', 'failed'] },
    },
    include: [{ model: Sender, as: 'sender', attributes: ['email'] }],
    order: [['sentAt', 'DESC']],
    limit,
    offset,
  });

  return {
    emails: rows,
    total: count,
    page,
    totalPages: Math.ceil(count / limit),
  };
}

/**
 * Get a single email by ID
 */
export async function getEmailById(
  emailId: string,
  userId: string
): Promise<any> {
  return Email.findOne({
    where: { id: emailId, userId },
    include: [{ model: Sender, as: 'sender', attributes: ['email'] }],
  });
}

/**
 * Recovery sweep on server startup
 * Finds scheduled emails that may have lost their BullMQ jobs and re-creates them
 */
export async function recoverOrphanedJobs(): Promise<number> {
  console.log('[Recovery] Checking for orphaned scheduled emails...');

  const orphanedEmails = await Email.findAll({
    where: {
      status: { [Op.in]: ['scheduled', 'queued'] },
      scheduledAt: { [Op.gt]: new Date() },
    },
  });

  let recovered = 0;

  for (const email of orphanedEmails) {
    try {
      // Check if BullMQ job still exists
      const existingJob = await emailQueue.getJob(email.bullmqJobId);

      if (!existingJob) {
        // Job is missing — re-create it
        const newJobId = `email-recover-${uuidv4()}`;
        await addEmailJob(
          email.id,
          email.senderId,
          email.userId,
          email.scheduledAt,
          newJobId
        );
        await email.update({ bullmqJobId: newJobId });
        recovered++;
        console.log(`[Recovery] Re-created job for email ${email.id}`);
      }
    } catch (error) {
      console.error(`[Recovery] Failed to check/recover email ${email.id}:`, error);
    }
  }

  console.log(`[Recovery] Done. Recovered ${recovered} orphaned jobs out of ${orphanedEmails.length} checked.`);
  return recovered;
}
