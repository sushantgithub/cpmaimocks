import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  CheckCircle2, Clock, BarChart3, BookMarked,
  Trophy, Users, Star, ArrowRight, Brain, Target,
  ShieldCheck, Smartphone
} from 'lucide-react'
import { PublicNav } from '@/components/layout/public-nav'
import { PublicFooter } from '@/components/layout/public-footer'
import { prisma } from '@/lib/db'
import { formatCurrency, planPeriodLabel, isLifetime } from '@/lib/utils'

// Counts and prices come from the database; refresh them hourly
export const revalidate = 3600

const features = [
  { icon: Brain, title: 'Realistic Mock Exams', desc: '120-question full-length exams matching the actual CPMAI format and difficulty.' },
  { icon: Clock, title: 'Timed Exam Experience', desc: 'Practice under real exam conditions with a built-in countdown timer.' },
  { icon: BarChart3, title: 'Performance Analytics', desc: 'Track your progress by domain, topic, and difficulty. Know exactly where to focus.' },
  { icon: BookMarked, title: 'Bookmark & Review', desc: 'Bookmark tricky questions and revisit them anytime in practice mode.' },
  { icon: Target, title: 'Practice Mode', desc: 'Drill by topic, difficulty, or review your previously incorrect answers.' },
  { icon: Smartphone, title: 'Mobile Friendly', desc: 'Study on any device — phone, tablet, or desktop. Optimised for touch.' },
]

const domains = [
  'AI Strategy & Planning', 'Data for AI', 'Machine Learning Fundamentals',
  'Responsible AI & Ethics', 'AI Governance', 'Risk Management',
  'Model Evaluation', 'AI Deployment', 'Monitoring & Maintenance', 'AI Project Management',
]

const faqs = [
  { q: 'Is this affiliated with PMI?', a: 'No. This is an independent exam preparation platform. PMI and CPMAI are trademarks of the Project Management Institute.' },
  { q: 'How many questions are in each mock exam?', a: 'Each full mock exam contains 120 questions with a 3-hour timer, mirroring the real CPMAI exam format.' },
  { q: 'Can I access on mobile?', a: 'Yes. The platform is designed mobile-first and works on Android, iPhone, tablets, and desktop.' },
  { q: 'Can I cancel my subscription?', a: 'Yes, you can cancel anytime from your account settings. Access continues until the end of your billing period.' },
]

// The page is also built where no database is reachable (CI), so a failed
// read degrades to generic copy rather than failing the build.
async function loadHomeData() {
  try {
    const [questionCount, examCount, domainCount, plans] = await Promise.all([
      prisma.question.count({ where: { status: 'PUBLISHED' } }),
      prisma.mockExam.count({ where: { status: 'PUBLISHED' } }),
      prisma.category.count(),
      prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        take: 3,
      }),
    ])
    return { questionCount, examCount, domainCount, plans }
  } catch (err) {
    console.error('[Home] could not load live data', err)
    return null
  }
}

