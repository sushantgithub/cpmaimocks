'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from '@/hooks/use-toast'
import { formatCurrency, approxUsd, planPeriodLabel, isLifetime, accessUntilLabel } from '@/lib/utils'
import { CheckCircle2, CreditCard } from 'lucide-react'

interface Plan {
  id: string; name: string; slug: string; description: string
  price: number; currency: string; durationDays: number
  features: string[]; isFeatured: boolean
  certificationId: string | null; certificationName: string | null
}

interface Certification { id: string; name: string; fullName: string | null }

interface Props {
  subscription: { planName: string; status: string; endDate: string; durationDays: number } | null
  plans: Plan[]
  certifications: Certification[]
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void }
  }
}

export function SubscriptionPage({ subscription, plans, certifications }: Props) {
  const [selectedCert, setSelectedCert] = useState<string>(certifications[0]?.id ?? '')
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [coupon, setCoupon] = useState('')
  const [discount, setDiscount] = useState<{ valid: boolean; amount: number; couponId: string } | null>(null)
  const [checkingCoupon, setCheckingCoupon] = useState(false)
  const [paying, setPaying] = useState(false)

  // An all-access plan is relevant whichever certification you picked
  const visiblePlans = plans.filter(
    (plan) => plan.certificationId === null || plan.certificationId === selectedCert
  )

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
      // The server prices the order; the browser only says what it wants
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selectedPlan.id, couponId: discount?.couponId }),
      })
      const order = await res.json()
      if (!res.ok) throw new Error(order.error)

      if (order.free) {
        toast({ title: 'Subscription activated!', description: 'You now have full access.', variant: 'success' })
        window.location.reload()
        return
      }

      // Load Razorpay script
      await loadRazorpayScript()

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: Math.round(order.amount * 100),
        currency: order.currency,
        order_id: order.orderId,
        name: 'CertMocks',
        description: `${selectedPlan.name} Subscription`,
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          const verifyRes = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              signature: response.razorpay_signature,
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
    return new Promise((resolve, reject) => {
      if (window.Razorpay) return resolve()

      const src = 'https://checkout.razorpay.com/v1/checkout.js'
      let script = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)
      const timeout = window.setTimeout(() => {
        cleanup()
        reject(new Error("Couldn't reach the payment provider. Disable any ad blocker for this site and try again."))
      }, 15000)

      const cleanup = () => {
        window.clearTimeout(timeout)
        if (script) {
          script.onload = null
          script.onerror = null
        }
      }

      const loaded = () => {
        cleanup()
        if (window.Razorpay) resolve()
        else reject(new Error("Payment provider didn't load correctly. Please try again."))
      }
      const failed = () => {
        cleanup()
        reject(new Error("Couldn't reach the payment provider. Disable any ad blocker for this site and try again."))
      }

      if (!script) {
        script = document.createElement('script')
        script.src = src
        document.head.appendChild(script)
      }
      script.onload = loaded
      script.onerror = failed

      // An existing tag may already have finished loading before handlers were attached.
      if (window.Razorpay) loaded()
    })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 md:pb-6">
      <div>
        <h1 className="text-2xl font-bold">Subscription</h1>
        <p className="text-muted-foreground text-sm mt-1">Unlock full mock exams and unlimited practice for your certification.</p>
      </div>

      {/* Current subscription */}
      {subscription && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-800">Active: {subscription.planName}</p>
              <p className="text-sm text-green-700">{accessUntilLabel(subscription.endDate, subscription.durationDays)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Which certification are you buying for */}
      {certifications.length > 1 && (
        <div>
          <h3 className="font-semibold mb-2">Which certification?</h3>
          <div className="flex gap-2 flex-wrap">
            {certifications.map((cert) => (
              <button
                key={cert.id}
                onClick={() => { setSelectedCert(cert.id); setSelectedPlan(null) }}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  selectedCert === cert.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                title={cert.fullName ?? undefined}
              >
                {cert.name}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Plans marked “All certifications” cover every exam on the site.
          </p>
        </div>
      )}

      {/* Plans — this certification's, plus anything covering everything */}
      <div className="grid md:grid-cols-3 gap-4">
        {visiblePlans.map((plan) => {
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
                  <span className="text-muted-foreground text-sm"> {isLifetime(plan.durationDays) ? 'one-time · lifetime access' : `/ ${planPeriodLabel(plan.durationDays)}`}</span>
                </div>
                <Badge variant={plan.certificationId ? 'secondary' : 'success'} className="text-xs mb-2">
                  {plan.certificationName ? `${plan.certificationName} only` : 'All certifications'}
                </Badge>
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
