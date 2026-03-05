"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { signInWithEmail, signInWithGoogle } from "@/lib/firebase"

const SESSION_ENDPOINT = "/api/auth/session"

async function createServerSession(token: string) {
  const response = await fetch(SESSION_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.error ?? "Unable to create session")
  }
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    setErrorMessage(null)
    setIsLoading(true)

    try {
      const credential = await signInWithGoogle()
      const idToken = await credential.user.getIdToken()
      await createServerSession(idToken)
      router.push("/dashboard")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to sign in with Google")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!email || !password) {
      setErrorMessage("Enter both an email and password")
      return
    }

    setErrorMessage(null)
    setIsLoading(true)

    try {
      const credential = await signInWithEmail(email, password)
      const idToken = await credential.user.getIdToken()
      await createServerSession(idToken)
      router.push("/dashboard")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to sign in with email")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <div className="h-[400px] w-[600px] rounded-full bg-primary/3 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-sm animate-fade-up">
        <div className="rounded-xl border border-border/50 bg-card/60 p-8 backdrop-blur-xl glow-red">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
              <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 21h18M3 7v14M21 7v14M6 7V3h4v4M14 7V3h4v4M9 21v-4h6v4" />
              </svg>
            </div>
            <h1 className="mt-4 font-mono text-sm font-semibold tracking-widest uppercase text-foreground">
              CodeCity
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">Sign in to visualize your codebase</p>
          </div>

          <div className="mt-8 space-y-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-border/50 bg-white/5 px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-white/10 hover:border-border disabled:opacity-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.70 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {isLoading ? "Signing in…" : "Sign in with Google"}
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="font-mono text-[10px] tracking-wider text-muted-foreground/40">SECURE · OAUTH 2.0</p>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleEmailSignIn}>
            <label className="flex flex-col text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Email
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 rounded-lg border border-border/50 bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                placeholder="you@example.com"
              />
            </label>

            <label className="flex flex-col text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 rounded-lg border border-border/50 bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                placeholder="••••••••"
              />
            </label>

            {errorMessage ? (
              <p className="text-xs text-red-400">{errorMessage}</p>
            ) : null}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg border border-border/50 bg-primary/30 px-4 py-2 text-sm font-semibold uppercase tracking-widest text-primary transition-all hover:bg-primary/40 disabled:opacity-50"
            >
              {isLoading ? "Signing in…" : "Sign in with email"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
