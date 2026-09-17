import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { redemptions: true } } },
  })

  return NextResponse.json(coupons)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const data = await req.json()

  const exists = await prisma.coupon.findUnique({ where: { code: data.code.toUpperCase() } })
  if (exists) return NextResponse.json({ error: 'Coupon code already exists' }, { status: 400 })

  const coupon = await prisma.coupon.create({
    data: {
      code: data.code.toUpperCase(),
      description: data.description ?? null,
      discountType: data.discountType,
      discountValue: parseFloat(data.discountValue),
      maxRedemptions: data.maxRedemptions ? parseInt(data.maxRedemptions) : null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      isActive: true,
    },
  })

  return NextResponse.json(coupon)
}
