import type { Metadata } from 'next'
import { BookOpen, Target, ShieldCheck } from 'lucide-react'

export const metadata: Metadata = {
  title: 'About — CPMAI Prep',
  description: 'CPMAI Prep is an independent exam preparation platform for PMI CPMAI certification candidates.',
}

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-3">About CPMAI Prep</h1>
        <p className="text-muted-foreground leading-relaxed max-w-xl mx-auto">
          An independent platform to help professionals prepare for the PMI CPMAI certification with realistic mock exams and practice tools.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {[
          { icon: BookOpen, title: 'Realistic Exams', desc: '120-question mocks that match the actual CPMAI format.' },
          { icon: Target, title: 'Focused Practice', desc: 'Domain-wise practice to strengthen weak areas.' },
          { icon: ShieldCheck, title: 'Independent', desc: 'Not affiliated with PMI — an independent preparation resource.' },
        ].map((item) => (
          <div key={item.title} className="text-center p-6 rounded-xl border bg-white">
            <item.icon className="h-8 w-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-2">{item.title}</h3>
            <p className="text-sm text-muted-foreground">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="prose prose-gray max-w-none text-sm leading-relaxed space-y-4 bg-gray-50 rounded-xl p-6">
        <p className="font-semibold text-base">Disclaimer</p>
        <p>CPMAI Prep is an independent exam preparation website. It is not affiliated with, endorsed by, sponsored by, or connected to the Project Management Institute (PMI) in any way.</p>
        <p>PMI, CPMAI, and related certification names are registered trademarks of the Project Management Institute, Inc.</p>
        <p>All questions and content on this platform are independently authored for educational and exam preparation purposes only.</p>
      </div>
    </div>
  )
}
