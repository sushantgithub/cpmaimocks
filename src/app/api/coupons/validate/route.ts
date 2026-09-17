import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { applyCoupon } from '@/lib/subscription'
import { prisma } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { code, planId } = await req.json()
    const result = await applyCoupon(code, planId, session.user.id)

    if (!result.valid) return NextResponse.json({ valid: false, error: result.error }, { status: 400 })

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } })
    if (!plan) return NextResponse.json({ valid: false, error: 'Plan not found' }, { status: 404 })

    const coupon = result.coupon!
    const discountAmount = coupon.discountType === 'PERCENTAGE'
      ? (plan.price * coupon.discountValue) / 100
      : Math.min(coupon.discountValue, plan.price)

    return NextResponse.json({ valid: true, amount: discountAmount, couponId: coupon.id })
  } catch (err) {
    console.error('[ValidateCoupon]', err)
    return NextResponse.json({ error: 'Failed to validate coupon' }, { status: 500 })
  }
}
