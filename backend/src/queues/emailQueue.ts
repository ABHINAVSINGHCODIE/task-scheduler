import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';
import { env } from '../config/env';

export const QUEUE_NAME = 'email-send';

export interface EmailJobData {
  emailId: string;
  senderId: string;
  userId: string;
  attemptNumber?: number;
}

export const emailQueue = new Queue<EmailJobData>(QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      count: 1000,
    },
    removeOnFail: {
      count: 5000,
    },
  },
});

emailQueue.on('error', (error) => {
  console.error('[Queue] Error:', error.message);
});

// Patch Queue methods when running in REDIS_MOCK mode so Bull Board UI displays real-time metrics
if (process.env.REDIS_MOCK === 'true') {
  emailQueue.getJobCounts = async () => {
    try {
      const { Email } = await import('../models');
      const scheduled = await Email.count({ where: { status: 'scheduled' } });
      const sending = await Email.count({ where: { status: 'sending' } });
      const sent = await Email.count({ where: { status: 'sent' } });
      const failed = await Email.count({ where: { status: 'failed' } });

      return {
        waiting: 0,
        active: sending,
        completed: sent,
        failed,
        delayed: scheduled,
        paused: 0,
      } as any;
    } catch {
      return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, paused: 0 } as any;
    }
  };

  emailQueue.getJobs = async (types: any = ['active'], start = 0, end = 20) => {
    try {
      const { Email } = await import('../models');
      const statusMap: Record<string, string> = {
        active: 'sending',
        completed: 'sent',
        failed: 'failed',
        delayed: 'scheduled',
        waiting: 'scheduled',
      };
      const requestedTypes = Array.isArray(types) ? types : [types];
      const statuses = requestedTypes.map((t) => statusMap[t] || t);

      const emails = await Email.findAll({
        where: { status: statuses },
        limit: Math.max(1, end - start + 1),
        offset: start,
        order: [['createdAt', 'DESC']],
      });

      return emails.map((e: any) => ({
        id: e.bullmqJobId || e.id,
        name: 'send-email',
        data: {
          emailId: e.id,
          recipientEmail: e.recipientEmail,
          subject: e.subject,
          senderId: e.senderId,
        },
        timestamp: new Date(e.createdAt).getTime(),
        processedOn: e.sentAt ? new Date(e.sentAt).getTime() : Date.now(),
        finishedOn: e.sentAt ? new Date(e.sentAt).getTime() : undefined,
        opts: { attempts: 3, delay: 2000 },
        progress: e.status === 'sent' ? 100 : 0,
        failedReason: e.errorMessage || undefined,
        stacktrace: [],
        getState: async () => (e.status === 'sent' ? 'completed' : e.status === 'failed' ? 'failed' : 'delayed'),
        toJSON: () => ({
          id: e.bullmqJobId || e.id,
          name: 'send-email',
          data: { emailId: e.id, recipientEmail: e.recipientEmail, subject: e.subject },
          opts: { attempts: 3 },
          progress: e.status === 'sent' ? 100 : 0,
          delay: 0,
          timestamp: new Date(e.createdAt).getTime(),
          attemptsMade: 1,
          stacktrace: [],
          returnvalue: null,
        }),
      })) as any;
    } catch {
      return [] as any;
    }
  };

  emailQueue.getJob = async (jobId: string) => {
    try {
      const { Email } = await import('../models');
      const e = await Email.findOne({ where: { bullmqJobId: jobId } });
      if (!e) return undefined as any;
      return {
        id: e.bullmqJobId || e.id,
        name: 'send-email',
        data: { emailId: e.id, recipientEmail: e.recipientEmail, subject: e.subject },
        timestamp: new Date(e.createdAt).getTime(),
        opts: { attempts: 3 },
        progress: e.status === 'sent' ? 100 : 0,
        getState: async () => (e.status === 'sent' ? 'completed' : e.status === 'failed' ? 'failed' : 'delayed'),
      } as any;
    } catch {
      return undefined as any;
    }
  };

  emailQueue.getJobLogs = async () => ({ logs: [], count: 0 });
}

console.log(`[Queue] "${QUEUE_NAME}" initialized.`);

/**
 * Add a delayed email job to the queue
 * The delay is calculated as the difference between scheduledAt and now
 */
export async function addEmailJob(
  emailId: string,
  senderId: string,
  userId: string,
  scheduledAt: Date,
  jobId: string
): Promise<string> {
  const now = Date.now();
  const sendTime = new Date(scheduledAt).getTime();
  const delay = Math.max(0, sendTime - now);

  if (process.env.REDIS_MOCK === 'true') {
    // In local embedded dev mode, schedule execution via setTimeout
    setTimeout(async () => {
      try {
        const { processEmailJob } = await import('./emailWorker');
        await processEmailJob({
          id: jobId,
          data: { emailId, senderId, userId },
        });
      } catch (err: any) {
        console.error(`[DevQueue] Job ${jobId} failed:`, err.message);
      }
    }, delay);

    console.log(`[Queue] (Mock) Job ${jobId} scheduled in ${delay}ms`);
    return jobId;
  }

  const job = await emailQueue.add(
    'send-email',
    {
      emailId,
      senderId,
      userId,
    },
    {
      jobId,
      delay,
    }
  );

  console.log(`[Queue] Job ${job.id} added with delay ${delay}ms (sends at ${scheduledAt})`);
  return job.id || jobId;
}
