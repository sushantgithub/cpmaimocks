import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const current = typeof body.current === 'string' ? body.current : ''
  const newPass = typeof body.newPass === 'string' ? body.newPass : ''
  if (newPass.length < 8) return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user?.passwordHash) return NextResponse.json({ error: 'Cannot change password for social login accounts' }, { status: 400 })

  const isValid = await bcrypt.compare(current, user.passwordHash)
  if (!isValid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })

  const passwordHash = await bcrypt.hash(newPass, 12)
  await prisma.user.update({ where: { id: session.user.id }, data: { passwordHash } })
  return NextResponse.json({ success: true })
}
