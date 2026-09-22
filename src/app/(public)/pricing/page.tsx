import { prisma } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2 } from 'lucide-react'
import { formatCurrency, approxUsd, planPeriodLabel, isLifetime } from '@/lib/utils'
import Link from 'next/link'
import type { Metadata } from 'next'

// Reads plans from the database, so it cannot be built ahead of time like
// the other public pages.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Pricing — CertMocks',
  description: 'Affordable subscription plans for CPMAI exam preparation. Start free, upgrade for full access.',
}

export default async function PricingPage() {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: [{ certificationId: 'asc' }, { sortOrder: 'asc' }],
    include: { certification: { select: { name: true } } },
  })

  return (
    <div className="py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">Simple, Transparent Pricing</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Start free. Upgrade when you&apos;re ready. Cancel anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <Card key={plan.id} className={`relative ${plan.isFeatured ? 'ring-2 ring-primary' : ''}`}>
              {plan.isFeatured && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-white px-4">Most Popular</Badge>
                </div>
              )}
              <CardContent className="p-6">
                <h2 className="font-bold text-xl">{plan.name}</h2>
                <Badge variant={plan.certificationId ? 'secondary' : 'success'} className="text-xs mt-1">
                  {plan.certification ? `${plan.certification.name} only` : 'All certifications'}
                </Badge>
                {plan.description && <p className="text-sm text-muted-foreground mt-2 mb-3">{plan.description}</p>}
                <div className="my-4">
                  <span className="text-4xl font-bold">{formatCurrency(plan.price, plan.currency)}</span>
                  <span className="text-muted-foreground text-sm ml-1">
                    {isLifetime(plan.durationDays) ? 'one-time, lifetime access' : `/ ${planPeriodLabel(plan.durationDays)}`}
                  </span>
                  {approxUsd(plan.price) && (
                    <p className="text-sm text-muted-foreground mt-1">
                      approx. {approxUsd(plan.price)} USD · billed in INR
                    </p>
                  )}
                </div>
                <ul className="space-y-2 mb-6">
                  {(plan.features as string[]).map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button className="w-full" variant={plan.isFeatured ? 'default' : 'outline'} asChild>
                  <Link href="/register">Get Started</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mt-16">
          <h2 className="text-2xl font-bold text-center mb-8">Pricing FAQ</h2>
          <div className="space-y-4">
            {[
              { q: 'Can I cancel anytime?', a: 'Yes. Cancel from your account settings. You keep access until the end of your billing period.' },
              { q: 'What payment methods are supported?', a: 'UPI, credit/debit cards, net banking (India), and international Visa/Mastercard.' },
              { q: 'Is there a refund policy?', a: 'Yes. See our Refund Policy page for details.' },
              { q: 'Are prices in INR only?', a: 'Plans show INR pricing. International cards are charged the equivalent in your card\'s currency.' },
            ].map((item) => (
              <div key={item.q} className="border rounded-lg p-4">
                <p className="font-semibold text-sm">{item.q}</p>
                <p className="text-sm text-muted-foreground mt-1">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
