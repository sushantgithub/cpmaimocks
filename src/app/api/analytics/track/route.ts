import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ANALYTICS_EVENTS } from '@/lib/analytics-events'
import { clientIp, throttle } from '@/lib/rate-limit'

const ALLOWED_EVENTS = new Set<string>(Object.values(ANALYTICS_EVENTS))

// Only short string values are ever stored, so a visitor's browser cannot
// smuggle nested objects or unbounded text into the analytics table.
function sanitizedMetadata(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const entries = Object.entries(raw as Record<string, unknown>)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    .slice(0, 10)
    .map(([key, value]) => [key.slice(0, 60), value.slice(0, 120)] as const)
  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

// The only funnel event a visitor's browser reports directly — reaching the
// signup form happens before there is any account or session to hang a
// server-side call off, unlike the other five events.
export async function POST(req: Request) {
  try {
    if (await throttle('analytics-track', clientIp(req.headers), 30, 10)) {
      // Never surface a rate limit to a fire-and-forget beacon.
      return NextResponse.json({ ok: true })
    }

    const body = await req.json().catch(() => ({}))
    const event = typeof body.event === 'string' ? body.event : ''
    if (!ALLOWED_EVENTS.has(event)) {
      return NextResponse.json({ error: 'Unknown event' }, { status: 400 })
    }

    const metadata = sanitizedMetadata(body.metadata)
    await prisma.analyticsEvent.create({
      data: { event, ...(metadata ? { metadata } : {}) },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[AnalyticsTrack]', err)
    return NextResponse.json({ ok: true })
  }
}
