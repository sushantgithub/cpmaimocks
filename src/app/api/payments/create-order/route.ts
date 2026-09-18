import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createPaymentOrder } from '@/lib/payment'
import { quoteOrder, fulfilPayment } from '@/lib/checkout'

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const planId = typeof body.planId === 'string' ? body.planId : ''
    const couponId = typeof body.couponId === 'string' && body.couponId ? body.couponId : undefined
    if (!planId) return NextResponse.json({ error: 'Plan required' }, { status: 400 })

    const quote = await quoteOrder(session.user.id, planId, couponId)
    if ('error' in quote) return NextResponse.json({ error: quote.error }, { status: 400 })

    const { plan, coupon, discount, amount } = quote

    if (amount <= 0) {
      // Nothing to charge, so there is no gateway round trip to wait for
      const payment = await prisma.payment.create({
        data: {
          userId: session.user.id,
          planId: plan.id,
          amount: 0,
          currency: plan.currency,
          couponId: coupon?.id ?? null,
          discountAmount: discount,
          provider: 'none',
          status: 'PENDING',
        },
      })
      await fulfilPayment(payment.id, `free_${payment.id}`)
      return NextResponse.json({ free: true })
    }

    const order = await createPaymentOrder({
      amount,
      currency: plan.currency,
      receipt: `rcpt_${Date.now()}`,
      notes: { userId: session.user.id, planId: plan.id },
    })

    const payment = await prisma.payment.create({
      data: {
        userId: session.user.id,
        planId: plan.id,
        amount,
        currency: plan.currency,
        providerOrderId: order.orderId,
        couponId: coupon?.id ?? null,
        discountAmount: discount,
        status: 'PENDING',
      },
    })

    return NextResponse.json({ ...order, paymentId: payment.id })
  } catch (err) {
    console.error('[CreateOrder]', err)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
