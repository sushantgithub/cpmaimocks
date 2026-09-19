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
  explanationA: string | null; explanationB: string | null;
  explanationC: string | null; explanationD: string | null;
  categoryId: string | null; topicId: string | null;
  certificationId: string;
  certification?: { name: string; fullName?: string | null } | null;
  /** The topic's name, not its id — it may not exist yet. */
  topic: string;
}

const OPTION_EXPLANATIONS = ['explanationA', 'explanationB', 'explanationC', 'explanationD'] as const

export default function EditQuestionPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [form, setForm] = useState<Question | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/questions/${id}`)
      .then(r => r.json())
      .then(async (q: Question) => {
        setForm(q)
        // Only this certification's domains, so a question cannot be filed
        // under a domain belonging to a different exam.
        const cats = await fetch(`/api/categories?certificationId=${q.certificationId}`).then(r => r.json())
        setCategories(cats)
      })
      .catch(() => {})
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
      if (form.topic?.trim() && !form.categoryId) {
        toast({ title: 'Pick a domain before naming a topic', variant: 'destructive' }); return
      }
      const res = await fetch(`/api/admin/questions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: form.text, optionA: form.optionA, optionB: form.optionB,
          optionC: form.optionC, optionD: form.optionD,
          correctAnswer: form.correctAnswer, explanation: form.explanation,
          explanationA: form.explanationA ?? '', explanationB: form.explanationB ?? '',
          explanationC: form.explanationC ?? '', explanationD: form.explanationD ?? '',
          difficulty: form.difficulty, status: form.status,
          categoryId: form.categoryId || null,
          topic: form.topic ?? '',
        }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Save failed')
      toast({ title: 'Question updated', variant: 'success' })
      router.push('/admin/questions')
    } catch (err) {
      toast({
        title: 'Failed to save',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      })
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
            <label className="text-sm font-medium text-gray-700">Certification</label>
            <p className="mt-1 rounded-lg border bg-gray-50 px-3 py-2 text-sm text-gray-700">
              {form.certification?.fullName
                ? `${form.certification.name} — ${form.certification.fullName}`
                : form.certification?.name ?? '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Fixed once a question exists. Moving it to another exam would leave its
              domain behind — delete and re-add instead.
            </p>
          </div>

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
              <label className="text-sm font-medium text-gray-700">Domain</label>
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
            <label className="text-sm font-medium text-gray-700">Topic</label>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional — a sub-area within the domain, e.g. Bias and fairness"
              value={form.topic ?? ''}
              onChange={field('topic')}
              disabled={!form.categoryId}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {form.categoryId
                ? 'Created automatically if it does not exist yet. Clear it to remove the topic.'
                : 'Pick a domain first — a topic sits inside one.'}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Key idea *</label>
            <textarea
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="One line naming the principle this question tests..."
              value={form.explanation}
              onChange={field('explanation')}
            />
          </div>

          <div className="space-y-3 rounded-lg border bg-gray-50 p-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Why each option is right or wrong</p>
              <p className="text-xs text-muted-foreground">
                Optional. Fill these in and the learner sees their own option explained first,
                then the correct one. Leave them blank and only the key idea is shown.
              </p>
            </div>
            {OPTION_EXPLANATIONS.map((key, i) => (
              <div key={key}>
                <label className="text-xs font-medium text-gray-600">Option {String.fromCharCode(65 + i)}</label>
                <textarea
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  value={form[key] ?? ''}
                  onChange={field(key)}
                />
              </div>
            ))}
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
