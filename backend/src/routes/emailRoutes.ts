import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import {
  scheduleEmailBatch,
  getScheduledEmails,
  getSentEmails,
  getEmailById,
} from '../services/emailService';
import { searchEmails } from '../services/elasticsearchService';

const router = Router();

// All email routes require authentication
router.use(authMiddleware);

/**
 * POST /api/emails/schedule
 * Schedule a batch of emails
 */
router.post('/schedule', async (req: AuthRequest, res: Response) => {
  try {
    const { subject, body, recipients, senderId, startTime, delayBetweenEmails, hourlyLimit } = req.body;

    // Validation
    if (!subject || !body || !recipients || !senderId || !startTime) {
      res.status(400).json({
        error: 'Missing required fields: subject, body, recipients, senderId, startTime',
      });
      return;
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      res.status(400).json({ error: 'Recipients must be a non-empty array of email addresses' });
      return;
    }

    const result = await scheduleEmailBatch({
      userId: req.user.id,
      senderId,
      subject,
      body,
      recipients,
      startTime,
      delayBetweenEmails: delayBetweenEmails || 2, // default 2 seconds
      hourlyLimit: hourlyLimit || 50,
    });

    res.status(201).json({
      message: `Successfully scheduled ${result.scheduled} emails (${result.skipped} skipped as duplicates)`,
      ...result,
    });
  } catch (error: any) {
    console.error('[EmailRoutes] Schedule error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/emails/scheduled
 * List scheduled emails for the authenticated user
 */
router.get('/scheduled', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await getScheduledEmails(req.user.id, page, limit);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/emails/sent
 * List sent emails for the authenticated user
 */
router.get('/sent', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await getSentEmails(req.user.id, page, limit);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/emails/search
 * Search emails via Elasticsearch
 */
router.get('/search', async (req: AuthRequest, res: Response) => {
  try {
    const query = (req.query.q as string) || '';
    const status = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await searchEmails(req.user.id, query, status, page, limit);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/emails/:id
 * Get a single email by ID
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const email = await getEmailById(req.params.id as string, req.user.id);

    if (!email) {
      res.status(404).json({ error: 'Email not found' });
      return;
    }

    res.json(email);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
