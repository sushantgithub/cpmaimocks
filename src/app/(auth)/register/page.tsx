'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getProviders, signIn, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const googleInFlight = useRef(false)
  const [googleEnabled, setGoogleEnabled] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })

  useEffect(() => {
    getProviders()
      .then((providers) => setGoogleEnabled(Boolean(providers?.google)))
      .catch(() => setGoogleEnabled(false))
  }, [])

  async function clearExistingSession() {
    // Registration is an account-switch boundary. An existing session (for
    // example an admin testing signup) must not survive into the new account.
    await signOut({ redirect: false })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirm) {
      toast({ title: 'Passwords do not match', variant: 'destructive' })
      return
    }
    if (form.password.length < 8) {
      toast({ title: 'Password must be at least 8 characters', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Registration failed')

      // Only clear the old session after registration succeeds. A validation or
      // server error must not unexpectedly sign the current user out.
      await clearExistingSession()
      toast({ title: 'Account created!', description: 'Please check your email to verify your account.', variant: 'success' })
      router.replace('/login?registered=1')
      router.refresh()
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Registration failed')
      toast({ title: error.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignup() {
    if (googleInFlight.current) return
    googleInFlight.current = true
    setLoading(true)
    try {
      // Google signup may be started while another CertMocks account is signed
      // in. Clear that application session before OAuth chooses the new account.
      await clearExistingSession()
      await signIn('google', { callbackUrl: '/dashboard' }, { prompt: 'select_account' })
    } catch {
      toast({ title: 'Could not start Google sign-up', variant: 'destructive' })
      setLoading(false)
    } finally {
      googleInFlight.current = false
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <CardDescription>Start preparing for your certification exam</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="Min 8 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="confirm">Confirm Password</Label>
            <Input id="confirm" type="password" placeholder="Repeat password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required className="mt-1" />
          </div>
          <Button type="submit" className="w-full" size="lg" loading={loading}>
            Create Account
          </Button>
        </form>

        {googleEnabled && (
          <>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <Button variant="outline" className="w-full" onClick={handleGoogleSignup} disabled={loading}>
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 0 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>
          </>
        )}

        <div className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline font-medium">Sign in</Link>
        </div>

        <p className="mt-4 text-xs text-muted-foreground text-center leading-relaxed">
          By creating an account you agree to our{' '}
          <Link href="/legal/terms" className="underline">Terms of Service</Link>{' '}
          and{' '}
          <Link href="/legal/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </CardContent>
    </Card>
  )
}
