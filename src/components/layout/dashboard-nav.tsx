'use client'

import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { BookOpen, LogOut, User, Shield } from 'lucide-react'

interface Props {
  user: { name?: string | null; email?: string | null; image?: string | null; role?: string }
}

export function DashboardNav({ user }: Props) {
  return (
    <header className="sticky top-0 z-50 border-b bg-white shadow-sm">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-primary">
          <BookOpen className="h-6 w-6" />
          <span className="hidden sm:block">CPMAI Prep</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-sm text-muted-foreground">{user.name ?? user.email}</span>
          {user.role === 'ADMIN' && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin">
                <Shield className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild>
            <Link href="/profile"><User className="h-4 w-4" /></Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: '/' })}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
