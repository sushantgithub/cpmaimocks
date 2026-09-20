'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react'

interface Certification { id: string; name: string; usesDomains: boolean }
interface Category { id: string; name: string; sortOrder: number; _count: { questions: number } }

export default function AdminDomainsPage() {
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [certificationId, setCertificationId] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const selectedCertification = certifications.find((cert) => cert.id === certificationId) ?? null
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [mergingId, setMergingId] = useState<string | null>(null)
  const [mergeTarget, setMergeTarget] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/certifications')
      .then((r) => r.json())
      .then((certs: Certification[]) => {
        setCertifications(certs)
        if (certs.length > 0) setCertificationId(certs[0].id)
      })
      .catch(() => {})
  }, [])

  const loadCategories = useCallback(async () => {
    if (!certificationId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/categories?certificationId=${certificationId}`)
      setCategories(await res.json())
    } finally {
      setLoading(false)
    }
  }, [certificationId])

  useEffect(() => { loadCategories() }, [loadCategories])

  async function createDomain() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), certificationId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create')
      setNewName('')
      toast({ title: 'Domain added', variant: 'success' })
      loadCategories()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Failed', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id)
    setEditValue(cat.name)
  }

  async function saveEdit(id: string) {
    if (!editValue.trim()) return
    setSavingId(id)
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editValue.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      toast({ title: 'Domain renamed', variant: 'success' })
      setEditingId(null)
      loadCategories()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Failed', variant: 'destructive' })
    } finally {
      setSavingId(null)
    }
  }

  async function remove(cat: Category) {
    if (!confirm(`Delete "${cat.name}"?`)) return
    const res = await fetch(`/api/admin/categories/${cat.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      toast({ title: data.error ?? 'Could not delete', variant: 'destructive' })
      return
    }
    toast({ title: 'Domain deleted', variant: 'success' })
    loadCategories()
  }

  async function merge(cat: Category) {
    const targetId = mergeTarget[cat.id]
    if (!targetId) return
    const target = categories.find((c) => c.id === targetId)
    if (!target) return
    if (!confirm(`Move all ${cat._count.questions} question(s) from "${cat.name}" into "${target.name}", then delete "${cat.name}"?`)) return
    setMergingId(cat.id)
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mergeInto: targetId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Merge failed')
      toast({ title: `Merged into ${target.name}`, description: `${data.questionsMoved} question(s) moved`, variant: 'success' })
      loadCategories()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Merge failed', variant: 'destructive' })
    } finally {
      setMergingId(null)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Domains</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          These are the domain names shown on the home page and used to organise questions.
          Renaming keeps its questions. Merge moves every question from one domain into another and
          removes the emptied one — use it to consolidate domains that turn out to be the same thing.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <label className="text-sm font-medium text-gray-700">Certification Name</label>
          <select
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={certificationId}
            onChange={(e) => setCertificationId(e.target.value)}
          >
            {certifications.length === 0 && <option value="">No active certifications</option>}
            {certifications.map((cert) => (
              <option key={cert.id} value={cert.id}>
                {cert.name}{cert.usesDomains ? '' : ' — Domains disabled'}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground mt-1">
            Domains are owned by the selected certification.
          </p>
        </CardContent>
      </Card>

      {selectedCertification && !selectedCertification.usesDomains && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Domains are disabled for {selectedCertification.name}. Enable domain support on the Certification page before adding domains.
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Input
              placeholder="New domain name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createDomain()}
            />
            <Button onClick={createDomain} loading={creating} disabled={!certificationId || selectedCertification?.usesDomains === false}>
              <Plus className="h-4 w-4 mr-1" />Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="animate-pulse h-40 bg-gray-100 rounded-xl" />
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {categories.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">No domains yet for this certification.</p>
            )}
            {categories.map((cat) => (
              <div key={cat.id} className="px-4 py-4">
                {editingId === cat.id ? (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <Input
                      className="w-full sm:flex-1"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit(cat.id)}
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => saveEdit(cat.id)}
                        disabled={savingId === cat.id}
                      >
                        <Check className="h-4 w-4 text-green-600 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4 text-gray-400 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 leading-snug break-words">
                          {cat.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {cat._count.questions} question{cat._count.questions === 1 ? '' : 's'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => startEdit(cat)}
                          aria-label={`Rename ${cat.name}`}
                        >
                          <Pencil className="h-4 w-4 text-gray-500" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => remove(cat)}
                          aria-label={`Delete ${cat.name}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>

                    {categories.length > 1 && (
                      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                        <select
                          className="w-full min-w-0 border rounded-md px-3 py-2 text-sm text-gray-700"
                          value={mergeTarget[cat.id] ?? ''}
                          onChange={(e) => setMergeTarget((prev) => ({ ...prev, [cat.id]: e.target.value }))}
                        >
                          <option value="">Merge into another domain…</option>
                          {categories.filter((c) => c.id !== cat.id).map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full sm:w-auto"
                          disabled={!mergeTarget[cat.id] || mergingId === cat.id}
                          onClick={() => merge(cat)}
                        >
                          Merge
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
