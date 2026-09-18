import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendPasswordResetEmail } from '@/lib/email'
import { generateToken, normalizeEmail } from '@/lib/tokens'
import { addHours } from 'date-fns'
import { clientIp, throttle } from '@/lib/rate-limit'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = normalizeEmail(body.email)
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })
    if (await throttle('forgot', clientIp(req.headers), 5, 15)) {
      return NextResponse.json({ error: 'Too many requests. Please try again in a few minutes.' }, { status: 429 })
    }

    const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })

    // Always return success to prevent email enumeration
    if (!user) return NextResponse.json({ success: true })

    const token = generateToken()
    await prisma.passwordReset.create({
      data: { userId: user.id, token, expiresAt: addHours(new Date(), 1) },
    })

    await sendPasswordResetEmail(user.email, user.name ?? 'User', token)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[ForgotPassword]', err)
    return NextResponse.json({ error: 'Failed to send reset email' }, { status: 500 })
  }
}
