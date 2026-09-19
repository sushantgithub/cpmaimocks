'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { ArrowLeft } from 'lucide-react'

interface Category { id: string; name: string }
interface Certification { id: string; name: string; fullName?: string | null }

const EMPTY = {
  text: '', optionA: '', optionB: '', optionC: '', optionD: '',
  correctAnswer: 'A', explanation: '', difficulty: 'MEDIUM',
  explanationA: '', explanationB: '', explanationC: '', explanationD: '',
  categoryId: '', topic: '', status: 'DRAFT',
  isTest: false,
}

const FIELD = 'mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const TEXTAREA = `${FIELD} resize-y min-h-[76px]`

export default function NewQuestionPage() {
  const router = useRouter()
  const [form, setForm] = useState(EMPTY)
  const [categories, setCategories] = useState<Category[]>([])
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [certificationId, setCertificationId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/certifications')
      .then(r => r.json())
      .then((list: Certification[]) => {
        setCertifications(list)
        setCertificationId(prev => prev || list[0]?.id || '')
      })
      .catch(() => {})
  }, [])

  // Domains belong to a certification, so the list has to follow the picker —
  // otherwise a CPMAI question could be filed under a PMP domain.
  const [categoriesLoaded, setCategoriesLoaded] = useState(false)

  useEffect(() => {
    if (!certificationId) { setCategories([]); return }
    setCategoriesLoaded(false)
    fetch(`/api/categories?certificationId=${certificationId}`)
      .then(r => r.json())
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setCategoriesLoaded(true))
    setForm(p => ({ ...p, categoryId: '' }))
  }, [certificationId])

  // An empty dropdown reads like a broken page, so say which it is.
  const noDomains = categoriesLoaded && categories.length === 0

  function field(key: keyof typeof EMPTY) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [key]: e.target.value }))
  }

  async function save(publish = false) {
    const required = ['text', 'optionA', 'optionB', 'optionC', 'optionD', 'explanation'] as const
    for (const f of required) {
      if (!form[f].trim()) { toast({ title: `${f} is required`, variant: 'destructive' }); return }
    }

    if (!certificationId) { toast({ title: 'Pick a certification first', variant: 'destructive' }); return }
    // A topic hangs off a domain, so one without the other has nowhere to live.
    if (form.topic.trim() && !form.categoryId) {
      toast({ title: 'Pick a domain before naming a topic', variant: 'destructive' }); return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/questions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certificationId,
          // The import endpoint speaks the CSV column names, not form state.
          questions: [{
            question: form.text,
            option_a: form.optionA,
            option_b: form.optionB,
            option_c: form.optionC,
            option_d: form.optionD,
            correct_answer: form.correctAnswer,
            explanation: form.explanation,
            explanation_a: form.explanationA,
            explanation_b: form.explanationB,
            explanation_c: form.explanationC,
            explanation_d: form.explanationD,
            difficulty: form.difficulty,
            domain: categories.find(c => c.id === form.categoryId)?.name ?? '',
            topic: form.topic,
            is_test: form.isTest ? 'true' : '',
            status: publish ? 'PUBLISHED' : 'DRAFT',
          }],
        }),
      })
      const result = await res.json().catch(() => null)
      if (!res.ok) throw new Error(result?.error ?? 'Save failed')
      // A row rejected by the importer still returns 200, so check the count
      // rather than reporting a success that never happened.
      if (!result?.imported) throw new Error(result?.errors?.[0] ?? 'Question was not saved')
      toast({ title: publish ? 'Question published' : 'Question saved as draft', variant: 'success' })
      router.push('/admin/questions')
    } catch (err) {
      toast({
        title: 'Failed to save',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      })
    } finally { setSaving(false) }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/questions')}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back
        </Button>
        <h1 className="text-xl font-bold text-gray-900">New Question</h1>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Question Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Certification *</label>
            <select
              className={FIELD}
              value={certificationId}
              onChange={e => setCertificationId(e.target.value)}
            >
              {certifications.length === 0 && <option value="">Loading…</option>}
              {certifications.map(c => (
                <option key={c.id} value={c.id}>{c.fullName ? `${c.name} — ${c.fullName}` : c.name}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              The exam this question belongs to. The domain list below follows this choice.
            </p>
            {noDomains && (
              <p className="text-xs text-amber-700 mt-1">
                This certification has no domains yet. Add them under Admin → Domains,
                or pick a different certification.
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Question Text *</label>
            <textarea
              className={TEXTAREA}
              placeholder="Enter the question..."
              value={form.text}
              onChange={field('text')}
            />
          </div>

          {(['optionA', 'optionB', 'optionC', 'optionD'] as const).map((opt, i) => (
            <div key={opt}>
              <label className="text-sm font-medium text-gray-700">Option {String.fromCharCode(65 + i)} *</label>
              <input
                className={FIELD}
                value={form[opt]}
                onChange={field(opt)}
              />
            </div>
          ))}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Correct Answer *</label>
              <select className={FIELD} value={form.correctAnswer} onChange={field('correctAnswer')}>
                {['A', 'B', 'C', 'D'].map(k => <option key={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Difficulty</label>
              <select className={FIELD} value={form.difficulty} onChange={field('difficulty')}>
                {['EASY', 'MEDIUM', 'HARD'].map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Domain</label>
              <select
                className={`${FIELD} disabled:bg-gray-100`}
                value={form.categoryId}
                onChange={field('categoryId')}
                disabled={noDomains}
              >
                <option value="">{noDomains ? '— No domains —' : '— None —'}</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Topic</label>
            <input
              className={FIELD}
              placeholder="Optional — a sub-area within the domain, e.g. Bias and fairness"
              value={form.topic}
              onChange={field('topic')}
              disabled={!form.categoryId}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {form.categoryId
                ? 'Created automatically if it does not exist yet.'
                : 'Pick a domain first — a topic sits inside one.'}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Key idea *</label>
            <textarea
              className={TEXTAREA}
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
            {(['explanationA', 'explanationB', 'explanationC', 'explanationD'] as const).map((key, i) => (
              <div key={key}>
                <label className="text-xs font-medium text-gray-600">Option {String.fromCharCode(65 + i)}</label>
                <textarea
                  className={TEXTAREA}
                  value={form[key]}
                  onChange={field(key)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-gray-300"
              checked={form.isTest}
              onChange={e => setForm(p => ({ ...p, isTest: e.target.checked }))}
            />
            <span>
              <span className="text-sm font-medium text-gray-700">Test question</span>
              <span className="block text-xs text-muted-foreground">
                Marks this as throwaway content. Test questions can be found and deleted
                in one go later, without guessing from their wording.
              </span>
            </span>
          </label>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => save(false)} loading={saving}>Save as Draft</Button>
        <Button onClick={() => save(true)} loading={saving}>Save & Publish</Button>
      </div>
    </div>
  )
}
