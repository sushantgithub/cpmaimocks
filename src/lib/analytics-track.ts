import { subDays } from 'date-fns'
import { track } from '@vercel/analytics/server'
import { prisma } from '@/lib/db'
import { ANALYTICS_EVENTS } from '@/lib/analytics-events'

type EventProperties = Record<string, string | number | boolean | null>

const FUNNEL_EVENT_NAMES = Object.values(ANALYTICS_EVENTS)
const RETENTION_DAYS = 180
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000
let lastCleanupAt = 0

// Same opportunistic pattern as the rate limiter's own cleanup: at most once
// an hour, so a funnel event never pays for a DELETE on every write, but the
// table still doesn't grow forever from page-view-shaped events with no
// natural row limit the way a per-user record would have.
async function maybeCleanupOldFunnelEvents() {
  const now = Date.now()
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return
  lastCleanupAt = now
  try {
    await prisma.analyticsEvent.deleteMany({
      where: {
        event: { in: FUNNEL_EVENT_NAMES },
        createdAt: { lt: subDays(new Date(now), RETENTION_DAYS) },
      },
    })
  } catch (err) {
    console.error('[Analytics] funnel event cleanup failed', err)
  }
}

/**
 * Records a funnel event twice: to Vercel Analytics (only visible on a
 * Vercel plan with custom Events) and to this app's own AnalyticsEvent
 * table, which the admin Analytics page reads from — so the funnel is
 * visible today regardless of Vercel plan. Never throws: a tracking
 * failure must not fail the page load, signup, or purchase it rides with.
 * Server-only — the client register page tracks through
 * '@vercel/analytics/react' and POSTs to /api/analytics/track instead.
 */
export function trackEvent(
  event: string,
  properties?: EventProperties,
  context?: { userId?: string },
) {
  track(event, properties).catch((err) => {
    console.error('[Analytics] Vercel track failed', event, err)
  })

  prisma.analyticsEvent
    .create({
      data: {
        event,
        ...(context?.userId ? { userId: context.userId } : {}),
        ...(properties ? { metadata: properties } : {}),
      },
    })
    .then(() => maybeCleanupOldFunnelEvents())
    .catch((err) => {
      console.error('[Analytics] event record failed', event, err)
    })
}
