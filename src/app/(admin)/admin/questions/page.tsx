import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Upload } from 'lucide-react'
import { QuestionsTable } from '@/components/admin/questions-table'
import { TestQuestionsBanner } from '@/components/admin/test-questions-banner'
import { QuestionBankFilters } from '@/components/admin/question-bank-filters'
import {
  buildQuestionBankPageHref,
  buildQuestionBankWhere,
  type QuestionBankSearchParams,
} from '@/lib/admin-question-filters'

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: QuestionBankSearchParams
}) {
  const requestedPage = Number(searchParams.page ?? 1)
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const pageSize = 20
  const skip = (page - 1) * pageSize
  const where = buildQuestionBankWhere(searchParams)

  const [questions, total, certifications, testCount] = await Promise.all([
    prisma.question.findMany({
      where,
      include: {
        category: { select: { name: true } },
        topic: { select: { name: true } },
        certification: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.question.count({ where }),
    prisma.certification.findMany({
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, _count: { select: { questions: true } } },
    }),
    prisma.question.count({ where: { isTest: true } }),
  ])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Question Bank</h1>
          <p className="text-sm text-gray-500">{total} questions total</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/questions/import"><Upload className="h-4 w-4 mr-1" />Import CSV</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/questions/new"><Plus className="h-4 w-4 mr-1" />Add Question</Link>
          </Button>
        </div>
      </div>

      <QuestionBankFilters
        searchParams={searchParams}
        certifications={certifications}
      />

      {testCount > 0 && <TestQuestionsBanner count={testCount} />}

      <Card>
        <CardContent className="p-0 sm:p-3">
          <QuestionsTable questions={questions} />
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-gray-500">
            Showing {skip + 1}–{Math.min(skip + pageSize, total)} of {total}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={buildQuestionBankPageHref(searchParams, page - 1)}
                className="px-3 py-1.5 border rounded-lg hover:bg-gray-50"
              >
                ← Prev
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={buildQuestionBankPageHref(searchParams, page + 1)}
                className="px-3 py-1.5 border rounded-lg hover:bg-gray-50"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
