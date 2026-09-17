import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Terms of Service — CPMAI Prep' }

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      <div className="space-y-6 text-sm leading-relaxed">
        <section><h2 className="text-xl font-semibold mb-2">1. Acceptance</h2><p>By using CPMAI Prep you agree to these terms. If you do not agree, do not use the service.</p></section>
        <section><h2 className="text-xl font-semibold mb-2">2. Service Description</h2><p>CPMAI Prep is an independent exam preparation platform. It is not affiliated with, endorsed by, or connected to the Project Management Institute (PMI). PMI and CPMAI are registered trademarks of PMI.</p></section>
        <section><h2 className="text-xl font-semibold mb-2">3. Subscriptions</h2><p>Subscriptions are billed as described on the Pricing page. Access continues until the end of the billing period after cancellation.</p></section>
        <section><h2 className="text-xl font-semibold mb-2">4. Content</h2><p>All questions and content on this platform are the intellectual property of CPMAI Prep or its licensors. You may not copy, share, or redistribute exam content.</p></section>
        <section><h2 className="text-xl font-semibold mb-2">5. Accounts</h2><p>You are responsible for maintaining account security. Sharing account credentials is not permitted.</p></section>
        <section><h2 className="text-xl font-semibold mb-2">6. Contact</h2><p>Questions? Use the Contact page.</p></section>
      </div>
    </div>
  )
}
