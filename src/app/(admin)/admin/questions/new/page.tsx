'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { ArrowLeft } from 'lucide-react'

interface Category { id: string; name: string }

const EMPTY = {
  text: '', optionA: '', optionB: '', optionC: '', optionD: '',
  correctAnswer: 'A', explanation: '', difficulty: 'MEDIUM',
  categoryId: '', status: 'DRAFT',
}

export default function NewQuestionPage() {
  const router = useRouter()
  const [form, setForm] = useState(EMPTY)
  const [categories, setCategories] = useState<Category[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(setCategories).catch(() => {})
  }, [])

  function field(key: keyof typeof EMPTY) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [key]: e.target.value }))
  }

  async function save(publish = false) {
    const required = ['text', 'optionA', 'optionB', 'optionC', 'optionD', 'explanation'] as const
    for (const f of required) {
      if (!form[f].trim()) { toast({ title: `${f} is required`, variant: 'destructive' }); return }
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/questions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: [{
            ...form,
            status: publish ? 'PUBLISHED' : 'DRAFT',
            category: categories.find(c => c.id === form.categoryId)?.name ?? '',
            topic: '',
            tags: '',
          }],
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      toast({ title: publish ? 'Question published' : 'Question saved as draft', variant: 'success' })
      router.push('/admin/questions')
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' })
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
            <label className="text-sm font-medium text-gray-700">Question Text *</label>
            <textarea
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Enter the question..."
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

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Correct Answer *</label>
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
              <label className="text-sm font-medium text-gray-700">Category</label>
              <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.categoryId} onChange={field('categoryId')}>
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
              placeholder="Explain why the correct answer is right..."
              value={form.explanation}
              onChange={field('explanation')}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => save(false)} loading={saving}>Save as Draft</Button>
        <Button onClick={() => save(true)} loading={saving}>Save & Publish</Button>
      </div>
    </div>
  )
}
