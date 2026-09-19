'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { answerLetters, explanationRows, splitExplanationRows, type ExplanationRow } from '@/lib/answers'
import { CheckCircle2, XCircle, ChevronDown } from 'lucide-react'

export interface ExplainedQuestion {
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  optionE?: string | null
  optionF?: string | null
  correctAnswer: string
  /** The key idea — one line naming the principle the question tests. */
  explanation: string
  explanationA?: string | null
  explanationB?: string | null
  explanationC?: string | null
  explanationD?: string | null
  explanationE?: string | null
  explanationF?: string | null
}

interface Props {
  question: ExplainedQuestion
  /** What the learner picked, e.g. "B" or "A,C". */
  selectedAnswer: string | null | undefined
  /** Results pages list every option at once; a live sitting does not. */
  expanded?: boolean
  className?: string
}

function OptionRow({ row }: { row: ExplanationRow }) {
  return (
    <li
      className={cn(
        'flex gap-3 rounded-lg border border-l-[3px] p-3',
        row.correct ? 'border-green-200 border-l-green-500 bg-green-50' : 'border-red-100 border-l-red-400 bg-red-50/60'
      )}
    >
      <span className={cn('flex-shrink-0 font-bold text-sm pt-px', row.correct ? 'text-green-700' : 'text-red-700')}>
        {row.key}
      </span>
      <span className="text-sm leading-relaxed text-gray-800">
        <span className={cn('font-bold', row.correct ? 'text-green-700' : 'text-red-700')}>
          {row.correct ? 'Correct.' : 'Incorrect.'}
        </span>{' '}
        {row.why}
        {row.chosen && (
          <span className="ml-1.5 align-middle text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            your answer
          </span>
        )}
      </span>
    </li>
  )
}

/**
 * Feedback after an answer, in the order it is meant to be read: the learner's
 * own option first, then the correct one, then the key idea, with the options
 * they did not pick folded away. Questions imported before per-option text
 * existed show the key idea alone, exactly as they always have.
 */
export function AnswerExplanation({ question, selectedAnswer, expanded = false, className }: Props) {
  const [showRest, setShowRest] = useState(expanded)
  const rows = explanationRows(question, selectedAnswer)
  const keyIdea = question.explanation?.trim()

  if (rows.length === 0) {
    return keyIdea ? <p className={cn('text-sm leading-relaxed text-gray-700', className)}>{keyIdea}</p> : null
  }

  const { lead, rest } = splitExplanationRows(rows)

  return (
    <div className={cn('space-y-3', className)}>
      <ul className="space-y-2">
        {lead.map((row) => <OptionRow key={row.key} row={row} />)}
      </ul>

      {keyIdea && (
        <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700 mb-1">Key idea</p>
          <p className="text-sm leading-relaxed text-blue-950">{keyIdea}</p>
        </div>
      )}

      {rest.length > 0 && (
        <div>
          {!expanded && (
            <button
              type="button"
              onClick={() => setShowRest((v) => !v)}
              className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              <ChevronDown className={cn('h-4 w-4 transition-transform', showRest && 'rotate-180')} />
              {showRest ? 'Hide the other options' : `Why the other ${rest.length === 1 ? 'option is' : 'options are'} wrong`}
            </button>
          )}
          {showRest && (
            <ul className="space-y-2 mt-2">
              {rest.map((row) => <OptionRow key={row.key} row={row} />)}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

/** The verdict line that sits above the explanation during a sitting. */
export function AnswerVerdict({ isCorrect, correctAnswer }: { isCorrect: boolean; correctAnswer: string }) {
  const letters = answerLetters(correctAnswer)
  return (
    <div className="flex flex-wrap items-center gap-2">
      {isCorrect ? (
        <>
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <span className="font-semibold text-green-800">Correct!</span>
        </>
      ) : (
        <>
          <XCircle className="h-5 w-5 text-red-600" />
          <span className="font-semibold text-red-800">Incorrect</span>
          <span className="text-sm text-red-700">
            — Correct answer: <strong>{letters.join(' and ')}</strong>
          </span>
        </>
      )}
    </div>
  )
}
