'use client'

import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { QuestionBankSearchParams } from '@/lib/admin-question-filters'

interface CertificationFilterOption {
  id: string
  name: string
  _count: { questions: number }
}

interface ContentSetFilterOption {
  value: string
  label: string
  count: number
}

export function QuestionBankFilters({
  searchParams,
  certifications,
  contentSets,
}: {
  searchParams: QuestionBankSearchParams
  certifications: CertificationFilterOption[]
  contentSets: ContentSetFilterOption[]
}) {
  const contentType = searchParams.contentType?.toUpperCase()

  function submitSelect(event: React.ChangeEvent<HTMLSelectElement>) {
    event.currentTarget.form?.requestSubmit()
  }

  function clearContentSetAndSubmit(event: React.ChangeEvent<HTMLSelectElement>) {
    const form = event.currentTarget.form
    const contentSet = form?.elements.namedItem('contentSet')
    if (contentSet instanceof HTMLSelectElement) contentSet.value = ''
    form?.requestSubmit()
  }

  const showContentSet = contentType === 'MOCK_EXAM' || contentType === 'QUIZ'
  const contentSetLabel = contentType === 'MOCK_EXAM' ? 'Mock Exam' : 'Quiz Set'
  const allContentSetsLabel = contentType === 'MOCK_EXAM' ? 'All Mock Exams' : 'All Quiz Sets'

  return (
    <form action="/admin/questions" method="get" className="flex gap-2 flex-wrap">
      <div className="relative">
        <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-gray-400" />
        <input
          name="search"
          defaultValue={searchParams.search}
          placeholder="Search questions..."
          className="pl-8 pr-3 py-2 border rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {certifications.length > 1 && (
        <select
          name="certification"
          defaultValue={searchParams.certification}
          onChange={clearContentSetAndSubmit}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Certifications</option>
          {certifications.map((certification) => (
            <option key={certification.id} value={certification.id}>
              {certification.name} ({certification._count.questions})
            </option>
          ))}
        </select>
      )}

      <select
        name="contentType"
        defaultValue={searchParams.contentType}
        onChange={clearContentSetAndSubmit}
        className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">All Content Types</option>
        <option value="QUIZ">Quiz</option>
        <option value="MOCK_EXAM">Mock Exam</option>
        <option value="PRACTICE_ONLY">Practice Only</option>
      </select>

      {showContentSet && (
        <select
          name="contentSet"
          aria-label={contentSetLabel}
          defaultValue={searchParams.contentSet}
          onChange={submitSelect}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">{allContentSetsLabel}</option>
          {contentSets.map((set) => (
            <option key={set.value} value={set.value}>
              {set.label} ({set.count})
            </option>
          ))}
        </select>
      )}

      <select
        name="status"
        defaultValue={searchParams.status}
        onChange={submitSelect}
        className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">All Status</option>
        <option value="PUBLISHED">Published</option>
        <option value="DRAFT">Draft</option>
        <option value="ARCHIVED">Archived</option>
      </select>

      <select
        name="isTest"
        defaultValue={searchParams.isTest}
        onChange={submitSelect}
        className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">All questions</option>
        <option value="exclude">Real questions only</option>
        <option value="only">Test questions only</option>
      </select>

      <select
        name="difficulty"
        defaultValue={searchParams.difficulty}
        onChange={submitSelect}
        className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">All Difficulty</option>
        <option value="EASY">Easy</option>
        <option value="MEDIUM">Medium</option>
        <option value="HARD">Hard</option>
      </select>

      <Button type="submit" variant="secondary" size="sm">Filter</Button>
    </form>
  )
}
