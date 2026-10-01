import { SlackIntegration } from '../models';

/**
 * Send a Slack notification when a sender's hourly rate limit is reached
 * Uses the stored webhook URL from Slack OAuth
 * If no Slack integration exists for the user, silently does nothing (no crash)
 */
export async function notifyRateLimitReached(
  userId: string,
  senderEmail: string,
  currentCount: number,
  limit: number
): Promise<void> {
  try {
    const integration = await SlackIntegration.findOne({
      where: { userId, isActive: true },
    });

    if (!integration) {
      // No Slack connected — silently skip, no crash
      console.log(`[Slack] No active integration for user ${userId}. Skipping notification.`);
      return;
    }

    const message = {
      text: `⚠️ *Rate Limit Reached*`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '⚠️ Email Rate Limit Reached',
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Sender:*\n${senderEmail}`,
            },
            {
              type: 'mrkdwn',
              text: `*Hourly Limit:*\n${limit} emails/hour`,
            },
            {
              type: 'mrkdwn',
              text: `*Emails Sent This Hour:*\n${currentCount}`,
            },
            {
              type: 'mrkdwn',
              text: `*Time:*\n${new Date().toISOString()}`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'Remaining emails have been *rescheduled* to the next available hour window. No emails were dropped.',
          },
        },
      ],
    };

    const response = await fetch(integration.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error(`[Slack] Webhook failed with status ${response.status}`);
    } else {
      console.log(`[Slack] Rate limit notification sent for sender ${senderEmail}`);
    }
  } catch (error) {
    // Never crash the worker due to Slack notification failure
    console.error('[Slack] Failed to send notification:', error);
  }
}

/**
 * Send a generic Slack message to a user's connected workspace
 */
export async function sendSlackMessage(
  userId: string,
  text: string
): Promise<boolean> {
  try {
    const integration = await SlackIntegration.findOne({
      where: { userId, isActive: true },
    });

    if (!integration) return false;

    const response = await fetch(integration.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    return response.ok;
  } catch (error) {
    console.error('[Slack] Failed to send message:', error);
    return false;
  }
}
