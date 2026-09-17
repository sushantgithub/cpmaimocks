import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Refund Policy — CPMAI Prep' }

export default function RefundPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Refund Policy</h1>
      <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      <div className="space-y-6 text-sm leading-relaxed">
        <section><h2 className="text-xl font-semibold mb-2">7-Day Refund</h2><p>If you are unsatisfied with your subscription, contact us within 7 days of purchase for a full refund. No questions asked.</p></section>
        <section><h2 className="text-xl font-semibold mb-2">How to Request</h2><p>Use the Contact page. Include your registered email and order details. Refunds are processed within 5–7 business days to the original payment method.</p></section>
        <section><h2 className="text-xl font-semibold mb-2">Exceptions</h2><p>Refunds are not available after 7 days of purchase. Coupon-discounted purchases are refunded at the amount paid.</p></section>
      </div>
    </div>
  )
}
