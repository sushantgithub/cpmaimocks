import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdminSession } from '@/lib/require-auth'

export async function GET(req: Request) {
  await requireAdminSession()

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = 20
  const skip = (page - 1) * limit

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        plan: { select: { name: true } },
        subscription: { select: { id: true, status: true } },
      },
    }),
    prisma.payment.count(),
  ])

  return NextResponse.json({ payments, total, page, pages: Math.ceil(total / limit) })
}
