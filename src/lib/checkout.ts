import type { Coupon, SubscriptionPlan } from '@prisma/client'
import { addDays } from 'date-fns'
import { prisma } from '@/lib/db'
import { applyCoupon } from '@/lib/subscription'
import { sendPaymentConfirmationEmail } from '@/lib/email'
import { formatDate, isLifetime } from '@/lib/utils'

function toMoney(value: number) {
  return Math.round(value * 100) / 100
}

export function computeDiscount(
  coupon: Pick<Coupon, 'discountType' | 'discountValue'>,
  plan: Pick<SubscriptionPlan, 'price'>
) {
  const raw = coupon.discountType === 'PERCENTAGE'
    ? (plan.price * coupon.discountValue) / 100
    : coupon.discountValue
  return Math.min(Math.max(0, toMoney(raw)), plan.price)
}

export type OrderQuote =
  | { error: string }
  | { plan: SubscriptionPlan; coupon: Coupon | null; discount: number; amount: number }

// The price is always derived here, never taken from the browser.
export async function quoteOrder(userId: string, planId: string, couponId?: string): Promise<OrderQuote> {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } })
  if (!plan || !plan.isActive) return { error: 'Plan not found' }

  let coupon: Coupon | null = null
  let discount = 0
  if (couponId) {
    coupon = await prisma.coupon.findUnique({ where: { id: couponId } })
    if (!coupon) return { error: 'Invalid coupon code' }
    const result = await applyCoupon(coupon.code, planId, userId)
    if (!result.valid) return { error: result.error ?? 'Invalid coupon code' }
    discount = computeDiscount(coupon, plan)
  }

  return { plan, coupon, discount, amount: toMoney(plan.price - discount) }
}

export type FulfilmentOutcome =
  | { alreadyProcessed: true }
  | { alreadyProcessed: false; subscriptionId: string; endDate: Date }

/**
 * Turns a pending payment into an active subscription exactly once. The
 * browser's verify call and Razorpay's webhook can both arrive for the same
 * payment, in either order, so the pending row is claimed inside the
 * transaction and a second caller finds nothing to do.
 */
export async function fulfilPayment(
  paymentId: string,
  providerPaymentId: string,
  providerSignature?: string
): Promise<FulfilmentOutcome> {
  const outcome = await prisma.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({
      where: { id: paymentId, status: 'PENDING' },
      data: { status: 'SUCCESS', providerPaymentId, providerSignature },
    })
    if (claimed.count === 0) return null

    const payment = await tx.payment.findUniqueOrThrow({
      where: { id: paymentId },
      include: { plan: true, user: { select: { email: true, name: true } } },
    })
    if (!payment.plan) throw new Error(`Payment ${paymentId} has no plan`)

    const startDate = new Date()
    const subscription = await tx.subscription.create({
      data: {
        userId: payment.userId,
        planId: payment.plan.id,
        status: 'ACTIVE',
        startDate,
        endDate: addDays(startDate, payment.plan.durationDays),
        payments: { connect: { id: paymentId } },
      },
    })

    if (payment.couponId) {
      await tx.coupon.update({
        where: { id: payment.couponId },
        data: { currentRedemptions: { increment: 1 } },
      })
      await tx.couponRedemption.create({
        data: { couponId: payment.couponId, userId: payment.userId, paymentId },
      })
    }

    await tx.analyticsEvent.create({
      data: {
        event: 'PAYMENT_SUCCESS',
        userId: payment.userId,
        metadata: { paymentId, planId: payment.plan.id, amount: payment.amount, providerPaymentId },
      },
    })

    return { payment, subscription }
  })

  if (!outcome) return { alreadyProcessed: true }

  const { payment, subscription } = outcome
  try {
    await sendPaymentConfirmationEmail(
      payment.user.email,
      payment.user.name || 'there',
      payment.plan!.name,
      payment.amount,
      payment.currency,
      isLifetime(payment.plan!.durationDays) ? 'Lifetime' : formatDate(subscription.endDate!)
    )
  } catch (err) {
    console.error('[Checkout] confirmation email failed', paymentId, err)
  }

  return { alreadyProcessed: false, subscriptionId: subscription.id, endDate: subscription.endDate! }
}
