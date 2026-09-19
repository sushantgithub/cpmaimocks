import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PLAN_CURRENCIES, slugify } from '@/lib/utils'

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const plans = await prisma.subscriptionPlan.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      certification: { select: { id: true, name: true } },
      _count: { select: { subscriptions: true } },
    },
  })
  return NextResponse.json(plans)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const data = await req.json()
  const name = (data.name ?? '').trim()
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const price = Number(data.price)
  const durationDays = Number(data.durationDays)
  const currency = String(data.currency ?? 'INR').toUpperCase()
  if (!(PLAN_CURRENCIES as readonly string[]).includes(currency)) {
    return NextResponse.json({ error: `Currency must be one of ${PLAN_CURRENCIES.join(', ')}` }, { status: 400 })
  }
  if (!Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: 'Price must be zero or more' }, { status: 400 })
  }
  if (!Number.isFinite(durationDays) || durationDays < 1) {
    return NextResponse.json({ error: 'Duration must be at least 1 day' }, { status: 400 })
  }

  let slug = slugify(name)
  if (await prisma.subscriptionPlan.findUnique({ where: { slug } })) {
    slug = `${slug}-${Date.now().toString(36)}`
  }

  const count = await prisma.subscriptionPlan.count()
  const plan = await prisma.subscriptionPlan.create({
    data: {
      name,
      slug,
      description: data.description?.trim() || null,
      price,
      currency,
      durationDays,
      trialDays: Number(data.trialDays) || 0,
      features: Array.isArray(data.features) ? data.features : [],
      isActive: data.isActive ?? true,
      isFeatured: data.isFeatured ?? false,
      // Empty means the plan covers every certification
      certificationId: data.certificationId || null,
      sortOrder: count,
    },
  })
  return NextResponse.json(plan)
}
