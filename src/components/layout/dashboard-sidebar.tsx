'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, PenSquare, Bookmark, User, CreditCard, Trophy, ListChecks
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Quizzes', href: '/quizzes', icon: ListChecks },
  { label: 'Mock Exams', href: '/exams', icon: Trophy },
  { label: 'Practice', href: '/practice', icon: PenSquare },
  { label: 'Bookmarks', href: '/bookmarks', icon: Bookmark },
  { label: 'Profile', href: '/profile', icon: User },
  { label: 'Subscription', href: '/subscription', icon: CreditCard },
]

// The bottom bar fits five; Bookmarks is the occasional one, so it stays on
// the desktop rail and in Profile rather than taking a slot from Quizzes.
const mobileNavItems = navItems.filter((i) => i.label !== 'Bookmarks').slice(0, 5)

export function DashboardSidebar() {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 flex-col border-r bg-white min-h-[calc(100vh-4rem)] p-3 gap-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              pathname === item.href || pathname.startsWith(item.href + '/')
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-gray-100 hover:text-foreground'
            )}
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            {item.label}
          </Link>
        ))}
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t flex justify-around py-2">
        {mobileNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 py-1 rounded-md text-xs',
              pathname === item.href ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}
