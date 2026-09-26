'use client'

import Link from 'next/link'
import { ChevronDown } from 'lucide-react'

interface Attempt {
  id: string
  score: number | null
  attemptNumber: number
}

export function MockAttemptHistory({ attempts }: { attempts: Attempt[] }) {
  if (attempts.length === 0) return null

  return (
    <details className="group mb-3 rounded-lg border overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-700 [&::-webkit-details-marker]:hidden">
        <span>View attempt history ({attempts.length})</span>
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
      </summary>
      <div className="max-h-40 overflow-y-auto divide-y">
        {attempts.map((attempt) => (
          <Link
            key={attempt.id}
            href={`/results/${attempt.id}`}
            className="flex items-center justify-between gap-3 px-3 py-2 text-xs hover:bg-gray-50"
          >
            <span>Attempt {attempt.attemptNumber}</span>
            <span className="font-semibold">{Math.round(attempt.score ?? 0)}%</span>
          </Link>
        ))}
      </div>
    </details>
  )
}
