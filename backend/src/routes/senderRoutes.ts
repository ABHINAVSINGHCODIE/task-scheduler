import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { Sender } from '../models';
import { generateEtherealAccount, clearTransporterCache } from '../services/smtpService';

const router = Router();

// All sender routes require authentication
router.use(authMiddleware);

/**
 * POST /api/senders
 * Create a new sender with custom SMTP credentials
 */
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { email, smtpHost, smtpPort, smtpUser, smtpPass } = req.body;

    if (!email || !smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      res.status(400).json({
        error: 'Missing required fields: email, smtpHost, smtpPort, smtpUser, smtpPass',
      });
      return;
    }

    const sender = await Sender.create({
      userId: req.user.id,
      email,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
    });

    res.status(201).json(sender);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/senders/generate
 * Auto-generate an Ethereal Email test account as a sender
 */
router.post('/generate', async (req: AuthRequest, res: Response) => {
  try {
    const etherealAccount = await generateEtherealAccount();

    const sender = await Sender.create({
      userId: req.user.id,
      email: etherealAccount.email,
      smtpHost: etherealAccount.smtpHost,
      smtpPort: etherealAccount.smtpPort,
      smtpUser: etherealAccount.smtpUser,
      smtpPass: etherealAccount.smtpPass,
    });

    res.status(201).json({
      message: 'Ethereal Email sender created successfully',
      sender,
      note: 'This is a test account. Emails can be viewed at https://ethereal.email',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/senders
 * List all senders for the authenticated user
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const senders = await Sender.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
    });

    res.json(senders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/senders/:id
 * Remove a sender
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const sender = await Sender.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!sender) {
      res.status(404).json({ error: 'Sender not found' });
      return;
    }

    clearTransporterCache(sender.id);
    await sender.destroy();

    res.json({ message: 'Sender deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
