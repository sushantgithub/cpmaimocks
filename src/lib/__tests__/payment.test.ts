import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import crypto from 'crypto'
import { hmacMatches, verifyPaymentSignature, verifyWebhookSignature } from '@/lib/payment'

function sign(secret: string, message: string) {
  return crypto.createHmac('sha256', secret).update(message).digest('hex')
}

describe('hmacMatches', () => {
  it('accepts the correct signature', () => {
    expect(hmacMatches('s3cret', 'order|payment', sign('s3cret', 'order|payment'))).toBe(true)
  })

  it('rejects a wrong signature of the right length', () => {
    const good = sign('s3cret', 'order|payment')
    const bad = good.slice(0, -1) + (good.endsWith('0') ? '1' : '0')
    expect(hmacMatches('s3cret', 'order|payment', bad)).toBe(false)
  })

  it('rejects a signature of the wrong length without throwing', () => {
    expect(hmacMatches('s3cret', 'order|payment', 'short')).toBe(false)
    expect(hmacMatches('s3cret', 'order|payment', '')).toBe(false)
  })
})

describe('signature verification', () => {
  const env = { ...process.env }
  beforeEach(() => {
    process.env.RAZORPAY_KEY_SECRET = 'key-secret'
    process.env.RAZORPAY_WEBHOOK_SECRET = 'hook-secret'
  })
  afterEach(() => {
    process.env = { ...env }
  })

  it('verifies a checkout signature over order|payment', () => {
    const sig = sign('key-secret', 'order_1|pay_1')
    expect(verifyPaymentSignature('order_1', 'pay_1', sig)).toBe(true)
    expect(verifyPaymentSignature('order_1', 'pay_2', sig)).toBe(false)
  })

  it('verifies a webhook signature over the raw body', () => {
    const body = '{"event":"payment.captured"}'
    expect(verifyWebhookSignature(body, sign('hook-secret', body))).toBe(true)
    expect(verifyWebhookSignature(body + ' ', sign('hook-secret', body))).toBe(false)
  })

  it('fails closed when the secret is not configured', () => {
    delete process.env.RAZORPAY_KEY_SECRET
    delete process.env.RAZORPAY_WEBHOOK_SECRET
    expect(verifyPaymentSignature('o', 'p', sign('', 'o|p'))).toBe(false)
    expect(verifyWebhookSignature('body', sign('', 'body'))).toBe(false)
  })
})
