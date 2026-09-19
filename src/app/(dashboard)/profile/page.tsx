import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getUserStats } from '@/lib/quiz'
import { getUserActiveSubscriptions } from '@/lib/subscription'
import { ProfileClient } from '@/components/dashboard/profile-client'
import { formatDate, accessUntilLabel } from '@/lib/utils'

export default async function ProfilePage() {
  const session = await auth()
  const userId = session!.user.id

  const [user, stats, subscription] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, image: true, createdAt: true } }),
    getUserStats(userId),
    getUserActiveSubscriptions(userId),
  ])

  return (
    <ProfileClient
      user={{ name: user?.name ?? '', email: user?.email ?? '', memberSince: formatDate(user?.createdAt!) }}
      stats={stats}
      subscriptions={subscription.map((sub) => ({
        planName: sub.plan.name,
        status: sub.status,
        access: accessUntilLabel(sub.endDate!, sub.plan.durationDays),
      }))}
    />
  )
}
