'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { User, Lock, Trash2, Trophy, BookOpen, Target, TrendingUp } from 'lucide-react'

interface Props {
  user: { name: string; email: string; memberSince: string }
  stats: { totalExams: number; totalQuestions: number; avgScore: number; bestScore: number }
  subscription: { planName: string; status: string; access: string } | null
}

export function ProfileClient({ user, stats, subscription }: Props) {
  const router = useRouter()
  const [name, setName] = useState(user.name)
  const [savingName, setSavingName] = useState(false)
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' })
  const [savingPass, setSavingPass] = useState(false)

  async function saveName() {
    setSavingName(true)
    try {
      const res = await fetch('/api/users/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'Name updated', variant: 'success' })
      router.refresh()
    } catch { toast({ title: 'Update failed', variant: 'destructive' }) }
    finally { setSavingName(false) }
  }

  async function changePassword() {
    if (passwords.newPass !== passwords.confirm) { toast({ title: 'Passwords do not match', variant: 'destructive' }); return }
    if (passwords.newPass.length < 8) { toast({ title: 'Min 8 characters', variant: 'destructive' }); return }
    setSavingPass(true)
    try {
      const res = await fetch('/api/users/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(passwords) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: 'Password changed', variant: 'success' })
      setPasswords({ current: '', newPass: '', confirm: '' })
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Failed')
      toast({ title: error.message, variant: 'destructive' })
    }
    finally { setSavingPass(false) }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Trophy, label: 'Exams', value: stats.totalExams },
          { icon: BookOpen, label: 'Questions', value: stats.totalQuestions },
          { icon: Target, label: 'Avg Score', value: `${stats.avgScore}%` },
          { icon: TrendingUp, label: 'Best Score', value: `${stats.bestScore}%` },
        ].map((s) => (
          <Card key={s.label}><CardContent className="p-3 text-center"><s.icon className="h-4 w-4 mx-auto mb-1 text-primary" /><div className="font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></CardContent></Card>
        ))}
      </div>

      {/* Subscription */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="font-medium">{subscription?.planName ?? 'Free Plan'}</p>
            {subscription ? (
              <p className="text-sm text-muted-foreground">{subscription.access}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Limited access</p>
            )}
          </div>
          <Badge variant={subscription?.status === 'ACTIVE' ? 'success' : 'secondary'}>
            {subscription?.status ?? 'Free'}
          </Badge>
        </CardContent>
      </Card>

      {/* Account details */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" />Account Details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Name</Label>
            <div className="flex gap-2 mt-1">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
              <Button onClick={saveName} loading={savingName} variant="outline">Save</Button>
            </div>
          </div>
          <div>
            <Label>Email</Label>
            <Input value={user.email} disabled className="mt-1 bg-gray-50" />
          </div>
          <p className="text-xs text-muted-foreground">Member since {user.memberSince}</p>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4" />Change Password</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Current Password</Label><Input type="password" value={passwords.current} onChange={(e) => setPasswords({...passwords, current: e.target.value})} className="mt-1" /></div>
          <div><Label>New Password</Label><Input type="password" value={passwords.newPass} onChange={(e) => setPasswords({...passwords, newPass: e.target.value})} className="mt-1" /></div>
          <div><Label>Confirm New Password</Label><Input type="password" value={passwords.confirm} onChange={(e) => setPasswords({...passwords, confirm: e.target.value})} className="mt-1" /></div>
          <Button onClick={changePassword} loading={savingPass}>Update Password</Button>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-red-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-red-700 flex items-center gap-2"><Trash2 className="h-4 w-4" />Delete Account</p>
              <p className="text-sm text-muted-foreground mt-0.5">Request account deletion. All data will be removed.</p>
            </div>
            <Button variant="destructive" size="sm" onClick={() => {
              if (confirm('Are you sure? This will permanently delete your account.')) {
                fetch('/api/users/delete-request', { method: 'POST' }).then(() => {
                  toast({ title: 'Deletion requested. We\'ll process it within 7 days.', variant: 'success' })
                })
              }
            }}>
              Request Deletion
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
