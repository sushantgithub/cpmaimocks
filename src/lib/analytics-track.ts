import { track } from '@vercel/analytics/server'

type EventProperties = Record<string, string | number | boolean | null>

/**
 * Fire-and-forget: a funnel event must never fail the request it rides
 * along with, the way an outbound email failing must not fail signup.
 * Server-only — client components track through '@vercel/analytics/react'.
 */
export function trackEvent(event: string, properties?: EventProperties) {
  track(event, properties).catch((err) => {
    console.error('[Analytics] track failed', event, err)
  })
}
