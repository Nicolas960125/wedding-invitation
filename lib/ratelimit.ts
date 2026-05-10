import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let cachedRedis: Redis | null = null;

function getRedis(): Redis | null {
  if (cachedRedis) return cachedRedis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  cachedRedis = new Redis({ url, token });
  return cachedRedis;
}

type Window = `${number} ${'s' | 'm' | 'h' | 'd'}`;

function makeLimiter(prefix: string, requests: number, window: Window): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    prefix,
    analytics: false,
  });
}

// Limiters globales (singleton). Si Upstash no esta configurado retornan null
// y los callers deben tratar como fail-open (no bloquear UX).
export const inviteVisitLimiter = makeLimiter('rl:invite', 20, '1 m');
export const rsvpSubmitLimiter = makeLimiter('rl:rsvp', 5, '1 m');
export const adminLoginLimiter = makeLimiter('rl:admin-login', 10, '5 m');

export type LimitResult = {
  ok: boolean;
  remaining?: number;
  reset?: number;
  reason?: 'no-redis' | 'exceeded';
};

export async function checkLimit(
  limiter: Ratelimit | null,
  identifier: string,
): Promise<LimitResult> {
  if (!limiter) return { ok: true, reason: 'no-redis' };
  const { success, remaining, reset } = await limiter.limit(identifier);
  return {
    ok: success,
    remaining,
    reset,
    reason: success ? undefined : 'exceeded',
  };
}
