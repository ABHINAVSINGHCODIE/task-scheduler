import { redis } from '../config/redis';
import { env } from '../config/env';
import { getHourWindow, msUntilNextHourWindow } from '../utils/idempotency';

/**
 * Check and increment the per-sender hourly email count
 * Uses Redis INCR for atomic, distributed-safe counting
 * 
 * Returns:
 *   - allowed: true if the email can be sent
 *   - currentCount: the current count for this hour
 *   - limit: the configured limit
 */
export async function checkAndIncrementSenderRate(
  senderId: string
): Promise<{ allowed: boolean; currentCount: number; limit: number }> {
  const hourWindow = getHourWindow();
  const key = `ratelimit:sender:${senderId}:${hourWindow}`;
  const limit = env.MAX_EMAILS_PER_HOUR_PER_SENDER;

  // Atomic increment
  const currentCount = await redis.incr(key);

  // Set TTL on first increment (expire after 1 hour)
  if (currentCount === 1) {
    await redis.expire(key, 3600);
  }

  if (currentCount > limit) {
    // Roll back the increment since we won't actually send
    await redis.decr(key);
    return { allowed: false, currentCount: currentCount - 1, limit };
  }

  return { allowed: true, currentCount, limit };
}

/**
 * Check and increment the global hourly email count
 */
export async function checkAndIncrementGlobalRate(): Promise<{
  allowed: boolean;
  currentCount: number;
  limit: number;
}> {
  const hourWindow = getHourWindow();
  const key = `ratelimit:global:${hourWindow}`;
  const limit = env.MAX_EMAILS_PER_HOUR;

  const currentCount = await redis.incr(key);

  if (currentCount === 1) {
    await redis.expire(key, 3600);
  }

  if (currentCount > limit) {
    await redis.decr(key);
    return { allowed: false, currentCount: currentCount - 1, limit };
  }

  return { allowed: true, currentCount, limit };
}

/**
 * Get the current rate limit status for a sender
 */
export async function getSenderRateStatus(
  senderId: string
): Promise<{ currentCount: number; limit: number; remaining: number }> {
  const hourWindow = getHourWindow();
  const key = `ratelimit:sender:${senderId}:${hourWindow}`;
  const limit = env.MAX_EMAILS_PER_HOUR_PER_SENDER;

  const countStr = await redis.get(key);
  const currentCount = countStr ? parseInt(countStr, 10) : 0;

  return {
    currentCount,
    limit,
    remaining: Math.max(0, limit - currentCount),
  };
}

/**
 * Calculate the delay needed to reschedule a rate-limited job
 * Moves it to the beginning of the next hour window
 */
export function getRateLimitRescheduleDelay(): number {
  return msUntilNextHourWindow() + 1000; // +1s buffer
}
