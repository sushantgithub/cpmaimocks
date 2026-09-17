import { PrismaClient } from '@prisma/client'
import { seedDatabase } from '../src/lib/seed'

const prisma = new PrismaClient()

seedDatabase(prisma)
  .then((created) => {
    for (const item of created) console.log(`✅ ${item}`)
    console.log('🎉 Seeding complete!')
  })
  .catch(console.error)
  .finally(() => prisma.$disconnect())
