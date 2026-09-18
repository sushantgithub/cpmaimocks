import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getUserActiveSubscription } from '@/lib/subscription'
import { SubscriptionPage } from '@/components/dashboard/subscription-page'

export default async function SubscriptionRoute() {
  const session = await auth()
  const userId = session!.user.id

  const [subscription, plans, certifications] = await Promise.all([
    getUserActiveSubscription(userId),
    prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { certification: { select: { id: true, name: true } } },
    }),
    prisma.certification.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, fullName: true },
    }),
  ])

  return (
    <SubscriptionPage
      subscription={subscription ? {
        planName: subscription.plan.name,
        status: subscription.status,
        endDate: subscription.endDate!.toISOString(),
        durationDays: subscription.plan.durationDays,
      } : null}
      plans={plans.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description ?? '',
        price: p.price,
        currency: p.currency,
        durationDays: p.durationDays,
        features: p.features as string[],
        isFeatured: p.isFeatured,
        certificationId: p.certificationId,
        certificationName: p.certification?.name ?? null,
      }))}
      certifications={certifications}
    />
  )
}
