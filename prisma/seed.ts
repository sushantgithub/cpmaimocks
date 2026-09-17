import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Admin user
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@cpmaiprep.com'
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'changeme123!'

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Admin',
        passwordHash: await bcrypt.hash(adminPassword, 12),
        role: 'ADMIN',
        emailVerified: new Date(),
      },
    })
    console.log(`✅ Admin created: ${adminEmail}`)
  }

  // Subscription plans
  const plans = [
    {
      name: 'Free',
      slug: 'free',
      description: 'Get started with sample questions',
      price: 0,
      currency: 'INR',
      durationDays: 36500,
      features: ['20 sample practice questions', '1 mini mock exam', 'Basic performance stats'],
      isActive: true,
      isFeatured: false,
      sortOrder: 0,
    },
    {
      name: 'Monthly',
      slug: 'monthly',
      description: 'Full access for one month',
      price: 499,
      currency: 'INR',
      durationDays: 30,
      features: [
        'All 5 full mock exams (120 questions each)',
        'Unlimited practice mode',
        'All CPMAI domains covered',
        'Detailed explanations for every question',
        'Domain & topic performance analytics',
        'Bookmark & review questions',
        'Practice My Mistakes mode',
        'Mobile optimised',
      ],
      isActive: true,
      isFeatured: false,
      sortOrder: 1,
    },
    {
      name: 'Quarterly',
      slug: 'quarterly',
      description: '3 months — save vs monthly',
      price: 999,
      currency: 'INR',
      durationDays: 90,
      features: [
        'Everything in Monthly',
        '3 months access',
        'Save ₹498 vs monthly',
      ],
      isActive: true,
      isFeatured: true,
      sortOrder: 2,
    },
    {
      name: 'Annual',
      slug: 'annual',
      description: 'Best value — full year access',
      price: 2999,
      currency: 'INR',
      durationDays: 365,
      features: [
        'Everything in Monthly',
        'Full year access',
        'Best value — save 50%',
      ],
      isActive: true,
      isFeatured: false,
      sortOrder: 3,
    },
  ]

  for (const plan of plans) {
    const existing = await prisma.subscriptionPlan.findUnique({ where: { slug: plan.slug } })
    if (!existing) {
      await prisma.subscriptionPlan.create({ data: plan })
      console.log(`✅ Plan created: ${plan.name}`)
    }
  }

  // CPMAI domains/categories
  const domains = [
    'AI Strategy & Planning',
    'Data for AI',
    'Machine Learning Fundamentals',
    'Responsible AI & Ethics',
    'AI Governance',
    'Risk Management',
    'Model Evaluation',
    'AI Deployment',
    'Monitoring & Maintenance',
    'AI Project Management',
  ]

  for (let i = 0; i < domains.length; i++) {
    const slug = domains[i].toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const existing = await prisma.category.findUnique({ where: { slug } })
    if (!existing) {
      await prisma.category.create({ data: { name: domains[i], slug, sortOrder: i } })
      console.log(`✅ Category: ${domains[i]}`)
    }
  }

  // Sample mock exam
  const existingExam = await prisma.mockExam.findFirst({ where: { slug: 'cpmai-mock-exam-1' } })
  if (!existingExam) {
    await prisma.mockExam.create({
      data: {
        title: 'CPMAI Mock Exam 1',
        slug: 'cpmai-mock-exam-1',
        description: 'Full 120-question mock exam covering all CPMAI domains.',
        questionCount: 120,
        timeLimitMinutes: 180,
        passingScore: 70,
        status: 'PUBLISHED',
        randomizeQuestions: true,
        showExplanations: true,
        requireSubscription: false,
        sortOrder: 0,
      },
    })
    console.log('✅ Sample exam created')
  }

  // Welcome coupon
  const existingCoupon = await prisma.coupon.findUnique({ where: { code: 'WELCOME20' } })
  if (!existingCoupon) {
    await prisma.coupon.create({
      data: {
        code: 'WELCOME20',
        description: '20% off for new users',
        discountType: 'PERCENTAGE',
        discountValue: 20,
        isActive: true,
      },
    })
    console.log('✅ Coupon WELCOME20 created')
  }

  console.log('🎉 Seeding complete!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
