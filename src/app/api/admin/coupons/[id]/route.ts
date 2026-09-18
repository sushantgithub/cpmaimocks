import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const data: Record<string, unknown> = {}
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive
  if (typeof body.description === 'string') data.description = body.description.trim() || null
  if (body.discountType !== undefined) {
    if (!['PERCENTAGE', 'FIXED'].includes(body.discountType)) return NextResponse.json({ error: 'Invalid discount type' }, { status: 400 })
    data.discountType = body.discountType
  }
  if (body.discountValue !== undefined) {
    const value = Number(body.discountValue)
    if (!Number.isFinite(value) || value < 0) return NextResponse.json({ error: 'Discount must be zero or more' }, { status: 400 })
    data.discountValue = value
  }
  if (body.maxRedemptions !== undefined) {
    data.maxRedemptions = body.maxRedemptions === null || body.maxRedemptions === '' ? null : Math.max(0, parseInt(body.maxRedemptions) || 0)
  }
  if (body.expiresAt !== undefined) {
    const date = body.expiresAt ? new Date(body.expiresAt) : null
    if (date && Number.isNaN(date.getTime())) return NextResponse.json({ error: 'Invalid expiry date' }, { status: 400 })
    data.expiresAt = date
  }
  if (Array.isArray(body.applicablePlans)) data.applicablePlans = body.applicablePlans.filter((p: unknown): p is string => typeof p === 'string')
  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const coupon = await prisma.coupon.update({ where: { id: params.id }, data })
  return NextResponse.json(coupon)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.coupon.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
