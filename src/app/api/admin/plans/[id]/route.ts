import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PLAN_CURRENCIES } from '@/lib/utils'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const data = await req.json()
  const update: Record<string, unknown> = {}

  if (typeof data.name === 'string' && data.name.trim()) update.name = data.name.trim()
  if (typeof data.description === 'string') update.description = data.description.trim() || null
  if (typeof data.isActive === 'boolean') update.isActive = data.isActive
  if (typeof data.isFeatured === 'boolean') update.isFeatured = data.isFeatured
  if (Array.isArray(data.features)) update.features = data.features
  if (typeof data.sortOrder === 'number') update.sortOrder = data.sortOrder

  if (data.price !== undefined) {
    const price = Number(data.price)
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: 'Price must be zero or more' }, { status: 400 })
    }
    update.price = price
  }

  if (data.durationDays !== undefined) {
    const durationDays = Number(data.durationDays)
    if (!Number.isFinite(durationDays) || durationDays < 1) {
      return NextResponse.json({ error: 'Duration must be at least 1 day' }, { status: 400 })
    }
    update.durationDays = durationDays
  }

  // Razorpay settles in the account's own currency, so this is a display
  // choice rather than a payment one — but a typo here misprices the page.
  if (data.currency !== undefined) {
    const currency = String(data.currency).toUpperCase()
    if (!(PLAN_CURRENCIES as readonly string[]).includes(currency)) {
      return NextResponse.json({ error: `Currency must be one of ${PLAN_CURRENCIES.join(', ')}` }, { status: 400 })
    }
    update.currency = currency
  }

  if (data.trialDays !== undefined) update.trialDays = Number(data.trialDays) || 0
  // '' or null means all-access
  if (data.certificationId !== undefined) update.certificationId = data.certificationId || null

  const plan = await prisma.subscriptionPlan.update({ where: { id: params.id }, data: update })
  return NextResponse.json(plan)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const subscriptions = await prisma.subscription.count({ where: { planId: params.id } })
  if (subscriptions > 0) {
    return NextResponse.json(
      { error: `${subscriptions} subscription(s) reference this plan. Deactivate it instead — it will disappear from pricing while existing subscribers keep their access.` },
      { status: 409 }
    )
  }

  await prisma.subscriptionPlan.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
