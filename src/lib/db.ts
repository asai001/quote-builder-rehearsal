import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// アプリからの接続はプール経由（DATABASE_URL_POOLED）を使う。
// 手元で動かすときなど、プール用の値が無い場合だけ DATABASE_URL を使う。
function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL_POOLED ?? process.env.DATABASE_URL;
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
