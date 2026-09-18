import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : ''
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  await prisma.user.update({ where: { id: session.user.id }, data: { name } })
  return NextResponse.json({ success: true })
}
