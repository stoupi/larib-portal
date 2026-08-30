import { PrismaClient } from '@/app/generated/prisma';

const globalForPrisma = global as unknown as { prisma: PrismaClient; prismaBase: PrismaClient };

const basePrisma = globalForPrisma.prismaBase || new PrismaClient();

export const prisma = globalForPrisma.prisma || basePrisma;

// Reads the logbook and writes to it: going through the extended client would make
// the audit log audit itself.
export const prismaWithoutAudit = basePrisma;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaBase = basePrisma;
}
