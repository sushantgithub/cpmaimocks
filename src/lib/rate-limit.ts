import { subMinutes } from 'date-fns'
import { prisma } from '@/lib/db'

export function clientIp(headers: Headers) {
  const forwarded = headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : headers.get('x-real-ip')
  return (ip ?? 'unknown').trim()
}

// Hits live in the analytics table so the count is shared across serverless
// instances, which an in-memory counter would not be.
function bucket(scope: string, key: string) {
  return `${scope}:${key}`.slice(0, 200)
}

export async function isRateLimited(scope: string, key: string, limit: number, windowMinutes: number) {
  const hits = await prisma.analyticsEvent.count({
    where: { event: 'RATE_LIMIT', ip: bucket(scope, key), createdAt: { gt: subMinutes(new Date(), windowMinutes) } },
  })
  return hits >= limit
}

export async function recordAttempt(scope: string, key: string) {
  await prisma.analyticsEvent.create({ data: { event: 'RATE_LIMIT', ip: bucket(scope, key) } })
}

/** Refuses once the window is full, otherwise counts this call. */
export async function throttle(scope: string, key: string, limit: number, windowMinutes: number) {
  if (await isRateLimited(scope, key, limit, windowMinutes)) return true
  await recordAttempt(scope, key)
  return false
}
