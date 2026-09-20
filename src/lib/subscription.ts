import { prisma } from '@/lib/db'
import { isPremiumPlan } from '@/lib/subscription-plans'

export async function getUserActiveSubscription(userId: string) {
  const subscriptions = await getUserActiveSubscriptions(userId)
  return subscriptions[0] ?? null
}

export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const sub = await getUserActiveSubscription(userId)
  return !!sub
}

/** Every live subscription, since someone may hold one per certification. */
export async function getUserActiveSubscriptions(userId: string) {
  const subscriptions = await prisma.subscription.findMany({
    where: { userId, status: 'ACTIVE', endDate: { gt: new Date() } },
    include: { plan: true },
    orderBy: { endDate: 'desc' },
  })

  // Free access is baseline account access, not a paid entitlement. Ignore any
  // legacy ₹0 subscription rows so they can never unlock premium content.
  return subscriptions.filter((subscription) => isPremiumPlan(subscription.plan))
}

/**
 * A plan with no certification grants everything; otherwise it grants only
 * its own. This is the paywall, so it fails closed on anything unexpected.
 */
export async function hasAccessToCertification(
  userId: string,
  certificationId: string | null | undefined
): Promise<boolean> {
  if (!certificationId) return false

  const subscriptions = await getUserActiveSubscriptions(userId)
  return subscriptions.some(
    (sub) => sub.plan.certificationId === null || sub.plan.certificationId === certificationId
  )
}

/** Certifications the user can currently reach, for filtering listings. */
export async function getAccessibleCertificationIds(userId: string): Promise<string[] | 'ALL'> {
  const subscriptions = await getUserActiveSubscriptions(userId)
  if (subscriptions.some((sub) => sub.plan.certificationId === null)) return 'ALL'
  return subscriptions
    .map((sub) => sub.plan.certificationId)
    .filter((id): id is string => id !== null)
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
