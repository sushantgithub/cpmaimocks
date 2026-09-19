import { auth } from '@/lib/auth'
import { listQuizzes } from '@/lib/quizzes'
import { QuizzesClient } from '@/components/dashboard/quizzes-client'

export const dynamic = 'force-dynamic'

export default async function QuizzesPage() {
  const session = await auth()
  const quizzes = await listQuizzes(session!.user.id)
  const multiCert = new Set(quizzes.map((q) => q.certificationId)).size > 1

  return <QuizzesClient quizzes={quizzes} showCertification={multiCert} />
}
