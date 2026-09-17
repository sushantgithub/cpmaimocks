-- CPMAI Exam Platform — run this once in Supabase SQL Editor

-- Enums
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING', 'TRIAL');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'CANCELLED');
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');
CREATE TYPE "QuestionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "ExamStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- User
CREATE TABLE "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "emailVerified" TIMESTAMP(3),
  "name" TEXT,
  "image" TEXT,
  "passwordHash" TEXT,
  "role" "Role" NOT NULL DEFAULT 'USER',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "deletionRequested" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "User_email_idx" ON "User"("email");

-- Account (OAuth)
CREATE TABLE "Account" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  UNIQUE("provider", "providerAccountId")
);

-- Session
CREATE TABLE "Session" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sessionToken" TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "expires" TIMESTAMP(3) NOT NULL
);

-- VerificationToken
CREATE TABLE "VerificationToken" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "expires" TIMESTAMP(3) NOT NULL,
  UNIQUE("identifier", "token")
);

-- EmailVerification
CREATE TABLE "EmailVerification" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "token" TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "used" BOOLEAN NOT NULL DEFAULT false
);

-- PasswordReset
CREATE TABLE "PasswordReset" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "token" TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "used" BOOLEAN NOT NULL DEFAULT false
);

-- SubscriptionPlan
CREATE TABLE "SubscriptionPlan" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "price" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "durationDays" INTEGER NOT NULL,
  "features" JSONB NOT NULL DEFAULT '[]',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "trialDays" INTEGER NOT NULL DEFAULT 0,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Subscription
CREATE TABLE "Subscription" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id"),
  "planId" TEXT NOT NULL REFERENCES "SubscriptionPlan"("id"),
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "trialEndsAt" TIMESTAMP(3),
  "autoRenew" BOOLEAN NOT NULL DEFAULT false,
  "cancelledAt" TIMESTAMP(3),
  "cancellationReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Subscription_userId_status_idx" ON "Subscription"("userId", "status");

-- Coupon
CREATE TABLE "Coupon" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "discountType" TEXT NOT NULL,
  "discountValue" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "minPurchase" DOUBLE PRECISION,
  "maxRedemptions" INTEGER,
  "currentRedemptions" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "applicablePlans" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CouponRedemption
CREATE TABLE "CouponRedemption" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "couponId" TEXT NOT NULL REFERENCES "Coupon"("id"),
  "userId" TEXT NOT NULL REFERENCES "User"("id"),
  "paymentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Payment
CREATE TABLE "Payment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id"),
  "subscriptionId" TEXT REFERENCES "Subscription"("id"),
  "planId" TEXT REFERENCES "SubscriptionPlan"("id"),
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "provider" TEXT NOT NULL DEFAULT 'razorpay',
  "providerPaymentId" TEXT,
  "providerOrderId" TEXT,
  "providerSignature" TEXT,
  "couponId" TEXT REFERENCES "Coupon"("id"),
  "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "failureReason" TEXT,
  "refundedAt" TIMESTAMP(3),
  "refundAmount" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Payment_userId_status_idx" ON "Payment"("userId", "status");
CREATE INDEX "Payment_providerPaymentId_idx" ON "Payment"("providerPaymentId");
CREATE INDEX "Payment_providerOrderId_idx" ON "Payment"("providerOrderId");

-- Category
CREATE TABLE "Category" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "slug" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Topic
CREATE TABLE "Topic" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL REFERENCES "Category"("id"),
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("slug", "categoryId")
);

-- Question
CREATE TABLE "Question" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "questionId" TEXT NOT NULL UNIQUE,
  "text" TEXT NOT NULL,
  "optionA" TEXT NOT NULL,
  "optionB" TEXT NOT NULL,
  "optionC" TEXT NOT NULL,
  "optionD" TEXT NOT NULL,
  "correctAnswer" TEXT NOT NULL,
  "explanation" TEXT NOT NULL,
  "categoryId" TEXT REFERENCES "Category"("id"),
  "topicId" TEXT REFERENCES "Topic"("id"),
  "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
  "status" "QuestionStatus" NOT NULL DEFAULT 'DRAFT',
  "source" TEXT,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Question_categoryId_difficulty_status_idx" ON "Question"("categoryId", "difficulty", "status");
