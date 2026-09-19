'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { BookmarkX, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { answerLetters } from '@/lib/answers'
import { AnswerExplanation } from '@/components/exam/answer-explanation'

interface BookmarkedQuestion {
  id: string
  question: {
    id: string
    questionId: string
    text: string
    optionA: string
    optionB: string
    optionC: string
    optionD: string
    optionE?: string | null
    optionF?: string | null
    correctAnswer: string
    explanation: string
    explanationA?: string | null
    explanationB?: string | null
    explanationC?: string | null
    explanationD?: string | null
    explanationE?: string | null
    explanationF?: string | null
    difficulty: string
    category?: { name: string } | null
    topic?: { name: string } | null
  }
  createdAt: string
}

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkedQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [removing, setRemoving] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/bookmarks')
      .then((r) => r.json())
      .then(setBookmarks)
      .catch(() => toast({ title: 'Failed to load bookmarks', variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [])

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function removeBookmark(questionId: string) {
    setRemoving(questionId)
    try {
      await fetch('/api/bookmarks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId }),
      })
      setBookmarks((prev) => prev.filter((b) => b.question.id !== questionId))
      toast({ title: 'Bookmark removed', variant: 'success' })
    } catch {
      toast({ title: 'Failed to remove bookmark', variant: 'destructive' })
    } finally {
      setRemoving(null)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-3 pb-20 md:pb-6">
        <h1 className="text-2xl font-bold">Bookmarks</h1>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-20 md:pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bookmarks</h1>
        <span className="text-sm text-muted-foreground">{bookmarks.length} saved</span>
      </div>

      {bookmarks.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No bookmarks yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Save questions during practice sessions to review them here.
            </p>
          </CardContent>
        </Card>
      ) : (
        bookmarks.map((b) => {
          const q = b.question
          const isExpanded = expanded.has(b.id)
          const correctKeys = answerLetters(q.correctAnswer)
          const OPTIONS = [
            { key: 'A', text: q.optionA },
            { key: 'B', text: q.optionB },
            { key: 'C', text: q.optionC },
            { key: 'D', text: q.optionD },
            { key: 'E', text: q.optionE },
            { key: 'F', text: q.optionF },
          ].filter((o) => o.text)

          return (
            <Card key={b.id} className="overflow-hidden">
              <CardContent className="p-0">
                {/* Header row */}
                <button
                  className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
                  onClick={() => toggleExpand(b.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <Badge variant="outline" className="text-xs capitalize">{q.difficulty.toLowerCase()}</Badge>
                      {q.category && <Badge variant="secondary" className="text-xs">{q.category.name}</Badge>}
                    </div>
                    <p className="text-sm font-medium leading-snug line-clamp-2">{q.text}</p>
                  </div>
                  {isExpanded
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  }
                </button>

                {/* Expanded view */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t pt-3">
                    <div className="space-y-2">
                      {OPTIONS.map((opt) => (
                        <div
                          key={opt.key}
                          className={cn(
                            'flex items-start gap-3 p-3 rounded-lg border',
                            correctKeys.includes(opt.key)
                              ? 'border-green-400 bg-green-50'
                              : 'border-gray-200 bg-gray-50'
                          )}
                        >
                          <span className={cn(
                            'flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold',
                            correctKeys.includes(opt.key)
                              ? 'border-green-500 bg-green-500 text-white'
                              : 'border-gray-300 text-gray-600'
                          )}>
                            {opt.key}
                          </span>
                          <span className="text-sm leading-relaxed">{opt.text}</span>
                        </div>
                      ))}
                    </div>

                    {/* No attempt behind a bookmark, so every option is shown. */}
                    <AnswerExplanation question={q} selectedAnswer={null} expanded />

                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removeBookmark(q.id)}
                        loading={removing === q.id}
                      >
                        <BookmarkX className="h-4 w-4 mr-1.5" />Remove
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
