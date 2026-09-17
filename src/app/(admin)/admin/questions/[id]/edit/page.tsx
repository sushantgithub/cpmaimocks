'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { ArrowLeft } from 'lucide-react'

interface Category { id: string; name: string }
interface Question {
  id: string; text: string; optionA: string; optionB: string; optionC: string; optionD: string;
  correctAnswer: string; explanation: string; difficulty: string; status: string;
  categoryId: string | null; topicId: string | null;
}

export default function EditQuestionPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [form, setForm] = useState<Question | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/questions/${id}`).then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
    ]).then(([q, cats]) => { setForm(q); setCategories(cats) }).catch(() => {})
  }, [id])

  function field(key: keyof Question) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(p => p ? { ...p, [key]: e.target.value } : p)
  }

  async function save() {
    if (!form) return
    const required = ['text', 'optionA', 'optionB', 'optionC', 'optionD', 'explanation'] as const
    for (const f of required) {
      if (!form[f].trim()) { toast({ title: `${f} is required`, variant: 'destructive' }); return }
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/questions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: form.text, optionA: form.optionA, optionB: form.optionB,
          optionC: form.optionC, optionD: form.optionD,
          correctAnswer: form.correctAnswer, explanation: form.explanation,
          difficulty: form.difficulty, status: form.status,
          categoryId: form.categoryId || null,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      toast({ title: 'Question updated', variant: 'success' })
      router.push('/admin/questions')
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' })
    } finally { setSaving(false) }
  }

  if (!form) return <div className="animate-pulse h-40 bg-gray-100 rounded-xl" />

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/questions')}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back
        </Button>
        <h1 className="text-xl font-bold text-gray-900">Edit Question</h1>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Question Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Question Text *</label>
            <textarea
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              value={form.text}
              onChange={field('text')}
            />
          </div>

          {(['optionA', 'optionB', 'optionC', 'optionD'] as const).map((opt, i) => (
            <div key={opt}>
              <label className="text-sm font-medium text-gray-700">Option {String.fromCharCode(65 + i)} *</label>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form[opt]}
                onChange={field(opt)}
              />
            </div>
          ))}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Correct Answer</label>
              <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.correctAnswer} onChange={field('correctAnswer')}>
                {['A', 'B', 'C', 'D'].map(k => <option key={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Difficulty</label>
              <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.difficulty} onChange={field('difficulty')}>
                {['EASY', 'MEDIUM', 'HARD'].map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Status</label>
              <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.status} onChange={field('status')}>
                {['DRAFT', 'PUBLISHED', 'ARCHIVED'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Category</label>
              <select
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.categoryId ?? ''}
                onChange={e => setForm(p => p ? { ...p, categoryId: e.target.value || null } : p)}
              >
                <option value="">— None —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Explanation *</label>
            <textarea
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              value={form.explanation}
              onChange={field('explanation')}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => router.push('/admin/questions')}>Cancel</Button>
        <Button onClick={save} loading={saving}>Save Changes</Button>
      </div>
    </div>
  )
}
