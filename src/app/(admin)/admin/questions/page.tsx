import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Upload, Search } from 'lucide-react'
import { QuestionActions } from '@/components/admin/question-actions'

interface SearchParams { search?: string; status?: string; difficulty?: string; page?: string }

export default async function QuestionsPage({ searchParams }: { searchParams: SearchParams }) {
  const page = Number(searchParams.page ?? 1)
  const pageSize = 20
  const skip = (page - 1) * pageSize

  const where: Record<string, unknown> = {}
  if (searchParams.search) {
    where.OR = [
      { text: { contains: searchParams.search, mode: 'insensitive' } },
      { questionId: { contains: searchParams.search, mode: 'insensitive' } },
    ]
  }
  if (searchParams.status) where.status = searchParams.status
  if (searchParams.difficulty) where.difficulty = searchParams.difficulty

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      include: { category: { select: { name: true } }, topic: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.question.count({ where }),
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

      {/* Filters */}
      <form className="flex gap-2 flex-wrap">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-gray-400" />
          <input
            name="search"
            defaultValue={searchParams.search}
            placeholder="Search questions..."
            className="pl-8 pr-3 py-2 border rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select name="status" defaultValue={searchParams.status} className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
          <option value="">All Status</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <select name="difficulty" defaultValue={searchParams.difficulty} className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
          <option value="">All Difficulty</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>
        <Button type="submit" variant="secondary" size="sm">Filter</Button>
      </form>

      {/* Questions table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Question</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Difficulty</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {questions.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No questions found. <Link href="/admin/questions/import" className="text-primary hover:underline">Import some →</Link></td></tr>
                )}
                {questions.map((q) => (
                  <tr key={q.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{q.questionId}</td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="truncate" title={q.text}>{q.text}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Correct: {q.correctAnswer}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{q.category?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={q.difficulty === 'HARD' ? 'destructive' : q.difficulty === 'MEDIUM' ? 'warning' : 'success'} className="text-xs capitalize">
                        {q.difficulty.toLowerCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={q.status === 'PUBLISHED' ? 'success' : q.status === 'DRAFT' ? 'secondary' : 'outline'} className="text-xs capitalize">
                        {q.status.toLowerCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <QuestionActions questionId={q.id} status={q.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-gray-500">Showing {skip + 1}–{Math.min(skip + pageSize, total)} of {total}</p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`?page=${page - 1}`} className="px-3 py-1.5 border rounded-lg hover:bg-gray-50">← Prev</Link>
            )}
            {page < totalPages && (
              <Link href={`?page=${page + 1}`} className="px-3 py-1.5 border rounded-lg hover:bg-gray-50">Next →</Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
