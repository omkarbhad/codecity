# CodeCity V2 — Homepage, Dashboard, Admin & Auth Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the full CodeCity v2 monorepo with auth (Google + GitHub), hybrid homepage, public gallery + personal dashboard, and admin console.

**Architecture:** Turborepo monorepo with Next.js 15 App Router, Prisma + PostgreSQL for data, NextAuth v5 for auth, shadcn/ui + Tailwind CSS 4 for UI. Vertical slices — each feature built end-to-end (DB → API → UI).

**Tech Stack:** Next.js 15, TypeScript 5, Tailwind CSS 4, shadcn/ui, NextAuth v5, Prisma ORM, PostgreSQL, React Three Fiber, Zustand, Turborepo + pnpm

---

## Slice 1: Monorepo Foundation

### Task 1.1: Initialize Turborepo Monorepo

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `.env.example`

**Step 1: Create root package.json**

```json
{
  "name": "codecity",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check",
    "db:generate": "prisma generate --schema=./packages/db/prisma/schema.prisma",
    "db:push": "prisma db push --schema=./packages/db/prisma/schema.prisma",
    "db:migrate": "prisma migrate dev --schema=./packages/db/prisma/schema.prisma",
    "db:studio": "prisma studio --schema=./packages/db/prisma/schema.prisma",
    "postinstall": "prisma generate --schema=./packages/db/prisma/schema.prisma"
  },
  "devDependencies": {
    "turbo": "^2.8.10",
    "typescript": "^5.7.0",
    "prisma": "^6.0.0"
  },
  "packageManager": "pnpm@9.15.0"
}
```

**Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**Step 3: Create turbo.json**

```json
{
  "$schema": "https://turborepo.dev/schema.v2.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "lint": {},
    "type-check": {},
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

**Step 4: Create root tsconfig.json**

```json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleDetection": "force"
  }
}
```

**Step 5: Create .gitignore**

```
node_modules/
.next/
dist/
.turbo/
.env
.env.local
*.log
.DS_Store
packages/db/src/generated/
```

**Step 6: Create .env.example**

```
DATABASE_URL="postgresql://user:password@localhost:5432/codecity"
AUTH_SECRET=""
AUTH_GITHUB_ID=""
AUTH_GITHUB_SECRET=""
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
ADMIN_EMAIL=""
```

**Step 7: Commit**

```bash
git add package.json pnpm-workspace.yaml turbo.json tsconfig.json .gitignore .env.example
git commit -m "feat: initialize turborepo monorepo root"
```

---

### Task 1.2: Create packages/db (Prisma)

**Files:**
- Create: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`
- Create: `packages/db/prisma/schema.prisma`
- Create: `packages/db/src/index.ts`

**Step 1: Create packages/db/package.json**

```json
{
  "name": "@codecity/db",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "postinstall": "prisma generate"
  },
  "dependencies": {
    "@prisma/client": "^6.0.0"
  },
  "devDependencies": {
    "prisma": "^6.0.0",
    "typescript": "^5.7.0"
  }
}
```

**Step 2: Create packages/db/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

**Step 3: Create Prisma schema at packages/db/prisma/schema.prisma**

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

enum Role {
  USER
  ADMIN
}

enum Visibility {
  PUBLIC
  PRIVATE
}

enum AnalysisStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

