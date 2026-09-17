import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy Policy — CPMAI Prep' }

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

      <div className="prose prose-gray max-w-none space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold mb-2">1. Information We Collect</h2>
          <p>We collect information you provide when registering (name, email), using the platform (exam attempts, scores), and making payments (processed securely by Razorpay — we never store card numbers or CVV).</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-2">2. How We Use Your Information</h2>
          <p>To provide the exam preparation service, send transactional emails, process payments, improve the platform, and communicate with you about your subscription.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-2">3. Data Security</h2>
          <p>We use industry-standard encryption and security practices. Passwords are hashed. Payment data is handled entirely by Razorpay and never stored on our servers.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-2">4. Your Rights</h2>
          <p>You may request access to, correction of, or deletion of your personal data by contacting us. Account deletion can be requested from your profile settings.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-2">5. Contact</h2>
          <p>For privacy-related queries, contact us through the Contact page.</p>
        </section>
      </div>
    </div>
  )
}
