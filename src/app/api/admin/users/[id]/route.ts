import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (params.id === session.user.id) {
    return NextResponse.json({ error: 'You cannot change your own role or status' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  const data: { role?: 'USER' | 'ADMIN'; isActive?: boolean } = {}
  if (body.role !== undefined) {
    if (body.role !== 'USER' && body.role !== 'ADMIN') return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    data.role = body.role
  }
  if (body.isActive !== undefined) {
    if (typeof body.isActive !== 'boolean') return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    data.isActive = body.isActive
  }
  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const user = await prisma.user.update({
    where: { id: params.id },
    data,
    select: { id: true, role: true, isActive: true },
  })
  return NextResponse.json(user)
}
