import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import type { NextAuthConfig } from "next-auth"

export default {
  providers: [
    GitHub({ clientId: process.env.AUTH_GITHUB_ID, clientSecret: process.env.AUTH_GITHUB_SECRET }),
    Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET }),
  ],
  debug: process.env.NODE_ENV === "development",
} satisfies NextAuthConfig