CREATE INDEX "Question_status_idx" ON "Question"("status");

-- MockExam
CREATE TABLE "MockExam" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "questionCount" INTEGER NOT NULL,
  "timeLimitMinutes" INTEGER NOT NULL,
  "passingScore" INTEGER NOT NULL DEFAULT 70,
  "status" "ExamStatus" NOT NULL DEFAULT 'DRAFT',
  "randomizeQuestions" BOOLEAN NOT NULL DEFAULT true,
  "showExplanations" BOOLEAN NOT NULL DEFAULT true,
  "requireSubscription" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- MockExamQuestion
CREATE TABLE "MockExamQuestion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "examId" TEXT NOT NULL REFERENCES "MockExam"("id") ON DELETE CASCADE,
  "questionId" TEXT NOT NULL REFERENCES "Question"("id"),
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  UNIQUE("examId", "questionId")
);

-- ExamAttempt
CREATE TABLE "ExamAttempt" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id"),
  "examId" TEXT REFERENCES "MockExam"("id"),
  "mode" TEXT NOT NULL DEFAULT 'EXAM',
  "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submittedAt" TIMESTAMP(3),
  "timeTakenSeconds" INTEGER,
  "score" DOUBLE PRECISION,
  "correctCount" INTEGER,
  "incorrectCount" INTEGER,
  "unansweredCount" INTEGER,
  "totalQuestions" INTEGER NOT NULL,
  "practiceConfig" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ExamAttempt_userId_status_idx" ON "ExamAttempt"("userId", "status");
CREATE INDEX "ExamAttempt_userId_examId_idx" ON "ExamAttempt"("userId", "examId");

-- ExamAnswer
CREATE TABLE "ExamAnswer" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "attemptId" TEXT NOT NULL REFERENCES "ExamAttempt"("id") ON DELETE CASCADE,
  "questionId" TEXT NOT NULL REFERENCES "Question"("id"),
  "selectedAnswer" TEXT,
  "isCorrect" BOOLEAN,
  "isMarked" BOOLEAN NOT NULL DEFAULT false,
  "timeTakenSeconds" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("attemptId", "questionId")
);

-- Bookmark
CREATE TABLE "Bookmark" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "questionId" TEXT NOT NULL REFERENCES "Question"("id"),
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("userId", "questionId")
);

-- SiteSettings
CREATE TABLE "SiteSettings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "key" TEXT NOT NULL UNIQUE,
  "value" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- BlogPost
CREATE TABLE "BlogPost" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "excerpt" TEXT,
  "content" TEXT NOT NULL,
  "coverImage" TEXT,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "publishedAt" TIMESTAMP(3),
  "author" TEXT,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- AnalyticsEvent
CREATE TABLE "AnalyticsEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "event" TEXT NOT NULL,
  "userId" TEXT,
  "metadata" JSONB,
  "ip" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AnalyticsEvent_event_createdAt_idx" ON "AnalyticsEvent"("event", "createdAt");
CREATE INDEX "AnalyticsEvent_userId_idx" ON "AnalyticsEvent"("userId");

-- _prisma_migrations (required by Prisma)
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  "id" VARCHAR(36) NOT NULL PRIMARY KEY,
  "checksum" VARCHAR(64) NOT NULL,
  "finished_at" TIMESTAMPTZ,
  "migration_name" VARCHAR(255) NOT NULL,
  "logs" TEXT,
  "rolled_back_at" TIMESTAMPTZ,
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "applied_steps_count" INTEGER NOT NULL DEFAULT 0
);
