import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=invalid-token', req.url))
  }

  const verification = await prisma.emailVerification.findUnique({ where: { token } })

  if (!verification || verification.used || verification.expiresAt < new Date()) {
    return NextResponse.redirect(new URL('/login?error=expired-token', req.url))
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: verification.userId }, data: { emailVerified: new Date() } }),
    prisma.emailVerification.update({ where: { id: verification.id }, data: { used: true } }),
  ])

  return NextResponse.redirect(new URL('/login?verified=1', req.url))
}
