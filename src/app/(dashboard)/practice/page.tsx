'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { BookOpen, Target, RotateCcw, Shuffle } from 'lucide-react'

const DIFFICULTY_OPTIONS = ['EASY', 'MEDIUM', 'HARD']
const QUESTION_COUNTS = [10, 20, 30, 50]

interface Category { id: string; name: string }
interface Certification { id: string; name: string; fullName?: string | null }

export default function PracticePage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [config, setConfig] = useState({
    questionCount: 20,
    certificationId: '',
    difficulty: [] as string[],
    categoryIds: [] as string[],
    mode: 'RANDOM' as 'RANDOM' | 'INCORRECT' | 'BOOKMARKED',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/certifications')
      .then((r) => r.json())
      .then((certs: Certification[]) => {
        setCertifications(certs)
        if (certs.length > 0) setConfig((p) => ({ ...p, certificationId: certs[0].id }))
      })
      .catch(() => {})
  }, [])

  // Domains belong to a certification, so reload them whenever it changes
  useEffect(() => {
    if (!config.certificationId) return
    fetch(`/api/categories?certificationId=${config.certificationId}`)
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {})
    setConfig((p) => ({ ...p, categoryIds: [] }))
  }, [config.certificationId])

  function toggleDifficulty(d: string) {
    setConfig((prev) => ({
      ...prev,
      difficulty: prev.difficulty.includes(d)
        ? prev.difficulty.filter((x) => x !== d)
        : [...prev.difficulty, d],
    }))
  }

  function toggleCategory(id: string) {
    setConfig((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(id)
        ? prev.categoryIds.filter((x) => x !== id)
        : [...prev.categoryIds, id],
    }))
  }

  async function startPractice() {
    setLoading(true)
    try {
      const res = await fetch('/api/practice/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Only PUBLISHED questions are eligible, so a narrow filter or a bank
      // still in draft can yield far fewer than asked for.
      if (data.questionCount < data.requested) {
        toast({
          title: `Only ${data.questionCount} question${data.questionCount === 1 ? '' : 's'} matched`,
          description: `You asked for ${data.requested}. Try fewer filters, or ask an admin to publish more questions.`,
        })
      }
      router.push(`/practice/${data.attemptId}`)
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Failed to start')
      toast({ title: error.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-6">
      <div>
        <h1 className="text-2xl font-bold">Practice Mode</h1>
        <p className="text-muted-foreground text-sm mt-1">Customise your practice session.</p>
      </div>

      {/* Mode */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3">Practice Mode</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { mode: 'RANDOM' as const, icon: Shuffle, label: 'Random', desc: 'Mixed questions' },
              { mode: 'INCORRECT' as const, icon: RotateCcw, label: 'My Mistakes', desc: 'Previously wrong' },
              { mode: 'BOOKMARKED' as const, icon: BookOpen, label: 'Bookmarked', desc: 'Saved questions' },
            ].map((m) => (
              <button
                key={m.mode}
                onClick={() => setConfig((p) => ({ ...p, mode: m.mode }))}
                className={`border-2 rounded-xl p-3 text-center transition-all ${config.mode === m.mode ? 'border-primary bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <m.icon className={`h-5 w-5 mx-auto mb-1 ${config.mode === m.mode ? 'text-primary' : 'text-gray-400'}`} />
                <p className="text-sm font-medium">{m.label}</p>
                <p className="text-xs text-muted-foreground">{m.desc}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {certifications.length > 1 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">Certification</h3>
            <div className="flex gap-2 flex-wrap">
              {certifications.map((cert) => (
                <button
                  key={cert.id}
                  onClick={() => setConfig((p) => ({ ...p, certificationId: cert.id }))}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    config.certificationId === cert.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {cert.name}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Question count */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3">Number of Questions</h3>
          <div className="flex gap-3">
            {QUESTION_COUNTS.map((n) => (
              <button
                key={n}
                onClick={() => setConfig((p) => ({ ...p, questionCount: n }))}
                className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${config.questionCount === n ? 'border-primary bg-primary text-white' : 'border-gray-200 hover:border-gray-300'}`}
              >
                {n}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Difficulty */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3">Difficulty <span className="text-muted-foreground font-normal text-sm">(leave blank for all)</span></h3>
          <div className="flex gap-3">
            {DIFFICULTY_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => toggleDifficulty(d)}
                className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${
                  config.difficulty.includes(d)
                    ? d === 'EASY' ? 'border-green-500 bg-green-100 text-green-800'
                    : d === 'MEDIUM' ? 'border-yellow-500 bg-yellow-100 text-yellow-800'
                    : 'border-red-500 bg-red-100 text-red-800'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {d.toLowerCase()}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Domain filter */}
      {categories.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">Domain <span className="text-muted-foreground font-normal text-sm">(leave blank for all)</span></h3>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full border text-sm transition-all ${config.categoryIds.includes(cat.id) ? 'border-primary bg-blue-50 text-primary' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 flex items-center justify-between">
        <div>
          <p className="font-medium text-blue-900">{config.questionCount} questions</p>
          <p className="text-sm text-blue-700">
            {config.mode === 'RANDOM' ? 'Random selection' : config.mode === 'INCORRECT' ? 'Previously incorrect' : 'Bookmarked'} •{' '}
            {config.difficulty.length > 0 ? config.difficulty.join(', ') : 'All difficulties'}
          </p>
        </div>
        <Button onClick={startPractice} loading={loading} size="lg">
          <Target className="h-4 w-4 mr-2" />Start
        </Button>
      </div>
    </div>
  )
}
