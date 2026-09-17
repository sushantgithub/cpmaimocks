export const dynamic = 'force-dynamic'

import { PublicNav } from '@/components/layout/public-nav'
import { PublicFooter } from '@/components/layout/public-footer'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNav />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  )
}
