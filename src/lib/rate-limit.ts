import { subDays, subMinutes } from 'date-fns'
import { prisma } from '@/lib/db'

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000
const RETENTION_DAYS = 7
let lastCleanupAt = 0

export function clientIp(headers: Headers) {
  const forwarded = headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : headers.get('x-real-ip')
  return (ip ?? 'unknown').trim()
}

// Hits live in the analytics table so the limiter is shared across serverless
// instances, which an in-memory counter would not be.
function bucket(scope: string, key: string) {
  return `${scope}:${key}`.slice(0, 200)
}

async function maybeCleanupOldRateLimitEvents() {
  const now = Date.now()
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return
  lastCleanupAt = now

  try {
    await prisma.analyticsEvent.deleteMany({
      where: {
        event: 'RATE_LIMIT',
        createdAt: { lt: subDays(new Date(now), RETENTION_DAYS) },
      },
    })
  } catch (err) {
    // Cleanup must never make authentication or a protected action fail.
    console.error('[RateLimit] cleanup failed', err)
  }
}

export async function isRateLimited(
  scope: string,
  key: string,
  limit: number,
  windowMinutes: number,
) {
  // We only need to know whether the threshold was reached. COUNT(*) must
  // count every matching row; a limited lookup can stop as soon as the
  // threshold number of matching rows is found.
  const hits = await prisma.analyticsEvent.findMany({
    where: {
      event: 'RATE_LIMIT',
      ip: bucket(scope, key),
      createdAt: { gt: subMinutes(new Date(), windowMinutes) },
    },
    select: { id: true },
    take: limit,
  })
  return hits.length >= limit
}

export async function recordAttempt(scope: string, key: string) {
  await prisma.analyticsEvent.create({
    data: { event: 'RATE_LIMIT', ip: bucket(scope, key) },
  })
  await maybeCleanupOldRateLimitEvents()
}

/** Refuses once the window is full, otherwise counts this call. */
export async function throttle(scope: string, key: string, limit: number, windowMinutes: number) {
  if (await isRateLimited(scope, key, limit, windowMinutes)) return true
  await recordAttempt(scope, key)
  return false
}
