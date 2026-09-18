import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getUserStats } from '@/lib/quiz'
import { getUserActiveSubscription } from '@/lib/subscription'
import { ProfileClient } from '@/components/dashboard/profile-client'
import { formatDate, accessUntilLabel } from '@/lib/utils'

export default async function ProfilePage() {
  const session = await auth()
  const userId = session!.user.id

  const [user, stats, subscription] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, image: true, createdAt: true } }),
    getUserStats(userId),
    getUserActiveSubscription(userId),
  ])

  return (
    <ProfileClient
      user={{ name: user?.name ?? '', email: user?.email ?? '', memberSince: formatDate(user?.createdAt!) }}
      stats={stats}
      subscription={subscription ? {
        planName: subscription.plan.name,
        status: subscription.status,
        access: accessUntilLabel(subscription.endDate!, subscription.plan.durationDays),
      } : null}
    />
  )
}
