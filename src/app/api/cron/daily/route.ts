import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { expireSubscriptions } from '@/lib/subscription'
import { sendSubscriptionExpiryReminder } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const DAY_MS = 24 * 60 * 60 * 1000

// Each bucket is a window rather than a single day so a missed run still
// sends the reminder on the next one. Sends are recorded per bucket.
const REMINDER_BUCKETS = [
  { bucket: '7', minDays: 5, maxDays: 7 },
  { bucket: '1', minDays: 1, maxDays: 2 },
]

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const expired = await expireSubscriptions()
  const reminders = await sendExpiryReminders()

  return NextResponse.json({ expired, ...reminders })
}

async function sendExpiryReminders() {
  const now = Date.now()
  const maxWindow = Math.max(...REMINDER_BUCKETS.map((b) => b.maxDays))

  const ending = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      endDate: { gt: new Date(now), lte: new Date(now + maxWindow * DAY_MS) },
      user: { isActive: true, deletionRequested: false },
    },
    include: { user: { select: { id: true, email: true, name: true } } },
  })

  let sent = 0
  let skipped = 0
  const failures: string[] = []

  for (const sub of ending) {
    const daysLeft = Math.ceil((sub.endDate!.getTime() - now) / DAY_MS)
    const window = REMINDER_BUCKETS.find((b) => daysLeft >= b.minDays && daysLeft <= b.maxDays)
    if (!window) { skipped++; continue }

    const renewed = await prisma.subscription.findFirst({
      where: { userId: sub.userId, status: 'ACTIVE', endDate: { gt: sub.endDate! }, id: { not: sub.id } },
      select: { id: true },
    })
    if (renewed) { skipped++; continue }

    const alreadySent = await prisma.analyticsEvent.findFirst({
      where: {
        event: 'SUBSCRIPTION_REMINDER_SENT',
        userId: sub.userId,
        metadata: { path: ['subscriptionId'], equals: sub.id },
        AND: { metadata: { path: ['bucket'], equals: window.bucket } },
      },
      select: { id: true },
    })
    if (alreadySent) { skipped++; continue }

    try {
      await sendSubscriptionExpiryReminder(sub.user.email, sub.user.name || 'there', daysLeft)
      await prisma.analyticsEvent.create({
        data: {
          event: 'SUBSCRIPTION_REMINDER_SENT',
          userId: sub.userId,
          metadata: { subscriptionId: sub.id, bucket: window.bucket, daysLeft },
        },
      })
      sent++
    } catch (err) {
      console.error('[Cron] expiry reminder failed', sub.id, err)
      failures.push(sub.id)
    }
  }

  return { candidates: ending.length, sent, skipped, failures }
}
