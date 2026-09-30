import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdminSession } from '@/lib/require-auth'
import { cancelSubscription } from '@/lib/subscription'

interface Ctx {
  params: Promise<{ id: string }>
}

// Refunding used to leave the subscription it paid for still active. This
// fixes accounts refunded before that was corrected, and covers any future
// case where a payment is marked REFUNDED without going through the
// refund endpoint (a webhook, a manual DB fix, and so on).
export async function POST(_req: Request, ctx: Ctx) {
  await requireAdminSession()
  const { id } = await ctx.params

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { subscription: { select: { id: true, status: true } } },
  })
  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
  if (payment.status !== 'REFUNDED') {
    return NextResponse.json({ error: "Only a refunded payment's access can be revoked here" }, { status: 400 })
  }
  if (!payment.subscription) {
    return NextResponse.json({ error: 'This payment has no subscription attached' }, { status: 400 })
  }
  if (payment.subscription.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Access was already revoked' }, { status: 400 })
  }

  const updated = await cancelSubscription(payment.subscription.id, 'Payment refunded — access manually revoked')
  return NextResponse.json(updated)
}
