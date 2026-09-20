import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { isPremiumPlan } from '@/lib/subscription-plans'
import { ADMIN_TEST_ACCESS_MARKER, adminAccessEndDate } from '@/lib/admin-test-access'

const ADMIN_TEST_ACCESS = 'ADMIN_TEST_ACCESS'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const planId = typeof body.planId === 'string' ? body.planId : ''
  const days = Number(body.days)

  if (!planId || !Number.isInteger(days) || days < 1 || days > 3650) {
    return NextResponse.json({ error: 'Choose a premium plan and a duration between 1 and 3650 days' }, { status: 400 })
  }

  const [user, plan] = await Promise.all([
    prisma.user.findUnique({ where: { id: params.id }, select: { id: true, isActive: true } }),
    prisma.subscriptionPlan.findUnique({
      where: { id: planId },
      select: { id: true, slug: true, isActive: true },
    }),
  ])

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (!user.isActive) return NextResponse.json({ error: 'Activate this user before granting access' }, { status: 400 })
  if (!plan || !plan.isActive || !isPremiumPlan(plan)) {
    return NextResponse.json({ error: 'Select an active premium plan' }, { status: 400 })
  }

  const now = new Date()
  const endDate = adminAccessEndDate(now, days)
  if (!endDate) return NextResponse.json({ error: 'Invalid access duration' }, { status: 400 })

  // Replace only a previous admin-created grant for this same plan. Real paid
  // subscriptions and their payment records are deliberately untouched.
  await prisma.$transaction([
    prisma.subscription.updateMany({
      where: {
        userId: user.id,
        planId: plan.id,
        status: 'ACTIVE',
        cancellationReason: ADMIN_TEST_ACCESS_MARKER,
      },
      data: {
        status: 'CANCELLED',
        cancelledAt: now,
        cancellationReason: 'ADMIN_TEST_ACCESS_REPLACED',
      },
    }),
    prisma.subscription.create({
      data: {
        userId: user.id,
        planId: plan.id,
        status: 'ACTIVE',
        startDate: now,
        endDate,
        autoRenew: false,
        cancellationReason: ADMIN_TEST_ACCESS_MARKER,
      },
    }),
  ])

  return NextResponse.json({ success: true, endDate: endDate.toISOString() })
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const subscriptionId = new URL(req.url).searchParams.get('subscriptionId')
  if (!subscriptionId) {
    return NextResponse.json({ error: 'Missing test-access subscription' }, { status: 400 })
  }

  const result = await prisma.subscription.updateMany({
    where: {
      id: subscriptionId,
      userId: params.id,
      status: 'ACTIVE',
      cancellationReason: ADMIN_TEST_ACCESS_MARKER,
    },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancellationReason: 'ADMIN_TEST_ACCESS_REVOKED',
      autoRenew: false,
    },
  })

  if (result.count !== 1) {
    return NextResponse.json({ error: 'Active admin test access not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
