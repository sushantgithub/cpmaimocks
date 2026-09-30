import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireAdminSession } from '@/lib/require-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { ArrowLeft, ListChecks, HelpCircle, Trophy, Target } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CandidateReportPage({ params }: Props) {
  await requireAdminSession()
  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, createdAt: true, role: true, isActive: true },
  })
  if (!user) notFound()

  const [quizAttemptCount, answeredCount, mockAttempts] = await Promise.all([
    prisma.examAttempt.count({ where: { userId: id, mode: 'QUIZ' } }),
    prisma.examAnswer.count({
      where: { attempt: { userId: id }, selectedAnswer: { not: null }, question: { isTest: false } },
    }),
    prisma.examAttempt.findMany({
      where: { userId: id, mode: 'EXAM' },
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        status: true,
        score: true,
        correctCount: true,
        incorrectCount: true,
        unansweredCount: true,
        totalQuestions: true,
        startedAt: true,
        submittedAt: true,
        exam: { select: { title: true, passingScore: true } },
      },
    }),
  ])

  const completedMocks = mockAttempts.filter((a) => a.status === 'COMPLETED' && a.score !== null)
  const avgScore = completedMocks.length > 0
    ? Math.round(completedMocks.reduce((sum, a) => sum + (a.score ?? 0), 0) / completedMocks.length)
    : null
  const bestScore = completedMocks.length > 0
    ? Math.round(Math.max(...completedMocks.map((a) => a.score ?? 0)))
    : null

  const statCards = [
    { icon: ListChecks, label: 'Quizzes Attempted', value: quizAttemptCount, color: 'text-blue-600' },
    { icon: HelpCircle, label: 'Questions Answered', value: answeredCount, color: 'text-purple-600' },
    { icon: Trophy, label: 'Mocks Attempted', value: mockAttempts.length, color: 'text-yellow-600' },
    {
      icon: Target,
      label: 'Avg Mock Score',
      value: avgScore !== null ? `${avgScore}%` : '—',
      sub: bestScore !== null ? `Best ${bestScore}%` : 'No completed mocks yet',
      color: 'text-green-600',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/users"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link>
        </Button>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{user.name ?? user.email}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {user.email} · Joined {formatDate(new Date(user.createdAt))}
          </p>
        </div>
        <div className="flex gap-1.5">
          {user.role === 'ADMIN' && <Badge variant="secondary" className="text-xs">Admin</Badge>}
          <Badge variant={user.isActive ? 'success' : 'secondary'} className="text-xs">
            {user.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <s.icon className={`h-5 w-5 ${s.color} mb-2`} />
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-sm font-medium text-gray-700">{s.label}</p>
              {s.sub && <p className="text-xs text-gray-500 mt-0.5">{s.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Mock Exam Attempts</CardTitle></CardHeader>
        <CardContent>
          {mockAttempts.length === 0 ? (
            <p className="text-sm text-gray-500">No mock exam attempts yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium text-gray-600">Exam</th>
                    <th className="text-left py-2 pr-4 font-medium text-gray-600">Status</th>
                    <th className="text-left py-2 pr-4 font-medium text-gray-600">Score</th>
                    <th className="text-left py-2 pr-4 font-medium text-gray-600">Correct / Incorrect / Unanswered</th>
                    <th className="text-left py-2 font-medium text-gray-600">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {mockAttempts.map((a) => {
                    const passed = a.score !== null && a.exam ? a.score >= a.exam.passingScore : null
                    return (
                      <tr key={a.id} className="border-b last:border-0">
                        <td className="py-2 pr-4 text-gray-900">{a.exam?.title ?? 'Deleted exam'}</td>
                        <td className="py-2 pr-4">
                          <Badge variant={a.status === 'COMPLETED' ? 'success' : a.status === 'ABANDONED' ? 'secondary' : 'outline'} className="text-xs">
                            {a.status}
                          </Badge>
                        </td>
                        <td className="py-2 pr-4">
                          {a.score !== null ? (
                            <span className={passed ? 'text-green-700 font-semibold' : 'text-red-600 font-semibold'}>
                              {Math.round(a.score)}%
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-2 pr-4 text-gray-600">
                          {a.correctCount ?? '—'} / {a.incorrectCount ?? '—'} / {a.unansweredCount ?? '—'}
                        </td>
                        <td className="py-2 text-gray-600">{formatDate(new Date(a.startedAt))}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
