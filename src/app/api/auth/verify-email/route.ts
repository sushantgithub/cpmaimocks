import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendWelcomeEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

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

  const [user] = await prisma.$transaction([
    prisma.user.update({ where: { id: verification.userId }, data: { emailVerified: new Date() } }),
    prisma.emailVerification.update({ where: { id: verification.id }, data: { used: true } }),
  ])

  try {
    await sendWelcomeEmail(user.email, user.name || 'there')
  } catch (err) {
    console.error('[VerifyEmail] welcome email failed', err)
  }

  return NextResponse.redirect(new URL('/login?verified=1', req.url))
}
