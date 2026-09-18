import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { verifyPaymentSignature } from '@/lib/payment'
import { fulfilPayment } from '@/lib/checkout'

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { paymentId: providerPaymentId, orderId, signature, paymentDbId } = body
    if ([providerPaymentId, orderId, signature, paymentDbId].some((v) => typeof v !== 'string' || !v)) {
      return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 })
    }

    // Only the payer's own pending order, and only for the order it was created for
    const payment = await prisma.payment.findFirst({
      where: { id: paymentDbId, userId: session.user.id },
    })
    if (!payment) return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 })
    if (payment.providerOrderId !== orderId) {
      return NextResponse.json({ success: false, error: 'Order mismatch' }, { status: 400 })
    }

    if (!verifyPaymentSignature(orderId, providerPaymentId, signature)) {
      await prisma.payment.updateMany({
        where: { id: payment.id, status: 'PENDING' },
        data: { status: 'FAILED', failureReason: 'Invalid signature' },
      })
      console.warn('[VerifyPayment] invalid signature', { paymentId: payment.id, userId: session.user.id })
      return NextResponse.json({ success: false, error: 'Invalid payment signature' }, { status: 400 })
    }

    const outcome = await fulfilPayment(payment.id, providerPaymentId, signature)
    if (outcome.alreadyProcessed) {
      // The webhook may have got here first; report whatever state it left
      const current = await prisma.payment.findUnique({ where: { id: payment.id }, select: { status: true } })
      const success = current?.status === 'SUCCESS'
      return NextResponse.json(
        success ? { success } : { success, error: 'Payment was not successful' },
        { status: success ? 200 : 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[VerifyPayment]', err)
    return NextResponse.json({ success: false, error: 'Payment verification failed' }, { status: 500 })
  }
}
