import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { seedDatabase } from '../src/lib/seed'

const adapter = new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL }))
const prisma = new PrismaClient({ adapter })

seedDatabase(prisma)
  .then((created) => {
    for (const item of created) console.log(`✅ ${item}`)
    console.log('🎉 Seeding complete!')
  })
  .catch(console.error)
  .finally(() => prisma.$disconnect())
