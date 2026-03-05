import NextAuth, { type DefaultSession } from "next-auth"
import authConfig from "./auth.config"

declare module "next-auth" {
  interface User { role?: "USER" | "ADMIN" }
  interface Session { user: { id: string; role: "USER" | "ADMIN" } & DefaultSession["user"] }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id
        token.role = "USER" // Default role for now
      }
      return token
    },
    session({ session, token }: any) {
      if (token) { session.user.id = token.id; session.user.role = token.role ?? "USER" }
      return session
    },
  },
  ...authConfig,
})
