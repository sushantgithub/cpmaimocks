import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdminSession } from '@/lib/require-auth'
import { initiateRefund } from '@/lib/payment'
import { cancelSubscription } from '@/lib/subscription'

interface Ctx {
  params: Promise<{ id: string }>
}

export async function POST(req: Request, ctx: Ctx) {
  await requireAdminSession()
  const { id } = await ctx.params

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { subscription: { select: { id: true, status: true } } },
  })
  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
  if (payment.status === 'REFUNDED') return NextResponse.json({ error: 'Already refunded' }, { status: 400 })
  if (payment.status !== 'SUCCESS') return NextResponse.json({ error: 'Only successful payments can be refunded' }, { status: 400 })
  if (!payment.providerPaymentId) return NextResponse.json({ error: 'No Razorpay payment ID on record' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const refundAmount = body.amount ? Number(body.amount) : undefined

  await initiateRefund(payment.providerPaymentId, refundAmount)

  const updated = await prisma.payment.update({
    where: { id },
    data: {
      status: 'REFUNDED',
      refundedAt: new Date(),
      refundAmount: refundAmount ?? payment.amount,
    },
  })

  // A refund must not leave the access it paid for still active.
  if (payment.subscription?.status === 'ACTIVE') {
    await cancelSubscription(payment.subscription.id, 'Payment refunded')
  }

  return NextResponse.json(updated)
}
