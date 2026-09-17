import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { verifyPaymentSignature } from '@/lib/payment'
import { activateSubscription } from '@/lib/subscription'
import { sendPaymentConfirmationEmail } from '@/lib/email'
import { prisma } from '@/lib/db'
import { formatDate } from '@/lib/utils'

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { paymentId: providerPaymentId, orderId, signature, planId, paymentDbId } = await req.json()

    const isValid = verifyPaymentSignature(orderId, providerPaymentId, signature)
    if (!isValid) {
      await prisma.payment.update({
        where: { id: paymentDbId },
        data: { status: 'FAILED', failureReason: 'Invalid signature' },
      })
      return NextResponse.json({ success: false, error: 'Invalid payment signature' }, { status: 400 })
    }

    await prisma.payment.update({
      where: { id: paymentDbId },
      data: { providerPaymentId, providerSignature: signature },
    })

    const subscription = await activateSubscription(session.user.id, planId, paymentDbId)

    // Increment coupon redemptions if applicable
    const payment = await prisma.payment.findUnique({ where: { id: paymentDbId } })
    if (payment?.couponId) {
      await prisma.coupon.update({
        where: { id: payment.couponId },
        data: { currentRedemptions: { increment: 1 } },
      })
      await prisma.couponRedemption.create({
        data: { couponId: payment.couponId, userId: session.user.id, paymentId: paymentDbId },
      })
    }

    // Send confirmation email
    try {
      const user = await prisma.user.findUnique({ where: { id: session.user.id } })
      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } })
      if (user && plan && subscription.endDate) {
        await sendPaymentConfirmationEmail(
          user.email, user.name ?? 'User', plan.name,
          payment?.amount ?? 0, payment?.currency ?? 'INR',
          formatDate(subscription.endDate)
        )
      }
    } catch { /* email failure doesn't fail payment */ }

    await prisma.analyticsEvent.create({
      data: { event: 'PAYMENT_SUCCESS', userId: session.user.id, metadata: { planId, amount: payment?.amount } },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[VerifyPayment]', err)
    return NextResponse.json({ success: false, error: 'Payment verification failed' }, { status: 500 })
  }
}
