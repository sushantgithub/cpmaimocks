import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  const { secret } = await req.json()
  if (secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@cpmaiprep.com'
    const adminPassword = process.env.ADMIN_PASSWORD ?? 'changeme123!'

    const existing = await prisma.user.findUnique({ where: { email: adminEmail } })
    if (!existing) {
      await prisma.user.create({
        data: {
          email: adminEmail,
          name: 'Admin',
          passwordHash: await bcrypt.hash(adminPassword, 12),
          role: 'ADMIN',
          emailVerified: new Date(),
        },
      })
    }

    const plans = [
      { name: 'Free', slug: 'free', description: 'Get started with sample questions', price: 0, currency: 'INR', durationDays: 36500, features: ['20 sample practice questions', '1 mini mock exam', 'Basic performance stats'], isActive: true, isFeatured: false, sortOrder: 0 },
      { name: 'Monthly', slug: 'monthly', description: 'Full access for 30 days', price: 499, currency: 'INR', durationDays: 30, features: ['All 500+ questions', 'All mock exams', 'Detailed explanations', 'Performance analytics', 'Bookmark questions'], isActive: true, isFeatured: false, sortOrder: 1 },
      { name: 'Quarterly', slug: 'quarterly', description: 'Best value – 3 months full access', price: 999, currency: 'INR', durationDays: 90, features: ['All 500+ questions', 'All mock exams', 'Detailed explanations', 'Performance analytics', 'Bookmark questions', 'Priority support'], isActive: true, isFeatured: true, sortOrder: 2 },
      { name: 'Annual', slug: 'annual', description: 'Full year access at lowest price', price: 1999, currency: 'INR', durationDays: 365, features: ['All 500+ questions', 'All mock exams', 'Detailed explanations', 'Performance analytics', 'Bookmark questions', 'Priority support', 'Exam updates included'], isActive: true, isFeatured: false, sortOrder: 3 },
    ]

    for (const plan of plans) {
      await prisma.subscriptionPlan.upsert({
        where: { slug: plan.slug },
        update: {},
        create: { ...plan, features: plan.features },
      })
    }

    const categories = [
      { name: 'Project Lifecycle', slug: 'project-lifecycle' },
      { name: 'Agile Methodology', slug: 'agile-methodology' },
      { name: 'Project Planning', slug: 'project-planning' },
      { name: 'Risk Management', slug: 'risk-management' },
      { name: 'Stakeholder Management', slug: 'stakeholder-management' },
      { name: 'Business Analysis', slug: 'business-analysis' },
    ]

    for (const cat of categories) {
      await prisma.category.upsert({ where: { slug: cat.slug }, update: {}, create: cat })
    }

    return NextResponse.json({ success: true, message: 'Database seeded successfully' })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
