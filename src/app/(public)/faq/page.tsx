import type { Metadata } from 'next'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'FAQ — CPMAI Prep',
  description: 'Frequently asked questions about CPMAI Prep exam preparation platform.',
}

const faqs = [
  { category: 'About CPMAI', items: [
    { q: 'What is the PMI CPMAI certification?', a: 'CPMAI (Certified Professional in Managing AI) is a certification by the Project Management Institute for professionals who manage AI projects and initiatives.' },
    { q: 'Is CPMAI Prep affiliated with PMI?', a: 'No. CPMAI Prep is an independent exam preparation platform. PMI and CPMAI are registered trademarks of the Project Management Institute, Inc.' },
  ]},
  { category: 'Platform', items: [
    { q: 'How many questions are in each mock exam?', a: '120 questions per full mock exam, matching the actual CPMAI exam format with a 3-hour timer.' },
    { q: 'Can I use this on my phone?', a: 'Yes. The platform is designed mobile-first and works on Android, iPhone, tablets, and desktop browsers.' },
    { q: 'Are explanations provided?', a: 'Yes. Every question includes a detailed explanation of the correct answer, shown after you submit the exam.' },
  ]},
  { category: 'Subscriptions & Payments', items: [
    { q: 'What payment methods are accepted?', a: 'UPI, credit cards, debit cards, and net banking (India). International Visa and Mastercard are also supported.' },
    { q: 'Can I cancel anytime?', a: 'Yes. Cancel from your Account → Subscription page. Your access continues until the end of your billing period.' },
    { q: 'Is there a refund policy?', a: 'Yes. Contact us within 7 days of purchase for a full refund. See our Refund Policy page.' },
    { q: 'What is the free plan?', a: 'The free plan includes 20 sample questions and 1 mini mock exam — enough to try the platform before subscribing.' },
  ]},
  { category: 'Questions & Content', items: [
    { q: 'Where do the questions come from?', a: 'All questions are independently authored for exam preparation purposes. The content is not copied from any official PMI materials.' },
    { q: 'How often are questions updated?', a: 'We update and add questions periodically based on the latest CPMAI exam domains and feedback.' },
  ]},
]

export default function FAQPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-3xl font-bold text-center mb-2">Frequently Asked Questions</h1>
      <p className="text-muted-foreground text-center mb-12">Everything you need to know about CPMAI Prep.</p>

      <div className="space-y-8">
        {faqs.map((section) => (
          <div key={section.category}>
            <h2 className="text-lg font-bold mb-4 text-primary">{section.category}</h2>
            <div className="space-y-3">
              {section.items.map((item) => (
                <Card key={item.q}>
                  <CardContent className="p-4">
                    <p className="font-semibold text-sm mb-1.5">{item.q}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
