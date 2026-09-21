import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { SessionProvider } from '@/components/shared/session-provider'
import { Analytics } from '@vercel/analytics/react'

const inter = Inter({ subsets: ['latin'] })
const isStaging = process.env.NEXT_PUBLIC_APP_ENV === 'staging' || process.env.APP_ENV === 'staging'

export const metadata: Metadata = {
  title: {
    default: 'CertMocks — PMI CPMAI Mock Exams & Practice Tests',
    template: '%s | CertMocks',
  },
  description:
    'Prepare for the PMI CPMAI certification with realistic mock exams, practice questions, and detailed performance analytics. Independent exam preparation platform.',
  keywords: ['CPMAI', 'PMI CPMAI', 'CPMAI mock exam', 'CPMAI practice test', 'AI certification', 'CPMAI preparation'],
  openGraph: {
    title: 'CertMocks — PMI CPMAI Mock Exams',
    description: 'Realistic mock exams and practice questions for PMI CPMAI certification.',
    type: 'website',
  },
  robots: isStaging ? { index: false, follow: false } : { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {isStaging && (
          <div className="bg-amber-400 px-3 py-1.5 text-center text-xs font-bold text-amber-950">
            STAGING — Test environment. No production data or live payments.
          </div>
        )}
        <SessionProvider>
          {children}
          <Toaster />
          <Analytics />
        </SessionProvider>
      </body>
    </html>
  )
}
