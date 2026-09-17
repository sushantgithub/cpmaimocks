import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, price, currency, durationDays, features, isActive, isFeatured } = await req.json()

  const plan = await prisma.subscriptionPlan.update({
    where: { id: params.id },
    data: { name, price, currency, durationDays, features, isActive, isFeatured },
  })

  return NextResponse.json(plan)
}
