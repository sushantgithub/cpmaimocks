import Razorpay from 'razorpay'
import crypto from 'crypto'

// Payment provider abstraction — swap Razorpay for another provider here
// without changing any other part of the application

let razorpay: Razorpay | null = null

function getRazorpay() {
  if (!razorpay) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID ?? '',
      key_secret: process.env.RAZORPAY_KEY_SECRET ?? '',
    })
  }
  return razorpay
}

export interface CreateOrderParams {
  amount: number        // in smallest currency unit (paise for INR)
  currency: string
  receipt: string
  notes?: Record<string, string>
}

export interface CreateOrderResult {
  orderId: string
  amount: number
  currency: string
  keyId: string
}

export async function createPaymentOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
  const rz = getRazorpay()
  const order = await rz.orders.create({
    amount: Math.round(params.amount * 100), // convert to paise
    currency: params.currency,
    receipt: params.receipt,
    notes: params.notes,
  })

  return {
    orderId: order.id,
    amount: params.amount,
    currency: params.currency,
    keyId: process.env.RAZORPAY_KEY_ID ?? '',
  }
}

export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!secret) return false
  return hmacMatches(secret, `${orderId}|${paymentId}`, signature)
}

export function verifyWebhookSignature(body: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) return false
  return hmacMatches(secret, body, signature)
}

export function hmacMatches(secret: string, message: string, signature: string) {
  const expected = crypto.createHmac('sha256', secret).update(message).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export async function fetchPaymentDetails(paymentId: string) {
  const rz = getRazorpay()
  return rz.payments.fetch(paymentId)
}

export async function initiateRefund(paymentId: string, amount?: number) {
  const rz = getRazorpay()
  return rz.payments.refund(paymentId, amount ? { amount: Math.round(amount * 100) } : {})
}
