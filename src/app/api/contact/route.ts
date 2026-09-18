import { NextResponse } from 'next/server'
import { sendContactMessage } from '@/lib/email'
import { normalizeEmail, isValidEmail } from '@/lib/tokens'
import { clientIp, throttle } from '@/lib/rate-limit'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : ''
    const email = normalizeEmail(body.email)
    const subject = typeof body.subject === 'string' ? body.subject.trim().slice(0, 150) : ''
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 5000) : ''

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
    }

    if (await throttle('contact', clientIp(req.headers), 5, 60)) {
      return NextResponse.json({ error: 'Too many messages. Please try again later.' }, { status: 429 })
    }

    await sendContactMessage({ name, email, subject, message })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Contact]', err)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
