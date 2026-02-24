import NextAuth, { type DefaultSession } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@codecity/db"
import authConfig from "./auth.config"

declare module "next-auth" {
  interface User {
    role?: "USER" | "ADMIN"
  }
  interface Session {
    user: {
      id: string
      role: "USER" | "ADMIN"
    } & DefaultSession["user"]
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id
        // Fetch role from database
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        })
        token.role = dbUser?.role ?? "USER"
      }
      return token
    },
    session({ session, token }: any) {
      if (token) {
        session.user.id = token.id
        session.user.role = token.role ?? "USER"
      }
      return session
    },
  },
  events: {
    async createUser({ user }) {
      // Auto-promote first user or ADMIN_EMAIL to admin
      const adminEmail = process.env.ADMIN_EMAIL
      if (adminEmail && user.email === adminEmail) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: "ADMIN" },
        })
      } else {
        const userCount = await prisma.user.count()
        if (userCount === 1) {
          await prisma.user.update({
            where: { id: user.id },
            data: { role: "ADMIN" },
          })
        }
      }
    },
  },
  ...authConfig,
})
