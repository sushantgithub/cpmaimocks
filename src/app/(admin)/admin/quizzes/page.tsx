'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { Plus, Trash2, Save } from 'lucide-react'

interface Certification { id: string; name: string }
interface Quiz {
  id: string; title: string; tag: string; description: string | null
  isActive: boolean; certificationId: string
  certification: { id: string; name: string }
  questionCount: number
}

const EMPTY = { title: '', tag: '', description: '', certificationId: '' }

export default function AdminQuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [form, setForm] = useState(EMPTY)
  const [showNew, setShowNew] = useState(false)
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [edits, setEdits] = useState<Record<string, Partial<Quiz>>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/quizzes')
      setQuizzes(await res.json())
      setEdits({})
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    fetch('/api/certifications').then(r => r.json()).then((c: Certification[]) => {
      setCertifications(c)
      if (c.length > 0) setForm(f => ({ ...f, certificationId: f.certificationId || c[0].id }))
    }).catch(() => {})
  }, [])

  async function create() {
    setCreating(true)
    try {
      const res = await fetch('/api/admin/quizzes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create')
      toast({ title: `${data.title} created`, variant: 'success' })
      setForm({ ...EMPTY, certificationId: form.certificationId })
      setShowNew(false)
      load()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Failed', variant: 'destructive' })
    } finally { setCreating(false) }
  }

  async function save(quiz: Quiz) {
    const patch = edits[quiz.id]
    if (!patch) return
    setSavingId(quiz.id)
    try {
      const res = await fetch(`/api/admin/quizzes/${quiz.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      toast({ title: 'Quiz updated', variant: 'success' })
      load()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Save failed', variant: 'destructive' })
    } finally { setSavingId(null) }
  }

  async function remove(quiz: Quiz) {
    if (!confirm(`Delete the "${quiz.title}" quiz? Its questions are not affected.`)) return
    const res = await fetch(`/api/admin/quizzes/${quiz.id}`, { method: 'DELETE' })
    if (!res.ok) { toast({ title: 'Could not delete', variant: 'destructive' }); return }
    toast({ title: 'Quiz deleted', variant: 'success' })
    load()
  }

  function edit(id: string, patch: Partial<Quiz>) {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quizzes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            One quiz per domain is created automatically. Add one here to group questions by tag
            instead, for a drill that spans domains.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowNew(v => !v)}><Plus className="h-4 w-4 mr-1" />New Quiz</Button>
      </div>

      {showNew && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">New quiz</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Name *</label>
                <Input className="mt-1" placeholder="Algorithms" value={form.title}
                  onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Tag *</label>
                <Input className="mt-1" placeholder="algorithm" value={form.tag}
                  onChange={(e) => setForm(p => ({ ...p, tag: e.target.value }))} />
                <p className="text-xs text-gray-400 mt-1">Must match the tags column in your CSV.</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Certification</label>
              <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                value={form.certificationId}
                onChange={(e) => setForm(p => ({ ...p, certificationId: e.target.value }))}>
                {certifications.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Description</label>
              <Input className="mt-1" placeholder="Shown under the quiz name" value={form.description}
                onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowNew(false)}>Cancel</Button>
              <Button size="sm" onClick={create} loading={creating}>Create quiz</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="animate-pulse h-32 bg-gray-100 rounded-xl" />
      ) : quizzes.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">
          No tag quizzes yet. Domain quizzes appear on the site automatically.
        </p>
      ) : (
        <div className="space-y-4">
          {quizzes.map((quiz) => {
            const patch = edits[quiz.id] ?? {}
            const dirty = Object.keys(patch).length > 0
            return (
              <Card key={quiz.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{quiz.title}</h3>
                      <Badge variant="outline" className="text-xs">{quiz.certification.name}</Badge>
                      <Badge variant={quiz.isActive ? 'success' : 'secondary'} className="text-xs">
                        {quiz.isActive ? 'Live' : 'Hidden'}
                      </Badge>
                      <Badge variant={quiz.questionCount > 0 ? 'secondary' : 'destructive'} className="text-xs">
                        {quiz.questionCount} published question(s)
                      </Badge>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => remove(quiz)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600">Name</label>
                      <Input className="mt-1" value={patch.title ?? quiz.title}
                        onChange={(e) => edit(quiz.id, { title: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Tag</label>
                      <Input className="mt-1" value={patch.tag ?? quiz.tag}
                        onChange={(e) => edit(quiz.id, { tag: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Description</label>
                    <Input className="mt-1" value={patch.description ?? quiz.description ?? ''}
                      onChange={(e) => edit(quiz.id, { description: e.target.value })} />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-gray-700">
                    <input type="checkbox" className="h-3.5 w-3.5 rounded"
                      checked={patch.isActive ?? quiz.isActive}
                      onChange={(e) => edit(quiz.id, { isActive: e.target.checked })} />
                    Live
                  </label>

                  {dirty && (
                    <div className="flex justify-end">
                      <Button size="sm" onClick={() => save(quiz)} loading={savingId === quiz.id}>
                        <Save className="h-4 w-4 mr-1" />Save changes
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
