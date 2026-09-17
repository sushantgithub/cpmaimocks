import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
    } & DefaultSession['user']
  }
}

export type UserRole = 'USER' | 'ADMIN'

export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PENDING' | 'TRIAL'

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'CANCELLED'

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD'

export type QuestionStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export type ExamStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export type AttemptStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED'

export interface QuestionOption {
  key: string
  text: string
}

export interface ExamQuestion {
  id: string
  questionId: string
  text: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  difficulty: Difficulty
  category?: string
  topic?: string
}

export interface ExamResult {
  attemptId: string
  score: number
  correctCount: number
  incorrectCount: number
  unansweredCount: number
  totalQuestions: number
  timeTakenSeconds: number
  passingScore: number
  passed: boolean
}

export interface PracticeConfig {
  questionCount: number
  certificationId?: string
  difficulty?: Difficulty[]
  categoryIds?: string[]
  topicIds?: string[]
  mode: 'RANDOM' | 'INCORRECT' | 'BOOKMARKED'
}

export interface NavItem {
  label: string
  href: string
  icon?: string
}
