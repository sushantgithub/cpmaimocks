import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { assertSafeStagingEnvironment } from '@/lib/environment-safety'

assertSafeStagingEnvironment()

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

const adapter = new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL }))

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
