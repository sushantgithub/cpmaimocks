import { NextResponse } from 'next/server'
import { addHours, subMinutes } from 'date-fns'
import { prisma } from '@/lib/db'
import { sendVerificationEmail } from '@/lib/email'
import { generateToken, normalizeEmail } from '@/lib/tokens'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = normalizeEmail(body.email)
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    // Always answer success so the form cannot be used to probe for accounts
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    })
    if (!user || !user.passwordHash || user.emailVerified) {
      return NextResponse.json({ success: true })
    }

    const recent = await prisma.emailVerification.findFirst({
      where: { userId: user.id, createdAt: { gt: subMinutes(new Date(), 2) } },
      select: { id: true },
    })
    if (recent) return NextResponse.json({ success: true })

    const token = generateToken()
    await prisma.emailVerification.create({
      data: { userId: user.id, token, expiresAt: addHours(new Date(), 24) },
    })
    await sendVerificationEmail(user.email, user.name ?? 'there', token)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[ResendVerification]', err)
    return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 })
  }
}
