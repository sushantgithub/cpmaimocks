'use client'

import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { BookOpen, Home, LogOut, Shield } from 'lucide-react'

interface Props {
  user: { name?: string | null; email?: string | null; image?: string | null; role?: string }
}

export function DashboardNav({ user }: Props) {
  const displayName = user.name?.trim() || user.email || 'Account'

  return (
    <header className="sticky top-0 z-50 border-b bg-white shadow-sm">
      <div className="flex h-16 items-center justify-between px-3 sm:px-4 md:px-6">
        <Link href="/dashboard" className="flex shrink-0 items-center gap-2 font-bold text-primary">
          <BookOpen className="h-6 w-6" />
          <span className="hidden sm:block">CertMocks</span>
        </Link>
        <div className="flex min-w-0 items-center gap-1 sm:gap-2 md:gap-3">
          <Link
            href="/profile"
            className="max-w-[7rem] truncate px-1 text-sm text-muted-foreground hover:text-foreground sm:max-w-[12rem]"
            title={displayName}
          >
            {displayName}
          </Link>
          {user.role === 'ADMIN' && (
            <Button variant="outline" size="sm" className="hidden sm:inline-flex" asChild>
              <Link href="/admin">
                <Shield className="h-4 w-4 mr-1" />
                Admin
              </Link>
            </Button>
          )}
          <Button variant="ghost" size="sm" className="px-2 sm:px-3" asChild>
            <Link href="/">
              <Home className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden min-[360px]:inline">Home</span>
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="px-2 text-red-600 hover:bg-red-50 hover:text-red-700 sm:px-3"
            onClick={() => signOut({ callbackUrl: '/' })}
          >
            <LogOut className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden min-[360px]:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
