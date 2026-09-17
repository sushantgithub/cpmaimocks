import { NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/payment'
import { prisma } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const signature = req.headers.get('x-razorpay-signature') ?? ''
    const body = await req.text()

    if (!verifyWebhookSignature(body, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const event = JSON.parse(body)
    const eventType = event.event as string

    if (eventType === 'payment.failed') {
      const paymentId = event.payload?.payment?.entity?.id
      if (paymentId) {
        await prisma.payment.updateMany({
          where: { providerPaymentId: paymentId },
          data: { status: 'FAILED', failureReason: event.payload?.payment?.entity?.error_description },
        })
      }
    }

    if (eventType === 'refund.processed') {
      const paymentId = event.payload?.refund?.entity?.payment_id
      if (paymentId) {
        await prisma.payment.updateMany({
          where: { providerPaymentId: paymentId },
          data: { status: 'REFUNDED', refundedAt: new Date() },
        })
      }
    }

    await prisma.analyticsEvent.create({
      data: { event: `WEBHOOK_${eventType.toUpperCase().replace('.', '_')}`, metadata: event },
    })

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[RazorpayWebhook]', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
