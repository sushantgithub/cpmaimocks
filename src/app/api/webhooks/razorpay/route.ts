import { NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/payment'
import { prisma } from '@/lib/db'
import { fulfilPayment } from '@/lib/checkout'

interface PaymentEntity { id?: string; order_id?: string; error_description?: string }
interface RefundEntity { id?: string; payment_id?: string }

export async function POST(req: Request) {
  try {
    const signature = req.headers.get('x-razorpay-signature') ?? ''
    const body = await req.text()

    if (!verifyWebhookSignature(body, signature)) {
      console.warn('[RazorpayWebhook] rejected: bad signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    let event: { event?: unknown; payload?: { payment?: { entity?: PaymentEntity }; refund?: { entity?: RefundEntity } } }
    try {
      event = JSON.parse(body)
    } catch {
      return NextResponse.json({ error: 'Malformed body' }, { status: 400 })
    }
    const eventType = typeof event.event === 'string' ? event.event : 'unknown'
    const payment = event.payload?.payment?.entity
    const refund = event.payload?.refund?.entity
    let action = 'ignored'

    switch (eventType) {
      // Activate even if the browser never called verify, e.g. the tab closed mid-checkout
      case 'payment.captured':
      case 'order.paid': {
        if (payment?.id && payment.order_id) {
          const record = await prisma.payment.findFirst({ where: { providerOrderId: payment.order_id } })
          if (record) {
            const outcome = await fulfilPayment(record.id, payment.id)
            action = outcome.alreadyProcessed ? 'already-processed' : 'activated'
          } else {
            action = 'unknown-order'
          }
        }
        break
      }
      case 'payment.failed': {
        if (payment?.order_id) {
          const result = await prisma.payment.updateMany({
            where: { providerOrderId: payment.order_id, status: 'PENDING' },
            data: { status: 'FAILED', failureReason: payment.error_description ?? 'Payment failed' },
          })
          action = result.count > 0 ? 'marked-failed' : 'no-pending-payment'
        }
        break
      }
      case 'refund.processed': {
        if (refund?.payment_id) {
          const result = await prisma.payment.updateMany({
            where: { providerPaymentId: refund.payment_id },
            data: { status: 'REFUNDED', refundedAt: new Date() },
          })
          action = result.count > 0 ? 'marked-refunded' : 'unknown-payment'
        }
        break
      }
    }

    console.info('[RazorpayWebhook]', eventType, action, payment?.order_id ?? refund?.payment_id ?? '')
    await prisma.analyticsEvent.create({
      data: {
        event: `WEBHOOK_${eventType.toUpperCase().replace(/\./g, '_')}`,
        metadata: { action, paymentId: payment?.id ?? null, orderId: payment?.order_id ?? null, refundId: refund?.id ?? null },
      },
    })

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[RazorpayWebhook]', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
