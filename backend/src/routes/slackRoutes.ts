import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { SlackIntegration } from '../models';
import { env } from '../config/env';

const router = Router();

/**
 * GET /api/slack/connect
 * Initiates Slack OAuth flow — redirects user to Slack's authorize page
 */
router.get('/connect', authMiddleware, (req: AuthRequest, res: Response) => {
  const state = req.user.id; // Pass userId as state for the callback

  const slackAuthUrl = new URL('https://slack.com/oauth/v2/authorize');
  slackAuthUrl.searchParams.set('client_id', env.SLACK_CLIENT_ID);
  slackAuthUrl.searchParams.set('scope', 'incoming-webhook,chat:write');
  slackAuthUrl.searchParams.set('redirect_uri', env.SLACK_REDIRECT_URI);
  slackAuthUrl.searchParams.set('state', state);

  res.json({ url: slackAuthUrl.toString() });
});

/**
 * GET /api/slack/callback
 * Slack OAuth callback — exchanges code for token and stores integration
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      res.redirect(`${env.FRONTEND_URL}/dashboard?slack=error&reason=missing_params`);
      return;
    }

    const userId = state as string;

    // Exchange code for access token
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.SLACK_CLIENT_ID,
        client_secret: env.SLACK_CLIENT_SECRET,
        code: code as string,
        redirect_uri: env.SLACK_REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json() as any;

    if (!tokenData.ok) {
      console.error('[Slack] OAuth error:', tokenData.error);
      res.redirect(`${env.FRONTEND_URL}/dashboard?slack=error&reason=${tokenData.error}`);
      return;
    }

    // Extract webhook info
    const webhookUrl = tokenData.incoming_webhook?.url || '';
    const teamName = tokenData.team?.name || '';
    const channelName = tokenData.incoming_webhook?.channel || '';
    const accessToken = tokenData.access_token || '';

    // Upsert: update if exists, create if not
    const [integration, created] = await SlackIntegration.findOrCreate({
      where: { userId },
      defaults: {
        userId,
        accessToken,
        webhookUrl,
        teamName,
        channelName,
        isActive: true,
      },
    });

    if (!created) {
      await integration.update({
        accessToken,
        webhookUrl,
        teamName,
        channelName,
        isActive: true,
      });
    }

    console.log(`[Slack] Integration ${created ? 'created' : 'updated'} for user ${userId}`);

    res.redirect(`${env.FRONTEND_URL}/dashboard?slack=connected`);
  } catch (error: any) {
    console.error('[Slack] Callback error:', error.message);
    res.redirect(`${env.FRONTEND_URL}/dashboard?slack=error&reason=server_error`);
  }
});

/**
 * GET /api/slack/status
 * Check if Slack is connected for the authenticated user
 */
router.get('/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const integration = await SlackIntegration.findOne({
      where: { userId: req.user.id, isActive: true },
    });

    res.json({
      connected: !!integration,
      teamName: integration?.teamName || null,
      channelName: integration?.channelName || null,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/slack/disconnect
 * Disconnect Slack integration
 */
router.post('/disconnect', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const integration = await SlackIntegration.findOne({
      where: { userId: req.user.id },
    });

    if (!integration) {
      res.status(404).json({ error: 'No Slack integration found' });
      return;
    }

    await integration.update({ isActive: false });

    res.json({ message: 'Slack disconnected successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