export default async function HomePage() {
  const data = await loadHomeData()
  const plans = data?.plans ?? []

  const stats = data
    ? [
        { value: data.questionCount >= 100 ? `${Math.floor(data.questionCount / 50) * 50}+` : String(data.questionCount), label: 'Practice Questions' },
        { value: String(data.examCount), label: data.examCount === 1 ? 'Full Mock Exam' : 'Full Mock Exams' },
        { value: String(data.domainCount), label: 'CPMAI Domains' },
        { value: '24/7', label: 'Access' },
      ]
    : [
        { value: 'Timed', label: 'Full-length Mock Exams' },
        { value: 'Every', label: 'CPMAI Domain Covered' },
        { value: 'Detailed', label: 'Answer Explanations' },
        { value: '24/7', label: 'Access' },
      ]

  return (
    <div className="flex min-h-screen flex-col">
      <PublicNav />

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 text-white">
        <div className="container mx-auto px-4 py-20 md:py-28 text-center">
          <Badge className="mb-4 bg-blue-600 text-white border-blue-500">
            PMI CPMAI Exam Preparation
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 text-balance">
            Pass Your CPMAI Exam<br />
            <span className="text-blue-200">With Confidence</span>
          </h1>
          <p className="text-lg md:text-xl text-blue-100 max-w-2xl mx-auto mb-8 leading-relaxed">
            Realistic 120-question mock exams, domain-wise practice, and detailed explanations
            — everything you need to clear the PMI CPMAI certification.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="xl" className="bg-white text-blue-900 hover:bg-blue-50" asChild>
              <Link href="/register">
                Start Free Today <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button size="xl" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10 hover:text-white" asChild>
              <Link href="/exams">View Mock Exams</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-blue-200">Free plan available — no credit card required</p>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="text-3xl font-bold text-primary">{s.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Everything You Need to Pass</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A complete preparation system built around the real CPMAI exam structure.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <Card key={f.title} className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Exam Preview */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Realistic Exam Interface</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Our exam interface mirrors the actual CPMAI testing experience with a question
                navigation panel, mark-for-review, and auto-submit when time expires.
              </p>
              <ul className="space-y-3">
                {[
                  'Question navigation panel',
                  'Mark for review & return later',
                  'Countdown timer with auto-submit',
                  'Confirmation before final submit',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button className="mt-8" asChild>
                <Link href="/register">Try a Free Exam</Link>
              </Button>
            </div>

            {/* Mock exam preview card */}
            <div className="rounded-xl border bg-gray-50 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3 text-sm">
                <span className="font-medium">Question 24 of 120</span>
                <span className="font-mono text-red-600 font-semibold">02:34:18</span>
              </div>
              <div className="bg-white rounded-lg p-4 mb-3 text-sm leading-relaxed border">
                An AI project manager is reviewing a model that was deployed 6 months ago. The model's accuracy has dropped from 92% to 78%. Which phase of the AI lifecycle should the team initiate?
              </div>
              <div className="space-y-2">
                {[
                  { k: 'A', t: 'Redeploy the existing model without changes' },
                  { k: 'B', t: 'Initiate model retraining with recent data', selected: true },
                  { k: 'C', t: 'Shut down the model and start over' },
                  { k: 'D', t: 'Increase the training dataset size only' },
                ].map((opt) => (
                  <div
                    key={opt.k}
                    className={`flex items-start gap-3 rounded-lg border p-3 text-sm cursor-pointer ${opt.selected ? 'border-primary bg-blue-50' : 'bg-white'}`}
                  >
                    <span className={`font-semibold mt-0.5 flex-shrink-0 ${opt.selected ? 'text-primary' : ''}`}>{opt.k}.</span>
                    <span>{opt.t}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <button className="flex-1 rounded border py-2 text-xs text-muted-foreground">← Previous</button>
                <button className="rounded border px-3 py-2 text-xs text-muted-foreground">Mark</button>
                <button className="flex-1 rounded bg-primary text-white py-2 text-xs">Next →</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Domains */}
      <section className="py-16 bg-blue-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-3">All 10 CPMAI Domains Covered</h2>
          <p className="text-blue-200 mb-10">Questions across every domain with detailed explanations.</p>
          <div className="flex flex-wrap justify-center gap-3">
            {domains.map((d) => (
              <span key={d} className="rounded-full bg-blue-800 px-4 py-2 text-sm text-blue-100 border border-blue-700">
                {d}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      {plans.length > 0 && (
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-3">Simple, Affordable Pricing</h2>
          <p className="text-muted-foreground mb-10">Start free. Upgrade when ready.</p>
          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {plans.map((dbPlan) => ({
              name: dbPlan.name,
              price: formatCurrency(dbPlan.price, dbPlan.currency),
              period: isLifetime(dbPlan.durationDays) ? (dbPlan.price === 0 ? 'forever' : 'one-time, lifetime') : `/${planPeriodLabel(dbPlan.durationDays)}`,
              features: (dbPlan.features as string[]).slice(0, 5),
              cta: dbPlan.price === 0 ? 'Get Started' : dbPlan.isFeatured ? 'Most Popular' : `Start ${dbPlan.name}`,
              href: '/register',
              highlight: dbPlan.isFeatured,
            })).map((plan) => (
              <Card key={plan.name} className={`${plan.highlight ? 'border-primary ring-2 ring-primary' : ''}`}>
                <CardContent className="p-6">
                  {plan.highlight && <Badge className="mb-3">Most Popular</Badge>}
                  <h3 className="font-bold text-lg">{plan.name}</h3>
                  <div className="my-3">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                  </div>
                  <ul className="space-y-2 mb-6 text-sm text-left">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" variant={plan.highlight ? 'default' : 'outline'} asChild>
                    <Link href={plan.href}>{plan.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Prices shown in INR. International payments supported.
            <Link href="/pricing" className="text-primary ml-1 hover:underline">See full pricing →</Link>
          </p>
        </div>
      </section>
      )}

      {/* FAQ */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 max-w-2xl">
          <h2 className="text-3xl font-bold text-center mb-10">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <Card key={faq.q}>
                <CardContent className="p-5">
                  <h4 className="font-semibold mb-2">{faq.q}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/faq" className="text-primary text-sm hover:underline">View all FAQs →</Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary text-white text-center">
        <div className="container mx-auto px-4">
          <Trophy className="h-12 w-12 mx-auto mb-4 text-yellow-300" />
          <h2 className="text-3xl font-bold mb-3">Ready to Pass Your CPMAI?</h2>
          <p className="text-blue-100 mb-8 max-w-lg mx-auto">
            Realistic practice for the PMI CPMAI certification.
            Start with a free account today.
          </p>
          <Button size="xl" className="bg-white text-primary hover:bg-blue-50" asChild>
            <Link href="/register">Create Free Account</Link>
          </Button>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
