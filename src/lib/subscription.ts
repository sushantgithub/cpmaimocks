import { prisma } from '@/lib/db'
import { addDays } from 'date-fns'

export async function getUserActiveSubscription(userId: string) {
  return prisma.subscription.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      endDate: { gt: new Date() },
    },
    include: { plan: true },
    orderBy: { endDate: 'desc' },
  })
}

export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const sub = await getUserActiveSubscription(userId)
  return !!sub
}

export async function activateSubscription(
  userId: string,
  planId: string,
  paymentId: string
) {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } })
  if (!plan) throw new Error('Plan not found')

  const startDate = new Date()
  const endDate = addDays(startDate, plan.durationDays)

  const subscription = await prisma.subscription.create({
    data: {
      userId,
      planId,
      status: 'ACTIVE',
      startDate,
      endDate,
    },
  })

  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      subscriptionId: subscription.id,
      status: 'SUCCESS',
    },
  })

  return subscription
}

export async function cancelSubscription(subscriptionId: string, reason?: string) {
  return prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancellationReason: reason,
      autoRenew: false,
    },
  })
}

export async function getExpiredSubscriptions() {
  return prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      endDate: { lt: new Date() },
    },
    include: { user: true, plan: true },
  })
}

export async function expireSubscriptions() {
  const expired = await getExpiredSubscriptions()
  for (const sub of expired) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'EXPIRED' },
    })
  }
  return expired.length
}

export async function applyCoupon(code: string, planId: string, userId: string) {
  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } })

  if (!coupon) return { valid: false, error: 'Invalid coupon code' }
  if (!coupon.isActive) return { valid: false, error: 'Coupon is no longer active' }
  if (coupon.expiresAt && coupon.expiresAt < new Date())
    return { valid: false, error: 'Coupon has expired' }
  if (coupon.maxRedemptions && coupon.currentRedemptions >= coupon.maxRedemptions)
    return { valid: false, error: 'Coupon usage limit reached' }
  if (coupon.applicablePlans.length > 0 && !coupon.applicablePlans.includes(planId))
    return { valid: false, error: 'Coupon not valid for this plan' }

  const alreadyUsed = await prisma.couponRedemption.findFirst({
    where: { couponId: coupon.id, userId },
  })
  if (alreadyUsed) return { valid: false, error: 'You have already used this coupon' }

  return { valid: true, coupon }
}
