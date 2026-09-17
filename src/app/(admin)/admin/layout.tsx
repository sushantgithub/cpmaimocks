export const dynamic = 'force-dynamic'

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { signOut } from '@/lib/auth'
import { BookOpen, LayoutDashboard, Users, HelpCircle, Trophy, CreditCard, Tag, BarChart3, Settings, LogOut, Upload } from 'lucide-react'

const adminNav = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Questions', href: '/admin/questions', icon: HelpCircle },
  { label: 'Import CSV', href: '/admin/questions/import', icon: Upload },
  { label: 'Exams', href: '/admin/exams', icon: Trophy },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
  { label: 'Coupons', href: '/admin/coupons', icon: Tag },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') redirect('/dashboard')

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col lg:flex-row">
      {/* Sidebar — top bar on mobile, vertical rail on desktop */}
      <aside className="w-full lg:w-56 bg-gray-900 text-white flex flex-col flex-shrink-0 lg:min-h-screen">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2 font-bold text-white">
            <BookOpen className="h-5 w-5 text-blue-400" />
            <div>
              <p className="text-sm">CPMAI Prep</p>
              <p className="text-xs text-gray-400">Admin Panel</p>
            </div>
          </Link>
          <form className="lg:hidden" action={async () => { 'use server'; await signOut({ redirectTo: '/' }) }}>
            <button type="submit" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white">
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </form>
        </div>
        <nav className="flex lg:flex-col flex-1 gap-1 p-3 overflow-x-auto lg:overflow-x-visible">
          {adminNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 lg:gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors whitespace-nowrap"
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden lg:block p-3 border-t border-gray-700">
          <form action={async () => { 'use server'; await signOut({ redirectTo: '/' }) }}>
            <button type="submit" className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white">
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-auto">
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  )
}
