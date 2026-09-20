'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { Plus, Trash2 } from 'lucide-react'

interface Certification {
  id: string
  name: string
  slug: string
  fullName: string | null
  description: string | null
  isActive: boolean
  usesDomains: boolean
  _count: { questions: number; exams: number; categories: number }
  mockExamCount: number
  inventory: { quiz: number; mockExam: number; practiceOnly: number; practiceTotal: number }
}

const EMPTY = { name: '', fullName: '', description: '', usesDomains: true }

export default function AdminCertificationsPage() {
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/certifications')
      setCertifications(await res.json())
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function create() {
    if (!form.name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/certifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create')
      setForm(EMPTY)
      toast({ title: `${data.name} created`, variant: 'success' })
      load()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Failed', variant: 'destructive' })
    } finally { setSaving(false) }
  }

  async function toggleActive(cert: Certification) {
    await fetch(`/api/admin/certifications/${cert.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !cert.isActive }),
    })
    toast({ title: cert.isActive ? `${cert.name} hidden` : `${cert.name} active`, variant: 'success' })
    load()
  }

  async function toggleDomains(cert: Certification) {
    const res = await fetch(`/api/admin/certifications/${cert.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usesDomains: !cert.usesDomains }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast({ title: data.error ?? 'Could not update domain setting', variant: 'destructive' })
      return
    }
    toast({
      title: cert.usesDomains
        ? `Domains disabled for ${cert.name}`
        : `Domains enabled for ${cert.name}`,
      variant: 'success',
    })
    load()
  }

  async function remove(cert: Certification) {
    if (!confirm(`Delete "${cert.name}"?`)) return
    const res = await fetch(`/api/admin/certifications/${cert.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      toast({ title: data.error ?? 'Could not delete', variant: 'destructive' })
      return
    }
    toast({ title: `${cert.name} deleted`, variant: 'success' })
    load()
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Certifications</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Each question and exam belongs to one certification. Students only ever see one at a time.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Add a certification</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Short name *</label>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="PMI-ACP"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Full name</label>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Agile Certified Practitioner"
                value={form.fullName}
                onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Description</label>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Shown to students on the exam list"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            />
          </div>
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.usesDomains}
              onChange={(e) => setForm(p => ({ ...p, usesDomains: e.target.checked }))}
              className="mt-0.5 h-4 w-4 rounded border-gray-300"
            />
            <span>
              <span className="font-medium">Uses Domains</span>
              <span className="block text-xs text-gray-500">
                Enable for certifications whose questions must be organised and reported by domain.
              </span>
            </span>
          </label>
          <div className="flex justify-end">
            <Button onClick={create} loading={saving}>
              <Plus className="h-4 w-4 mr-1" />Add Certification
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="animate-pulse h-32 bg-gray-100 rounded-xl" />
      ) : (
        <div className="space-y-3">
          {certifications.map(cert => (
            <Card key={cert.id}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{cert.name}</h3>
                      <Badge variant={cert.isActive ? 'success' : 'secondary'} className="text-xs">
                        {cert.isActive ? 'Active' : 'Hidden'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {cert.usesDomains ? 'Uses Domains' : 'No Domains'}
                      </Badge>
                    </div>
                    {cert.fullName && <p className="text-sm text-gray-600 mt-0.5">{cert.fullName}</p>}
                    <p className="text-xs text-gray-500 mt-1">
                      {cert._count.questions} questions · {cert.mockExamCount} mock exam{cert.mockExamCount === 1 ? '' : 's'} · {cert._count.categories} domains
                    </p>
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="rounded-md border bg-gray-50 px-2.5 py-2">
                        <span className="block text-gray-500">Quiz</span>
                        <strong>{cert.inventory.quiz}</strong>
                      </div>
                      <div className="rounded-md border bg-gray-50 px-2.5 py-2">
                        <span className="block text-gray-500">Mock</span>
                        <strong>{cert.inventory.mockExam}</strong>
                      </div>
                      <div className="rounded-md border bg-gray-50 px-2.5 py-2">
                        <span className="block text-gray-500">Practice only</span>
                        <strong>{cert.inventory.practiceOnly}</strong>
                      </div>
                      <div className="rounded-md border bg-blue-50 px-2.5 py-2">
                        <span className="block text-blue-700">Practice pool</span>
                        <strong className="text-blue-900">{cert.inventory.practiceTotal}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap sm:flex-shrink-0 sm:justify-end">
                    <Button className="flex-1 sm:flex-none" size="sm" variant="outline" onClick={() => toggleDomains(cert)}>
                      {cert.usesDomains ? 'Disable Domains' : 'Enable Domains'}
                    </Button>
                    <Button className="flex-1 sm:flex-none" size="sm" variant="outline" onClick={() => toggleActive(cert)}>
                      {cert.isActive ? 'Hide' : 'Activate'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(cert)} aria-label={`Delete ${cert.name}`}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {certifications.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">No certifications yet.</p>
          )}
        </div>
      )}
    </div>
  )
}
