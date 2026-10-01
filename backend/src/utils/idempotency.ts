import crypto from 'crypto';

/**
 * Generate a deterministic idempotency key for an email
 * Ensures the same email is never scheduled/sent twice
 */
export function generateIdempotencyKey(
  senderId: string,
  recipientEmail: string,
  subject: string,
  scheduledAt: string | Date
): string {
  const raw = `${senderId}:${recipientEmail}:${subject}:${new Date(scheduledAt).toISOString()}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Get the current hour window key for rate limiting
 * Returns a string like "2024-01-15T14" representing the current hour
 */
export function getHourWindow(date?: Date): string {
  const now = date || new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}T${String(now.getUTCHours()).padStart(2, '0')}`;
}

/**
 * Calculate milliseconds until the next hour window starts
 */
export function msUntilNextHourWindow(): number {
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setUTCHours(nextHour.getUTCHours() + 1, 0, 0, 0);
  return nextHour.getTime() - now.getTime();
}
