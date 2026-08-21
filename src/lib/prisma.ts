import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

// Reuse a single PrismaClient instance across module reloads in dev
// (Vite/tsx watch mode would otherwise open a new DB connection pool per reload).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
