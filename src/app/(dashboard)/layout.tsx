export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { requireActiveSession } from '@/lib/require-auth'
import { DashboardNav } from '@/components/layout/dashboard-nav'
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar'

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireActiveSession()

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav user={session.user} />
      <div className="flex">
        <DashboardSidebar />
        <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  )
}
