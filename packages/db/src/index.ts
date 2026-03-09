// Re-export from the generated client inside apps/web
// This ensures the engine binary is co-located with the Next.js app
import { PrismaClient } from "../../../apps/web/src/generated/prisma"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

export * from "../../../apps/web/src/generated/prisma"
export type { PrismaClient } from "../../../apps/web/src/generated/prisma"
