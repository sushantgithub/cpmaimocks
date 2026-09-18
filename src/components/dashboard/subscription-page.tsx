'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from '@/hooks/use-toast'
import { formatDate, formatCurrency, approxUsd } from '@/lib/utils'
import { CheckCircle2, CreditCard } from 'lucide-react'

interface Plan {
  id: string; name: string; slug: string; description: string
  price: number; currency: string; durationDays: number
  features: string[]; isFeatured: boolean
}

interface Props {
  subscription: { planName: string; status: string; endDate: string } | null
  plans: Plan[]
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void }
  }
}

export function SubscriptionPage({ subscription, plans }: Props) {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [coupon, setCoupon] = useState('')
  const [discount, setDiscount] = useState<{ valid: boolean; amount: number; couponId: string } | null>(null)
  const [checkingCoupon, setCheckingCoupon] = useState(false)
  const [paying, setPaying] = useState(false)

  async function checkCoupon() {
    if (!selectedPlan || !coupon.trim()) return
    setCheckingCoupon(true)
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: coupon.trim(), planId: selectedPlan.id }),
      })
      const data = await res.json()
      if (!res.ok || !data.valid) throw new Error(data.error ?? 'Invalid coupon')
      setDiscount(data)
      toast({ title: 'Coupon applied!', variant: 'success' })
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Invalid coupon')
      toast({ title: error.message, variant: 'destructive' })
      setDiscount(null)
    } finally {
      setCheckingCoupon(false)
    }
  }

  async function handlePurchase() {
    if (!selectedPlan) return
    setPaying(true)
    try {
      const finalAmount = discount
        ? selectedPlan.price - discount.amount
        : selectedPlan.price

      // Create Razorpay order
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan.id,
          couponId: discount?.couponId,
          amount: finalAmount,
          currency: selectedPlan.currency,
        }),
      })
      const order = await res.json()
      if (!res.ok) throw new Error(order.error)

      // Load Razorpay script
      await loadRazorpayScript()

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: Math.round(finalAmount * 100),
        currency: selectedPlan.currency,
        order_id: order.orderId,
        name: 'CPMAI Prep',
        description: `${selectedPlan.name} Subscription`,
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          const verifyRes = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              signature: response.razorpay_signature,
              planId: selectedPlan.id,
              paymentDbId: order.paymentId,
            }),
          })
          const verifyData = await verifyRes.json()
          if (verifyData.success) {
            toast({ title: 'Subscription activated!', description: 'You now have full access.', variant: 'success' })
            window.location.reload()
          } else {
            toast({ title: 'Payment verification failed. Contact support.', variant: 'destructive' })
          }
        },
        prefill: { name: '', email: '' },
        theme: { color: '#1e40af' },
      })
      rzp.open()
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Payment failed')
      toast({ title: error.message, variant: 'destructive' })
    } finally {
      setPaying(false)
    }
  }

  function loadRazorpayScript(): Promise<void> {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve()
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve()
      document.head.appendChild(script)
    })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 md:pb-6">
      <div>
        <h1 className="text-2xl font-bold">Subscription</h1>
        <p className="text-muted-foreground text-sm mt-1">Unlock all CPMAI mock exams and practice tools.</p>
      </div>

      {/* Current subscription */}
      {subscription && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-800">Active: {subscription.planName}</p>
              <p className="text-sm text-green-700">Access until {formatDate(subscription.endDate)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plans */}
      <div className="grid md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isSelected = selectedPlan?.id === plan.id
          return (
            <Card
              key={plan.id}
              className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary border-primary' : 'hover:border-gray-300'} ${plan.isFeatured ? 'relative' : ''}`}
              onClick={() => setSelectedPlan(isSelected ? null : plan)}
            >
              {plan.isFeatured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-white text-xs px-3">Most Popular</Badge>
                </div>
              )}
              <CardContent className="p-5">
                <h3 className="font-bold text-lg">{plan.name}</h3>
                <div className="my-2">
                  <span className="text-3xl font-bold">{formatCurrency(plan.price, plan.currency)}</span>
                  <span className="text-muted-foreground text-sm"> / {Math.round(plan.durationDays / 30)} {plan.durationDays <= 31 ? 'month' : plan.durationDays <= 95 ? 'months' : 'year'}</span>
                </div>
                {plan.description && <p className="text-sm text-muted-foreground mb-3">{plan.description}</p>}
                <ul className="space-y-1.5">
                  {(plan.features as string[]).map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className={`mt-4 h-5 rounded-full border-2 ${isSelected ? 'border-primary bg-primary' : 'border-gray-300'} flex items-center justify-center`}>
                  {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Coupon + Pay */}
      {selectedPlan && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="font-semibold">Complete Purchase</h3>

            <div className="flex gap-2">
              <Input placeholder="Coupon code (optional)" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} className="uppercase" />
              <Button variant="outline" onClick={checkCoupon} loading={checkingCoupon}>Apply</Button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{selectedPlan.name}</span>
                <span>{formatCurrency(selectedPlan.price, selectedPlan.currency)}</span>
              </div>
              {discount && (
                <div className="flex justify-between text-green-700">
                  <span>Coupon discount</span>
                  <span>- {formatCurrency(discount.amount, selectedPlan.currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold border-t pt-2">
                <span>Total</span>
                <span>{formatCurrency(discount ? selectedPlan.price - discount.amount : selectedPlan.price, selectedPlan.currency)}</span>
              </div>
              {approxUsd(discount ? selectedPlan.price - discount.amount : selectedPlan.price) && (
                <p className="text-xs text-muted-foreground text-right">
                  approx. {approxUsd(discount ? selectedPlan.price - discount.amount : selectedPlan.price)} USD —
                  charged in INR, your bank sets the final rate
                </p>
              )}
            </div>

            <Button className="w-full" size="lg" onClick={handlePurchase} loading={paying}>
              <CreditCard className="h-4 w-4 mr-2" />
              Pay {formatCurrency(discount ? selectedPlan.price - discount.amount : selectedPlan.price, selectedPlan.currency)}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Secure payment via Razorpay. Supports UPI, cards, netbanking and international cards.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
