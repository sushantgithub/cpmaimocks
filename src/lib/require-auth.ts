import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export async function requireActiveSession() {
  const session = await auth()
  if (!session) redirect('/login')
  return session
}

export async function requireAdminSession() {
  const session = await requireActiveSession()
  if (session.user.role !== 'ADMIN') redirect('/dashboard')
  return session
}
