import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { isPremiumPlan } from '@/lib/subscription-plans'

export async function GET(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = 20

  const where = search
    ? { OR: [{ email: { contains: search, mode: 'insensitive' as const } }, { name: { contains: search, mode: 'insensitive' as const } }] }
    : {}

  const [users, total, planRows] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        deletionRequested: true,
        emailVerified: true,
        passwordHash: true,
        accounts: { select: { provider: true } },
        createdAt: true,
        subscriptions: {
          where: { status: 'ACTIVE', endDate: { gt: new Date() } },
          select: {
            id: true,
            cancellationReason: true,
            plan: {
              select: {
                id: true,
                name: true,
                slug: true,
                durationDays: true,
                certification: { select: { name: true } },
              },
            },
            endDate: true,
          },
          orderBy: { endDate: 'desc' },
        },
        _count: { select: { examAttempts: true } },
        payments: {
          where: { status: 'SUCCESS' },
          select: { amount: true, currency: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
    prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        certification: { select: { name: true } },
      },
      orderBy: [{ certification: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    }),
  ])

  const rows = users.map(({ passwordHash, accounts, ...user }) => ({
    ...user,
    signInMethods: [
      ...(passwordHash ? ['password'] : []),
      ...accounts.map((a) => a.provider),
    ],
  }))

  const plans = planRows
    .filter(isPremiumPlan)
    .map(({ id, name, certification }) => ({
      id,
      name,
      certificationName: certification?.name ?? 'All certifications',
    }))

  return NextResponse.json({ users: rows, total, pages: Math.ceil(total / limit), plans })
}
