import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const data = await req.json()
  const user = await prisma.user.update({
    where: { id: params.id },
    data: { role: data.role, isActive: data.isActive },
    select: { id: true, role: true, isActive: true },
  })
  return NextResponse.json(user)
}
