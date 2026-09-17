import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendPasswordResetEmail } from '@/lib/email'
import { generateToken } from '@/lib/utils'
import { addHours } from 'date-fns'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { email } })

    // Always return success to prevent email enumeration
    if (!user) return NextResponse.json({ success: true })

    const token = generateToken()
    await prisma.passwordReset.create({
      data: { userId: user.id, token, expiresAt: addHours(new Date(), 1) },
    })

    await sendPasswordResetEmail(email, user.name ?? 'User', token)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[ForgotPassword]', err)
    return NextResponse.json({ error: 'Failed to send reset email' }, { status: 500 })
  }
}
