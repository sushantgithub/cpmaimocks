import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createPaymentOrder } from '@/lib/payment'

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { planId, couponId, amount, currency } = await req.json()

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } })
    if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

    const order = await createPaymentOrder({
      amount,
      currency: currency || plan.currency,
      receipt: `rcpt_${Date.now()}`,
      notes: { userId: session.user.id, planId },
    })

    const payment = await prisma.payment.create({
      data: {
        userId: session.user.id,
        planId,
        amount,
        currency: currency || plan.currency,
        providerOrderId: order.orderId,
        couponId: couponId || null,
        discountAmount: plan.price - amount,
        status: 'PENDING',
      },
    })

    return NextResponse.json({ ...order, paymentId: payment.id })
  } catch (err) {
    console.error('[CreateOrder]', err)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