// ── NextAuth Models ──

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  role          Role      @default(USER)

  accounts  Account[]
  sessions  Session[]
  projects  Project[]
  auditLogs AuditLog[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Account {
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@id([provider, providerAccountId])
}

model Session {
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model VerificationToken {
  identifier String
  token      String
  expires    DateTime

  @@id([identifier, token])
}

// ── Application Models ──

model Project {
  id           String         @id @default(cuid())
  name         String
  repoUrl      String
  visibility   Visibility     @default(PRIVATE)
  status       AnalysisStatus @default(PENDING)
  fileCount    Int            @default(0)
  lineCount    Int            @default(0)
  analysisData Json?
  thumbnailUrl String?
  error        String?

  userId    String
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  snapshots Snapshot[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@index([visibility])
}

model Snapshot {
  id   String @id @default(cuid())
  name String?
  data Json

  projectId String
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@index([projectId])
}

model PlatformSettings {
  key       String   @id
  value     Json
  updatedAt DateTime @updatedAt
}

model AuditLog {
  id         String @id @default(cuid())
  action     String
  targetType String
  targetId   String
  metadata   Json?

  adminId String
  admin   User   @relation(fields: [adminId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@index([adminId])
  @@index([targetType, targetId])
  @@index([createdAt])
}
```

**Step 4: Create packages/db/src/index.ts**

```typescript
import { PrismaClient } from "./generated/prisma"

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

export * from "./generated/prisma"
export type { PrismaClient } from "./generated/prisma"
```

**Step 5: Commit**

```bash
git add packages/db/
git commit -m "feat: add packages/db with Prisma schema"
```

---

### Task 1.3: Create packages/ui (Shared UI)

**Files:**
- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`
- Create: `packages/ui/src/lib/utils.ts`
- Create: `packages/ui/src/styles/globals.css`
- Create: `packages/ui/components.json`

**Step 1: Create packages/ui/package.json**

```json
{
  "name": "@codecity/ui",
  "version": "0.0.0",
  "private": true,
  "exports": {
    "./components/*": "./src/components/*.tsx",
    "./hooks/*": "./src/hooks/*.ts",
    "./lib/*": "./src/lib/*.ts",
    "./styles/*": "./src/styles/*.css"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0",
    "lucide-react": "^0.468.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.7.0",
    "tailwindcss": "^4.2.1"
  }
}
```

**Step 2: Create packages/ui/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "noEmit": true,
    "paths": {
      "@codecity/ui/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules"]
}
```

**Step 3: Create packages/ui/src/lib/utils.ts**

```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Step 4: Create packages/ui/src/styles/globals.css**

```css
@import "tailwindcss";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  --color-background: oklch(0.13 0.02 260);
  --color-foreground: oklch(0.97 0 0);
  --color-card: oklch(0.17 0.02 260);
  --color-card-foreground: oklch(0.97 0 0);
  --color-primary: oklch(0.65 0.2 250);
  --color-primary-foreground: oklch(0.98 0 0);
  --color-secondary: oklch(0.22 0.02 260);
  --color-secondary-foreground: oklch(0.97 0 0);
  --color-muted: oklch(0.22 0.02 260);
  --color-muted-foreground: oklch(0.65 0.02 260);
  --color-accent: oklch(0.22 0.02 260);
  --color-accent-foreground: oklch(0.97 0 0);
  --color-destructive: oklch(0.55 0.2 25);
  --color-destructive-foreground: oklch(0.97 0 0);
  --color-border: oklch(0.28 0.02 260);
  --color-input: oklch(0.28 0.02 260);
  --color-ring: oklch(0.65 0.2 250);

  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

**Step 5: Create packages/ui/components.json**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/styles/globals.css",
    "baseColor": "zinc",
    "cssVariables": true
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@codecity/ui/components",
    "utils": "@codecity/ui/lib/utils",
    "hooks": "@codecity/ui/hooks",
    "lib": "@codecity/ui/lib",
    "ui": "@codecity/ui/components"
  }
}
```

**Step 6: Commit**

```bash
git add packages/ui/
git commit -m "feat: add packages/ui with Tailwind v4 and shadcn config"
```

---

### Task 1.4: Create packages/core (Placeholder)

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/src/index.ts`

**Step 1: Create packages/core/package.json**

```json
{
  "name": "@codecity/core",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
```

**Step 2: Create packages/core/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

**Step 3: Create packages/core/src/index.ts**

```typescript
// CodeCity analysis engine — placeholder
export const VERSION = "2.0.0"
```

**Step 4: Commit**

```bash
git add packages/core/
git commit -m "feat: add packages/core placeholder"
```

---

### Task 1.5: Create apps/web (Next.js 15)

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/postcss.config.mjs`
- Create: `apps/web/components.json`
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/page.tsx`

**Step 1: Create apps/web/package.json**

```json
{
  "name": "@codecity/web",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack --port 3000",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^15.3.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@codecity/ui": "workspace:*",
    "@codecity/db": "workspace:*",
    "@codecity/core": "workspace:*",
    "next-auth": "5.0.0-beta.25",
    "@auth/prisma-adapter": "^2.8.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.7.0",
    "@tailwindcss/postcss": "^4.2.1",
    "tailwindcss": "^4.2.1",
    "postcss": "^8.5.0"
  }
}
```

**Step 2: Create apps/web/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "noEmit": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Step 3: Create apps/web/next.config.ts**

```typescript
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@codecity/ui", "@codecity/db", "@codecity/core"],
}

export default nextConfig
```

**Step 4: Create apps/web/postcss.config.mjs**

```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
}

export default config
```

**Step 5: Create apps/web/components.json**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "../../packages/ui/src/styles/globals.css",
    "baseColor": "zinc",
    "cssVariables": true
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "hooks": "@/hooks",
    "lib": "@/lib",
    "utils": "@codecity/ui/lib/utils",
    "ui": "@codecity/ui/components"
  }
}
```

**Step 6: Create apps/web/src/app/layout.tsx**

```tsx
import type { Metadata } from "next"
import "@codecity/ui/styles/globals.css"

export const metadata: Metadata = {
  title: "CodeCity — Visualize Your Codebase",
  description: "Transform any TypeScript repo into an interactive 3D city",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
```

**Step 7: Create apps/web/src/app/page.tsx**

```tsx
export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-4xl font-bold">CodeCity</h1>
    </main>
  )
}
```

**Step 8: Install dependencies and verify**

Run: `pnpm install`
Run: `pnpm dev`
Expected: Next.js dev server starts at http://localhost:3000, shows "CodeCity"

**Step 9: Commit**

```bash
git add apps/web/
git commit -m "feat: add apps/web Next.js 15 with Tailwind v4"
```

---

### Task 1.6: Add shadcn/ui Base Components

**Step 1: Install shadcn components into packages/ui**

Run from `packages/ui`:
```bash
npx shadcn@latest add button card input label badge avatar dropdown-menu separator tabs table dialog sheet toast
```

**Step 2: Verify import works from apps/web**

Update `apps/web/src/app/page.tsx` to import a Button and verify it renders.

**Step 3: Commit**

```bash
git add packages/ui/ apps/web/
git commit -m "feat: add shadcn base components to packages/ui"
```

---

## Slice 2: Authentication (NextAuth v5 + Google + GitHub)

### Task 2.1: Configure NextAuth

**Files:**
- Create: `apps/web/src/auth.config.ts`
- Create: `apps/web/src/auth.ts`
- Create: `apps/web/src/app/api/auth/[...nextauth]/route.ts`

**Step 1: Create apps/web/src/auth.config.ts (edge-safe)**

```typescript
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import type { NextAuthConfig } from "next-auth"

export default {
  providers: [GitHub, Google],
} satisfies NextAuthConfig
```

**Step 2: Create apps/web/src/auth.ts**

```typescript
import NextAuth, { type DefaultSession } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@codecity/db"
import authConfig from "./auth.config"

declare module "next-auth" {
  interface User {
    role: "USER" | "ADMIN"
  }
  interface Session {
    user: {
      id: string
      role: "USER" | "ADMIN"
    } & DefaultSession["user"]
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id
      session.user.role = (user as any).role
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
```

**Step 3: Create apps/web/src/app/api/auth/[...nextauth]/route.ts**

```typescript
import { handlers } from "@/auth"

export const { GET, POST } = handlers
```

**Step 4: Set up database and run migration**

Run: `pnpm db:generate`
Run: `pnpm db:push` (or `pnpm db:migrate` with a name)
Expected: Database tables created

**Step 5: Commit**

```bash
git add apps/web/src/auth.config.ts apps/web/src/auth.ts apps/web/src/app/api/auth/
git commit -m "feat: configure NextAuth v5 with Google + GitHub OAuth"
```

---

### Task 2.2: Auth Middleware

**Files:**
- Create: `apps/web/src/middleware.ts`

**Step 1: Create middleware**

```typescript
import NextAuth from "next-auth"
import authConfig from "./auth.config"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl

  // Protected routes
  if (pathname.startsWith("/dashboard") && !isLoggedIn) {
    return Response.redirect(new URL("/login", req.nextUrl))
  }
  if (pathname.startsWith("/admin") && !isLoggedIn) {
    return Response.redirect(new URL("/login", req.nextUrl))
  }

  // Redirect logged-in users away from login
  if (pathname === "/login" && isLoggedIn) {
    return Response.redirect(new URL("/dashboard", req.nextUrl))
  }
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
```

**Step 2: Commit**

```bash
git add apps/web/src/middleware.ts
git commit -m "feat: add auth middleware for route protection"
```

---

### Task 2.3: Session Provider + Login Page

**Files:**
- Create: `apps/web/src/app/providers.tsx`
- Modify: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/login/page.tsx`

**Step 1: Create providers.tsx**

```tsx
"use client"

import { SessionProvider } from "next-auth/react"

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
```

**Step 2: Update layout.tsx to wrap with Providers**

```tsx
import type { Metadata } from "next"
import "@codecity/ui/styles/globals.css"
import { Providers } from "./providers"

export const metadata: Metadata = {
  title: "CodeCity — Visualize Your Codebase",
  description: "Transform any TypeScript repo into an interactive 3D city",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

**Step 3: Create login page**

```tsx
import { signIn } from "@/auth"
import { Github } from "lucide-react"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto w-full max-w-sm space-y-6 rounded-xl border border-border bg-card p-8 shadow-lg">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">CodeCity</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to visualize your codebase
          </p>
        </div>

        <div className="space-y-3">
          <form
            action={async () => {
              "use server"
              await signIn("google", { redirectTo: "/dashboard" })
            }}
          >
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Sign in with Google
            </button>
          </form>

          <form
            action={async () => {
              "use server"
              await signIn("github", { redirectTo: "/dashboard" })
            }}
          >
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-3 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
            >
              <Github className="h-5 w-5" />
              Sign in with GitHub
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
```

**Step 4: Verify auth flow works end-to-end**

Run: `pnpm dev`
Navigate to `/login`, click a provider, verify redirect to `/dashboard` after auth.

**Step 5: Commit**

```bash
git add apps/web/src/app/providers.tsx apps/web/src/app/layout.tsx apps/web/src/app/login/
git commit -m "feat: add login page with Google + GitHub OAuth buttons"
```

---

## Slice 3: Homepage (Hybrid Landing)

### Task 3.1: Shared Navigation Component

**Files:**
- Create: `apps/web/src/components/layout/navbar.tsx`

**Step 1: Create navbar**

```tsx
import Link from "next/link"
import { auth } from "@/auth"

export async function Navbar() {
  const session = await auth()

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="text-xl font-bold tracking-tight">
          CodeCity
        </Link>

        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Explore
          </Link>

          {session?.user ? (
            <Link
              href="/dashboard"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/layout/
git commit -m "feat: add shared Navbar component"
```

---

### Task 3.2: Homepage Hero + Repo Input + Features

**Files:**
- Modify: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/components/home/hero-section.tsx`
- Create: `apps/web/src/components/home/repo-input.tsx`
- Create: `apps/web/src/components/home/feature-cards.tsx`
- Create: `apps/web/src/components/home/footer.tsx`

**Step 1: Create hero-section.tsx**

```tsx
export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-24 text-center">
      <div className="mx-auto max-w-4xl px-6">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          Visualize Your Codebase
          <br />
          <span className="text-primary">as a City</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Transform any TypeScript repository into an interactive 3D city.
          See dependencies as roads, functions as floors, and complexity as height.
        </p>
      </div>

      {/* 3D demo placeholder — will be replaced with R3F scene */}
      <div className="mx-auto mt-12 max-w-5xl px-6">
        <div className="aspect-video rounded-xl border border-border bg-card/50 flex items-center justify-center">
          <p className="text-muted-foreground">3D City Demo</p>
        </div>
      </div>
    </section>
  )
}
```

**Step 2: Create repo-input.tsx**

```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

const QUICK_PICKS = [
  { name: "zustand", url: "https://github.com/pmndrs/zustand" },
  { name: "tRPC", url: "https://github.com/trpc/trpc" },
  { name: "excalidraw", url: "https://github.com/excalidraw/excalidraw" },
  { name: "create-t3-app", url: "https://github.com/t3-oss/create-t3-app" },
]

export function RepoInput() {
  const [url, setUrl] = useState("")
  const router = useRouter()
  const { data: session } = useSession()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return

    if (!session) {
      router.push("/login")
      return
    }

    // TODO: Start analysis and redirect to city view
    router.push(`/dashboard?analyze=${encodeURIComponent(url)}`)
  }

  return (
    <section className="border-t border-border py-16">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <h2 className="text-2xl font-semibold">Try it now</h2>
        <form onSubmit={handleSubmit} className="mt-6 flex gap-3">
          <input
            type="url"
            placeholder="https://github.com/owner/repo"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Analyze
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-muted-foreground">Quick picks:</span>
          {QUICK_PICKS.map((pick) => (
            <button
              key={pick.name}
              onClick={() => setUrl(pick.url)}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {pick.name}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
```

**Step 3: Create feature-cards.tsx**

```tsx
import { Eye, BarChart3, MessageSquare } from "lucide-react"

const FEATURES = [
  {
    icon: Eye,
    title: "3D Visualization",
    description:
      "Navigate your codebase as a 3D city with buildings, districts, and roads representing files, folders, and dependencies.",
  },
  {
    icon: BarChart3,
    title: "Deep Analysis",
    description:
      "Detect complexity hotspots, unused code, circular dependencies, and architectural patterns at a glance.",
  },
  {
    icon: MessageSquare,
    title: "AI Chat",
    description:
      "Ask questions about your codebase with an AI agent that has full context of the visualization.",
  },
]

export function FeatureCards() {
  return (
    <section className="border-t border-border py-16">
      <div className="mx-auto grid max-w-5xl gap-8 px-6 md:grid-cols-3">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="rounded-xl border border-border bg-card p-6"
          >
            <feature.icon className="h-8 w-8 text-primary" />
            <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
```

**Step 4: Create footer.tsx**

```tsx
import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-border py-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
        <p className="text-sm text-muted-foreground">CodeCity</p>
        <div className="flex gap-6">
          <Link
            href="https://github.com"
            className="text-sm text-muted-foreground hover:text-foreground"
            target="_blank"
          >
            GitHub
          </Link>
        </div>
      </div>
    </footer>
  )
}
```

**Step 5: Assemble homepage in page.tsx**

```tsx
import { Navbar } from "@/components/layout/navbar"
import { HeroSection } from "@/components/home/hero-section"
import { RepoInput } from "@/components/home/repo-input"
import { FeatureCards } from "@/components/home/feature-cards"
import { Footer } from "@/components/home/footer"

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <RepoInput />
        <FeatureCards />
      </main>
      <Footer />
    </>
  )
}
```

**Step 6: Verify homepage renders**

Run: `pnpm dev`
Navigate to `/`, verify hero, repo input, feature cards, and footer appear.

**Step 7: Commit**

```bash
git add apps/web/src/components/home/ apps/web/src/app/page.tsx
git commit -m "feat: add hybrid homepage with hero, repo input, and feature cards"
```

---

## Slice 4: Dashboard (Public Gallery + Personal Projects)

### Task 4.1: Dashboard Layout with Tabs

**Files:**
- Create: `apps/web/src/app/dashboard/layout.tsx`
- Create: `apps/web/src/app/dashboard/page.tsx`

**Step 1: Create dashboard layout**

```tsx
import { Navbar } from "@/components/layout/navbar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
    </>
  )
}
```

**Step 2: Create dashboard page with tabs**

```tsx
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { ExploreTab } from "@/components/dashboard/explore-tab"
import { MyProjectsTab } from "@/components/dashboard/my-projects-tab"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const params = await searchParams
  const activeTab = params.tab ?? "projects"

  return (
    <div>
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="mt-6 flex gap-1 border-b border-border">
        <a
          href="/dashboard?tab=projects"
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "projects"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          My Projects
        </a>
        <a
          href="/dashboard?tab=explore"
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "explore"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Explore
        </a>
      </div>

      <div className="mt-6">
        {activeTab === "explore" ? <ExploreTab /> : <MyProjectsTab />}
      </div>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add apps/web/src/app/dashboard/
git commit -m "feat: add dashboard layout with tab navigation"
```

---

### Task 4.2: Dashboard API Routes

**Files:**
- Create: `apps/web/src/app/api/projects/route.ts`
- Create: `apps/web/src/app/api/projects/[id]/route.ts`

**Step 1: Create GET/POST projects route**

```typescript
import { auth } from "@/auth"
import { prisma } from "@codecity/db"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tab = searchParams.get("tab")

  if (tab === "explore") {
    const projects = await prisma.project.findMany({
      where: { visibility: "PUBLIC", status: "COMPLETED" },
      include: { user: { select: { name: true, image: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    })
    return NextResponse.json(projects)
  }

  // Personal projects
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  })
  return NextResponse.json(projects)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { repoUrl, visibility } = body

  // Extract repo name from URL
  const match = repoUrl.match(/github\.com\/([^/]+\/[^/]+)/)
  const name = match ? match[1] : repoUrl

  const project = await prisma.project.create({
    data: {
      name,
      repoUrl,
      visibility: visibility ?? "PRIVATE",
      userId: session.user.id,
    },
  })

  return NextResponse.json(project, { status: 201 })
}
```

**Step 2: Create single project route**

```typescript
import { auth } from "@/auth"
import { prisma } from "@codecity/db"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const project = await prisma.project.findUnique({ where: { id } })

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(project)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const project = await prisma.project.findUnique({ where: { id } })

  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await prisma.project.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const project = await prisma.project.findUnique({ where: { id } })

  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const updated = await prisma.project.update({
    where: { id },
    data: {
      visibility: body.visibility,
      name: body.name,
    },
  })

  return NextResponse.json(updated)
}
```

**Step 3: Commit**

```bash
git add apps/web/src/app/api/projects/
git commit -m "feat: add project CRUD API routes"
```

---

### Task 4.3: My Projects Tab UI

**Files:**
- Create: `apps/web/src/components/dashboard/my-projects-tab.tsx`
- Create: `apps/web/src/components/dashboard/new-analysis-dialog.tsx`

**Step 1: Create my-projects-tab.tsx**

```tsx
"use client"

import { useEffect, useState } from "react"
import { MoreHorizontal, Plus, Trash2, Globe, Lock } from "lucide-react"
import { NewAnalysisDialog } from "./new-analysis-dialog"

interface Project {
  id: string
  name: string
  repoUrl: string
  visibility: "PUBLIC" | "PRIVATE"
  status: string
  fileCount: number
  lineCount: number
  updatedAt: string
}

export function MyProjectsTab() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewDialog, setShowNewDialog] = useState(false)

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => {
        setProjects(data)
        setLoading(false)
      })
  }, [])

  async function handleDelete(id: string) {
    await fetch(`/api/projects/${id}`, { method: "DELETE" })
    setProjects((prev) => prev.filter((p) => p.id !== id))
  }

  async function handleToggleVisibility(project: Project) {
    const newVisibility = project.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC"
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: newVisibility }),
    })
    setProjects((prev) =>
      prev.map((p) =>
        p.id === project.id ? { ...p, visibility: newVisibility } : p
      )
    )
  }

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">Loading...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {projects.length} project{projects.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => setShowNewDialog(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Analysis
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-muted-foreground">No projects yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Analyze a GitHub repo to get started.
          </p>
        </div>
      ) : (
        <div className="mt-4 divide-y divide-border rounded-lg border border-border">
          {projects.map((project) => (
            <div
              key={project.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-3">
                {project.visibility === "PUBLIC" ? (
                  <Globe className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium">{project.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {project.fileCount} files &middot;{" "}
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    project.status === "COMPLETED"
                      ? "bg-green-500/10 text-green-500"
                      : project.status === "FAILED"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-yellow-500/10 text-yellow-500"
                  }`}
                >
                  {project.status.toLowerCase()}
                </span>
                <button
                  onClick={() => handleToggleVisibility(project)}
                  className="rounded p-1 text-muted-foreground hover:bg-accent"
                  title="Toggle visibility"
                >
                  {project.visibility === "PUBLIC" ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    <Globe className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(project.id)}
                  className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNewDialog && (
        <NewAnalysisDialog onClose={() => setShowNewDialog(false)} />
      )}
    </div>
  )
}
```

**Step 2: Create new-analysis-dialog.tsx**

```tsx
"use client"

import { useState } from "react"
import { X } from "lucide-react"

export function NewAnalysisDialog({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState("")
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PRIVATE")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return

    setSubmitting(true)
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repoUrl: url, visibility }),
    })

    window.location.reload()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">New Analysis</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium">Repository URL</label>
            <input
              type="url"
              placeholder="https://github.com/owner/repo"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Visibility</label>
            <div className="mt-1 flex gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="visibility"
                  value="PRIVATE"
                  checked={visibility === "PRIVATE"}
                  onChange={() => setVisibility("PRIVATE")}
                />
                Private
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="visibility"
                  value="PUBLIC"
                  checked={visibility === "PUBLIC"}
                  onChange={() => setVisibility("PUBLIC")}
                />
                Public
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? "Starting..." : "Start Analysis"}
          </button>
        </form>
      </div>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add apps/web/src/components/dashboard/my-projects-tab.tsx apps/web/src/components/dashboard/new-analysis-dialog.tsx
git commit -m "feat: add My Projects tab with project list and new analysis dialog"
```

---

### Task 4.4: Explore Tab UI (Public Gallery)

**Files:**
- Create: `apps/web/src/components/dashboard/explore-tab.tsx`

**Step 1: Create explore-tab.tsx**

```tsx
"use client"

import { useEffect, useState } from "react"
import { Search } from "lucide-react"

interface PublicProject {
  id: string
  name: string
  repoUrl: string
  fileCount: number
  lineCount: number
  thumbnailUrl: string | null
  createdAt: string
  user: { name: string | null; image: string | null }
}

export function ExploreTab() {
  const [projects, setProjects] = useState<PublicProject[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/projects?tab=explore")
      .then((r) => r.json())
      .then((data) => {
        setProjects(data)
        setLoading(false)
      })
  }, [])

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">Loading...</div>
  }

  return (
    <div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search public projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="mt-12 text-center text-muted-foreground">
          No public projects found.
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <a
              key={project.id}
              href={`/city/${project.id}`}
              className="group rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
            >
              <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
                {project.thumbnailUrl ? (
                  <img
                    src={project.thumbnailUrl}
                    alt={project.name}
                    className="h-full w-full rounded-lg object-cover"
                  />
                ) : (
                  <p className="text-xs text-muted-foreground">No preview</p>
                )}
              </div>

              <h3 className="mt-3 text-sm font-semibold group-hover:text-primary">
                {project.name}
              </h3>

              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {project.fileCount} files &middot;{" "}
                  {project.lineCount.toLocaleString()} lines
                </span>
                <span className="flex items-center gap-1">
                  {project.user.image && (
                    <img
                      src={project.user.image}
                      alt=""
                      className="h-4 w-4 rounded-full"
                    />
                  )}
                  {project.user.name ?? "Anonymous"}
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Verify dashboard renders both tabs**

Run: `pnpm dev`
Navigate to `/dashboard`, check both tabs render.

**Step 3: Commit**

```bash
git add apps/web/src/components/dashboard/explore-tab.tsx
git commit -m "feat: add Explore tab with public project gallery"
```

---

## Slice 5: Admin Console

### Task 5.1: Admin Layout + Route Guard

**Files:**
- Create: `apps/web/src/app/admin/layout.tsx`
- Create: `apps/web/src/app/admin/page.tsx`
- Create: `apps/web/src/components/admin/admin-sidebar.tsx`

**Step 1: Create admin-sidebar.tsx**

```tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Users, Activity, Shield, Settings } from "lucide-react"

const NAV_ITEMS = [
  { href: "/admin", icon: Activity, label: "Overview" },
  { href: "/admin/users", icon: Users, label: "Users" },
  { href: "/admin/moderation", icon: Shield, label: "Moderation" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-card">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Admin
        </h2>
      </div>
      <nav className="space-y-1 px-2">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
```

**Step 2: Create admin layout with role check**

```tsx
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { AdminSidebar } from "@/components/admin/admin-sidebar"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "ADMIN") redirect("/dashboard")

  return (
    <>
      <Navbar />
      <div className="flex min-h-[calc(100vh-4rem)]">
        <AdminSidebar />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </>
  )
}
```

**Step 3: Create admin overview page**

```tsx
import { prisma } from "@codecity/db"

export default async function AdminOverviewPage() {
  const [userCount, projectCount, publicCount, recentErrors] =
    await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.project.count({ where: { visibility: "PUBLIC" } }),
      prisma.project.count({ where: { status: "FAILED" } }),
    ])

  const stats = [
    { label: "Total Users", value: userCount },
    { label: "Total Projects", value: projectCount },
    { label: "Public Projects", value: publicCount },
    { label: "Failed Analyses", value: recentErrors },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold">System Overview</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-card p-6"
          >
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add apps/web/src/app/admin/ apps/web/src/components/admin/
git commit -m "feat: add admin layout with sidebar and overview page"
```

---

### Task 5.2: Admin User Management

**Files:**
- Create: `apps/web/src/app/admin/users/page.tsx`
- Create: `apps/web/src/app/api/admin/users/route.ts`
- Create: `apps/web/src/app/api/admin/users/[id]/route.ts`

**Step 1: Create admin users API**

```typescript
// apps/web/src/app/api/admin/users/route.ts
import { auth } from "@/auth"
import { prisma } from "@codecity/db"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      createdAt: true,
      _count: { select: { projects: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(users)
}
```

**Step 2: Create single user admin API**

```typescript
// apps/web/src/app/api/admin/users/[id]/route.ts
import { auth } from "@/auth"
import { prisma } from "@codecity/db"
import { NextResponse } from "next/server"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()

  // Prevent self-demotion
  if (id === session.user.id && body.role === "USER") {
    return NextResponse.json(
      { error: "Cannot demote yourself" },
      { status: 400 }
    )
  }

  const user = await prisma.user.update({
    where: { id },
    data: { role: body.role },
  })

  // Log the action
  await prisma.auditLog.create({
    data: {
      action: `role_change_to_${body.role}`,
      targetType: "User",
      targetId: id,
      adminId: session.user.id,
    },
  })

  return NextResponse.json(user)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  if (id === session.user.id) {
    return NextResponse.json(
      { error: "Cannot delete yourself" },
      { status: 400 }
    )
  }

  await prisma.user.delete({ where: { id } })

  await prisma.auditLog.create({
    data: {
      action: "user_deleted",
      targetType: "User",
      targetId: id,
      adminId: session.user.id,
    },
  })

  return NextResponse.json({ success: true })
}
```

**Step 3: Create admin users page**

```tsx
"use client"

import { useEffect, useState } from "react"
import { Search, Shield, ShieldOff, Trash2 } from "lucide-react"

interface AdminUser {
  id: string
  name: string | null
  email: string
  image: string | null
  role: "USER" | "ADMIN"
  createdAt: string
  _count: { projects: number }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => {
        setUsers(data)
        setLoading(false)
      })
  }, [])

  async function handleRoleToggle(user: AdminUser) {
    const newRole = user.role === "ADMIN" ? "USER" : "ADMIN"
    await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    })
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
    )
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this user?")) return
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" })
    setUsers((prev) => prev.filter((u) => u.id !== id))
  }

  const filtered = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">Loading...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users ({users.length})</h1>
      </div>

      <div className="relative mt-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">User</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Role</th>
              <th className="px-4 py-3 text-left font-medium">Projects</th>
              <th className="px-4 py-3 text-left font-medium">Joined</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {user.image && (
                      <img
                        src={user.image}
                        alt=""
                        className="h-6 w-6 rounded-full"
                      />
                    )}
                    {user.name ?? "—"}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {user.email}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      user.role === "ADMIN"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3">{user._count.projects}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => handleRoleToggle(user)}
                      className="rounded p-1 text-muted-foreground hover:bg-accent"
                      title={
                        user.role === "ADMIN"
                          ? "Demote to User"
                          : "Promote to Admin"
                      }
                    >
                      {user.role === "ADMIN" ? (
                        <ShieldOff className="h-4 w-4" />
                      ) : (
                        <Shield className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="Delete user"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add apps/web/src/app/admin/users/ apps/web/src/app/api/admin/users/
git commit -m "feat: add admin user management page"
```

---

### Task 5.3: Admin Content Moderation

**Files:**
- Create: `apps/web/src/app/admin/moderation/page.tsx`
- Create: `apps/web/src/app/api/admin/projects/route.ts`
- Create: `apps/web/src/app/api/admin/projects/[id]/route.ts`

**Step 1: Create admin projects API**

```typescript
// apps/web/src/app/api/admin/projects/route.ts
import { auth } from "@/auth"
import { prisma } from "@codecity/db"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const projects = await prisma.project.findMany({
    where: { visibility: "PUBLIC" },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(projects)
}
```

**Step 2: Create admin single project API**

```typescript
// apps/web/src/app/api/admin/projects/[id]/route.ts
import { auth } from "@/auth"
import { prisma } from "@codecity/db"
import { NextResponse } from "next/server"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()

  const project = await prisma.project.update({
    where: { id },
    data: { visibility: body.visibility },
  })

  await prisma.auditLog.create({
    data: {
      action: `visibility_change_to_${body.visibility}`,
      targetType: "Project",
      targetId: id,
      adminId: session.user.id,
    },
  })

  return NextResponse.json(project)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  await prisma.project.delete({ where: { id } })

  await prisma.auditLog.create({
    data: {
      action: "project_deleted",
      targetType: "Project",
      targetId: id,
      adminId: session.user.id,
    },
  })

  return NextResponse.json({ success: true })
}
```

**Step 3: Create moderation page**

```tsx
"use client"

import { useEffect, useState } from "react"
import { EyeOff, Trash2 } from "lucide-react"

interface ModerationProject {
  id: string
  name: string
  repoUrl: string
  visibility: string
  fileCount: number
  createdAt: string
  user: { name: string | null; email: string }
}

export default function AdminModerationPage() {
  const [projects, setProjects] = useState<ModerationProject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/projects")
      .then((r) => r.json())
      .then((data) => {
        setProjects(data)
        setLoading(false)
      })
  }, [])

  async function handleMakePrivate(id: string) {
    await fetch(`/api/admin/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: "PRIVATE" }),
    })
    setProjects((prev) => prev.filter((p) => p.id !== id))
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this project permanently?")) return
    await fetch(`/api/admin/projects/${id}`, { method: "DELETE" })
    setProjects((prev) => prev.filter((p) => p.id !== id))
  }

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">Loading...</div>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Content Moderation</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage public gallery listings ({projects.length} public projects)
      </p>

      <div className="mt-6 divide-y divide-border rounded-lg border border-border">
        {projects.map((project) => (
          <div
            key={project.id}
            className="flex items-center justify-between px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium">{project.name}</p>
              <p className="text-xs text-muted-foreground">
                by {project.user.name ?? project.user.email} &middot;{" "}
                {project.fileCount} files &middot;{" "}
                {new Date(project.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleMakePrivate(project.id)}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
              >
                <EyeOff className="h-3 w-3" />
                Make Private
              </button>
              <button
                onClick={() => handleDelete(project.id)}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add apps/web/src/app/admin/moderation/ apps/web/src/app/api/admin/projects/
git commit -m "feat: add admin content moderation page"
```

---

### Task 5.4: Admin Platform Settings

**Files:**
- Create: `apps/web/src/app/admin/settings/page.tsx`
- Create: `apps/web/src/app/api/admin/settings/route.ts`

**Step 1: Create settings API**

```typescript
// apps/web/src/app/api/admin/settings/route.ts
import { auth } from "@/auth"
import { prisma } from "@codecity/db"
import { NextResponse } from "next/server"

const DEFAULT_SETTINGS: Record<string, unknown> = {
  registrationEnabled: true,
  publicGalleryEnabled: true,
  aiChatEnabled: true,
  maxFilesPerAnalysis: 500,
  maxConcurrentAnalyses: 3,
  maintenanceMode: false,
  maintenanceMessage: "",
}

export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const dbSettings = await prisma.platformSettings.findMany()
  const settings = { ...DEFAULT_SETTINGS }

  for (const s of dbSettings) {
    settings[s.key] = s.value
  }

  return NextResponse.json(settings)
}

export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()

  for (const [key, value] of Object.entries(body)) {
    await prisma.platformSettings.upsert({
      where: { key },
      update: { value: value as any },
      create: { key, value: value as any },
    })
  }

  await prisma.auditLog.create({
    data: {
      action: "settings_updated",
      targetType: "PlatformSettings",
      targetId: "global",
      metadata: body,
      adminId: session.user.id,
    },
  })

  return NextResponse.json({ success: true })
}
```

**Step 2: Create settings page**

```tsx
"use client"

import { useEffect, useState } from "react"

interface PlatformSettings {
  registrationEnabled: boolean
  publicGalleryEnabled: boolean
  aiChatEnabled: boolean
  maxFilesPerAnalysis: number
  maxConcurrentAnalyses: number
  maintenanceMode: boolean
  maintenanceMessage: string
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then(setSettings)
  }, [])

  async function handleSave() {
    if (!settings) return
    setSaving(true)
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!settings) {
    return <div className="py-12 text-center text-muted-foreground">Loading...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Platform Settings</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      <div className="mt-8 space-y-8">
        {/* Feature Flags */}
        <section>
          <h2 className="text-lg font-semibold">Feature Flags</h2>
          <div className="mt-4 space-y-4">
            {([
              ["registrationEnabled", "Allow new user registration"],
              ["publicGalleryEnabled", "Enable public gallery"],
              ["aiChatEnabled", "Enable AI chat feature"],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center justify-between rounded-lg border border-border p-4">
                <span className="text-sm">{label}</span>
                <input
                  type="checkbox"
                  checked={settings[key] as boolean}
                  onChange={(e) =>
                    setSettings({ ...settings, [key]: e.target.checked })
                  }
                  className="h-4 w-4"
                />
              </label>
            ))}
          </div>
        </section>

        {/* Limits */}
        <section>
          <h2 className="text-lg font-semibold">Limits</h2>
          <div className="mt-4 space-y-4">
            <div className="rounded-lg border border-border p-4">
              <label className="flex items-center justify-between">
                <span className="text-sm">Max files per analysis</span>
                <input
                  type="number"
                  value={settings.maxFilesPerAnalysis}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      maxFilesPerAnalysis: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-24 rounded border border-input bg-background px-3 py-1 text-sm"
                />
              </label>
            </div>
            <div className="rounded-lg border border-border p-4">
              <label className="flex items-center justify-between">
                <span className="text-sm">Max concurrent analyses per user</span>
                <input
                  type="number"
                  value={settings.maxConcurrentAnalyses}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      maxConcurrentAnalyses: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-24 rounded border border-input bg-background px-3 py-1 text-sm"
                />
              </label>
            </div>
          </div>
        </section>

        {/* Maintenance */}
        <section>
          <h2 className="text-lg font-semibold">Maintenance Mode</h2>
          <div className="mt-4 space-y-4">
            <label className="flex items-center justify-between rounded-lg border border-border p-4">
              <span className="text-sm">Enable maintenance mode</span>
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) =>
                  setSettings({ ...settings, maintenanceMode: e.target.checked })
                }
                className="h-4 w-4"
              />
            </label>
            {settings.maintenanceMode && (
              <div className="rounded-lg border border-border p-4">
                <label className="text-sm">Maintenance message</label>
                <input
                  type="text"
                  value={settings.maintenanceMessage}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      maintenanceMessage: e.target.value,
                    })
                  }
                  placeholder="We're performing maintenance. Back soon!"
                  className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add apps/web/src/app/admin/settings/ apps/web/src/app/api/admin/settings/
git commit -m "feat: add admin platform settings page"
```

---

### Task 5.5: Create apps/mcp-server Placeholder

**Files:**
- Create: `apps/mcp-server/package.json`
- Create: `apps/mcp-server/src/index.ts`
- Create: `apps/mcp-server/tsconfig.json`

**Step 1: Create package.json**

```json
{
  "name": "@codecity/mcp-server",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@codecity/core": "workspace:*"
  },
  "devDependencies": {
    "tsx": "^4.0.0",
    "typescript": "^5.7.0"
  }
}
```

**Step 2: Create placeholder index.ts**

```typescript
console.log("CodeCity MCP Server — coming soon")
```

**Step 3: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

**Step 4: Commit**

```bash
git add apps/mcp-server/
git commit -m "feat: add mcp-server placeholder"
```

---

### Task 5.6: Final Verification

**Step 1: Install all dependencies**

Run: `pnpm install`

**Step 2: Generate Prisma client**

Run: `pnpm db:generate`

**Step 3: Push schema to database**

Run: `pnpm db:push`

**Step 4: Start dev server**

Run: `pnpm dev`

**Step 5: Verify all routes**

- `/` — Homepage with hero, repo input, features
- `/login` — Login page with Google + GitHub buttons
- `/dashboard` — Dashboard with My Projects + Explore tabs
- `/admin` — Admin overview (if logged in as admin)
- `/admin/users` — User management
- `/admin/moderation` — Content moderation
- `/admin/settings` — Platform settings

**Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete CodeCity v2 foundation — auth, homepage, dashboard, admin"
```
