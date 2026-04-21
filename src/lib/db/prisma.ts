import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

const databaseUrl = normalizeDatabaseUrl(
  process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5432/pekopeko?schema=public',
);

const adapter = new PrismaPg({
  connectionString: databaseUrl,
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

function normalizeDatabaseUrl(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    if (url.searchParams.get('sslmode') === 'require' && !url.searchParams.has('uselibpqcompat')) {
      // `pg` currently aliases `require` to `verify-full` and warns about the upcoming change.
      // Be explicit about the current behavior so runtime tests stay quiet and semantics unchanged.
      url.searchParams.set('sslmode', 'verify-full');
    }
    return url.toString();
  } catch {
    return connectionString;
  }
}
