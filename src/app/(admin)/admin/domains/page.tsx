'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react'

interface Certification { id: string; name: string }
interface Category { id: string; name: string; sortOrder: number; _count: { questions: number } }

export default function AdminDomainsPage() {
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [certificationId, setCertificationId] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
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

      {certifications.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {certifications.map((cert) => (
            <button
              key={cert.id}
              onClick={() => setCertificationId(cert.id)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                certificationId === cert.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {cert.name}
            </button>
          ))}
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
            <Button onClick={createDomain} loading={creating} disabled={!certificationId}>
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
              <div key={cat.id} className="flex items-center gap-3 px-4 py-3">
                {editingId === cat.id ? (
                  <>
                    <Input
                      className="flex-1"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit(cat.id)}
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" onClick={() => saveEdit(cat.id)} disabled={savingId === cat.id}>
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4 text-gray-400" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium text-gray-900">{cat.name}</span>
                    <span className="text-xs text-gray-500">{cat._count.questions} question(s)</span>
                    {categories.length > 1 && (
                      <select
                        className="border rounded-md px-1.5 py-1 text-xs text-gray-600 max-w-[9rem]"
                        value={mergeTarget[cat.id] ?? ''}
                        onChange={(e) => setMergeTarget((prev) => ({ ...prev, [cat.id]: e.target.value }))}
                      >
                        <option value="">Merge into…</option>
                        {categories.filter((c) => c.id !== cat.id).map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!mergeTarget[cat.id] || mergingId === cat.id}
                      onClick={() => merge(cat)}
                    >
                      Merge
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => startEdit(cat)}>
                      <Pencil className="h-4 w-4 text-gray-500" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(cat)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
