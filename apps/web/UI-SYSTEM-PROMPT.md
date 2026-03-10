# UI Design System Prompt — Omkar Bhad Portfolio

> Paste this into any AI coding tool to reproduce or extend this design system.

---

## Design Philosophy

Clean, minimal, professional dark UI. Inspired by Linear, Vercel, Resend, and shadcn/ui aesthetics. Every element earns its place — no decoration for decoration's sake. Purposeful animations, generous whitespace, sharp typography.

**Core Principles:**
1. **Subtract, don't add** — if an element doesn't serve comprehension or interaction, remove it
2. **Purposeful motion** — animations communicate state changes, not impress
3. **Data-driven** — all content comes from a single data file, components are pure renderers
4. **Dark-first** — designed for dark mode exclusively, no light mode

---

## Tech Stack

| Layer | Tool | Version | Purpose |
|-------|------|---------|---------|
| Framework | Next.js (App Router) | 16.x | SSR, routing, API routes |
| UI Library | React | 19.x | Component rendering |
| Styling | Tailwind CSS | v4 | Utility-first CSS |
| Components | shadcn/ui + Radix UI | latest | Headless accessible primitives |
| Animation | Framer Motion | 12.x | Layout animations, micro-interactions |
| Icons | Lucide React | latest | UI icons (lightweight, tree-shakeable) |
| Tech Logos | @iconify/react | latest | Brand/tech icons (Simple Icons set) |
| Chat | Vercel AI SDK | latest | Streaming chat with OpenRouter |
| Font | Inter | system | Clean sans-serif |
| Code Font | SF Mono / Cascadia Code / monospace | system | Terminal, code blocks |

---

## Color Palette

### Backgrounds
```
Page background:     #09090b  (zinc-950)
Surface primary:     #0a0a0c
Surface raised:      #141416
Surface subtle:      rgba(255,255,255, 0.02-0.04)
Surface hover:       rgba(255,255,255, 0.04-0.06)
```

### Text
```
Primary text:        #fafafa  (zinc-50)  — headings, names
Secondary text:      #a1a1aa  (zinc-400) — body copy, descriptions
Muted text:          #71717a  (zinc-500) — labels, timestamps
Dim text:            #52525b  (zinc-600) — hints, placeholders
```

### Accent — Indigo
```
Indigo-600:          #4f46e5  — buttons, primary actions
Indigo-500:          #6366f1  — primary accent, brand mark, glows
Indigo-400:          #818cf8  — active states, links, highlights
Indigo-glow:         rgba(99,102,241, 0.05-0.15) — background radial glows
```

### Semantic
```
Success:             #10b981 / #34d399  (emerald) — live badges, online dots
Warning:             #f59e0b / #fbbf24  (amber)   — awards, in-progress
Error:               #ef4444 / #f87171  (red)     — errors, destructive
Info:                #3b82f6 / #60a5fa  (blue)    — data viz, links
Orange:              #fb923c            — code highlights, categories
```

### Border System
```
Subtle:              rgba(255,255,255, 0.04-0.06)  — default card borders
Default:             rgba(255,255,255, 0.08)        — input borders, dividers
Strong:              rgba(255,255,255, 0.12)         — hover states, focus
Active/brand:        rgba(99,102,241, 0.06-0.40)    — accent borders on hover
```

---

## Layout & Spacing

### Page Structure
```
Content max-width:   max-w-5xl  (1024px)
Hero max-width:      max-w-6xl  (1152px)
Header height:       3.25rem    (52px)
Page padding:        px-5 → sm:px-8 → md:px-10  (20/32/40px)
Section spacing:     pb-16      (64px)
```

### Grid
```
Hero:                grid lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_400px]
Projects featured:   grid md:grid-cols-2 gap-4
Projects grid:       grid sm:grid-cols-2 lg:grid-cols-3 gap-3
Tech stack:          grid lg:grid-cols-2 gap-3
Experience:          single column, max-w-4xl
About:               single column, full width card
```

### Card Spacing
```
Featured card:       p-5 sm:p-6  (20/24px), rounded-2xl (16px)
Regular card:        p-4 sm:p-5  (16/20px), rounded-xl  (12px)
Compact card:        p-3         (12px),    rounded-lg   (8px)
Card gap:            gap-3 (12px) compact, gap-4 (16px) standard
```

### Sidebar (Floating Chat Panel)
```
Width range:         340px–640px (draggable)
Default width:       400px
Position:            fixed, 12px inset from top/right/bottom
Border-radius:       16px
Background:          rgba(9,9,11, 0.92) + backdrop-filter: blur(24px)
Border:              1px solid rgba(255,255,255, 0.08)
Shadow:              0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.06)
Animation:           spring, stiffness: 300, damping: 30
```

---

## Typography

### Scale
```
Hero h1:             text-4xl / sm:text-5xl / lg:text-6xl (36/48/60px)
                     font-bold, tracking-tight, leading-[1.08]
Section heading:     text-2xl / sm:text-3xl (24/30px)
                     font-bold, centered, gradient (white → zinc)
Card title:          text-lg / text-xl (18/20px), font-semibold
Body:                text-sm (14px) / text-base (16px), leading-relaxed
Small text:          text-xs (12px) — badges, labels, tech tags
Micro text:          text-[10px] / text-[11px] — timestamps, stat labels
```

### Code / Terminal
```
Font:                font-mono (SF Mono, Cascadia Code, monospace)
Size:                text-[11px] in terminal, text-[13px] in code blocks
Line height:         leading-[1.9] in terminal
```

### Hierarchy Rule
White (`#fafafa`) for names/headings → zinc-400 for body → zinc-500/600 for labels → indigo-400 for interactive/accent text

---

## Component Patterns

### Buttons
```css
/* Primary */
rounded-lg px-5 py-2.5 text-sm font-medium
text-white bg-indigo-600 hover:bg-indigo-500
transition-colors duration-200

/* Secondary / Outline */
rounded-lg px-5 py-2.5 text-sm font-medium
text-zinc-300 hover:text-white
bg-white/[0.04] border border-white/[0.08]
hover:border-white/[0.12] hover:bg-white/[0.06]
transition-all duration-200

/* Ghost */
text-zinc-400 hover:text-white hover:bg-white/[0.04]
transition-all duration-200
```

### Cards
```css
/* Surface card */
rounded-xl overflow-hidden
background: rgba(255,255,255, 0.02)
border: 1px solid rgba(255,255,255, 0.06)

/* Hover effect */
hover:border-color → accent + "40" (e.g., #6366f140)
hover:translate-y-[-2px]
transition-all duration-300
```

### Badges
```css
/* Status badge — Live */
text-[10px] px-2 py-0.5 font-medium rounded
bg-emerald-500/10 text-emerald-400 border border-emerald-500/30
+ animated pulse dot

/* Status badge — In Progress */
bg-amber-500/10 text-amber-400 border border-amber-500/30
+ spinning loader icon

/* Status badge — Built */
bg-blue-500/10 text-blue-400 border border-blue-500/30
```

### Tech Chips
```css
rounded-lg px-2.5 py-1.5 text-[11px] font-medium
background: rgba(255,255,255, 0.04)
border: 1px solid rgba(255,255,255, 0.07)
text-white/85
/* hover: bg → accent+"18", border → accent+"44" */
```

### Input Fields
```css
rounded-lg
background: rgba(255,255,255, 0.03)
border: 1px solid rgba(255,255,255, 0.08)
focus: border-color → indigo-500/45
text: zinc-200, placeholder: zinc-600
```

---

## Animation System (Framer Motion)

### Entrance Animations
```tsx
// Standard fade-up (most elements)
initial={{ opacity: 0, y: 8-20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.3-0.5, ease: [0.25, 0.46, 0.45, 0.94] }}

// Staggered children
variants={{
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08-0.15 } }
}}

// Terminal lines (character reveal feel)
initial={{ opacity: 0, x: -6 }}
animate={{ opacity: 1, x: 0 }}
transition={{ delay: 0.6 + i * 0.05, duration: 0.25 }}
```

### Hover Interactions
```tsx
// Cards
whileHover={{ scale: 1.02, y: -2 }}

// Buttons / icons
whileHover={{ scale: 1.05 }}
whileTap={{ scale: 0.95 }}

// Social icons
whileHover={{ scale: 1.1, y: -2 }}
```

### Layout Animations
```tsx
// Nav active indicator
<motion.span layoutId="nav-active-bg" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />

// Sidebar slide-in
initial={{ x: '100%', opacity: 0 }}
animate={{ x: 0, opacity: 1 }}
exit={{ x: '100%', opacity: 0 }}
transition={{ type: 'spring', stiffness: 300, damping: 30 }}
```

### Continuous Animations
```tsx
// Scroll indicator bounce
animate={{ y: [0, 4, 0] }}
transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}

// Blinking cursor
animate={{ opacity: [1, 0, 1] }}
transition={{ duration: 1, repeat: Infinity }}

// Ping dot (online/available)
className="animate-ping" // Tailwind built-in
```

### Timing Rules
- Entrance: 0.2–0.5s, ease-out curve `[0.25, 0.46, 0.45, 0.94]`
- Hover: 0.15–0.2s
- Spring transitions: stiffness 300-400, damping 28-35
- Stagger delays: 0.05–0.15s between siblings
- Initial delay: 0.05–0.5s cascade from top of page

---

## Glow & Shadow System

### Background Glows
```css
/* Page top glow */
radial-gradient(ellipse 60% 40% at 50% -5%, rgba(99,102,241,0.05), transparent 60%)

/* Hero dual glow */
radial-gradient(ellipse 50% 40% at 30% 20%, rgba(99,102,241,0.06) 0%, transparent 70%),
radial-gradient(ellipse 40% 30% at 70% 60%, rgba(99,102,241,0.04) 0%, transparent 70%)

/* Terminal glow */
radial-gradient(ellipse at 50% 40%, rgba(99,102,241,0.15), transparent 70%)
```

### Shadows
```css
/* Card hover */
box-shadow: none → 0 4px 24px rgba(0,0,0,0.3)

/* Floating sidebar */
0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.06)

/* Terminal */
0 20px 50px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,102,241,0.08)

/* Header (scrolled) */
0 4px 24px rgba(0,0,0,0.3)

/* Mobile FAB */
shadow-lg (Tailwind default)
```

---

## Header Pattern

```
Fixed top, px-4 pt-3
Inner bar: h-11, max-w-5xl, rounded-xl
Background: rgba(9,9,11, 0.5) → rgba(9,9,11, 0.88) on scroll
Blur: backdrop-filter: blur(16px)
Border: rgba(255,255,255, 0.04) → rgba(255,255,255, 0.08) on scroll

Layout: [Brand] — [Nav links center] — [CTA right]
Brand: 24px rounded-md indigo-500 monogram + site name
Nav: 13px font-medium, zinc-500 → white active, layoutId spring indicator
CTA: ghost button with icon
```

---

## Section Pattern

Every section follows:
```
1. SectionHeader (centered)
   - Heading: text-2xl/3xl, font-bold, gradient text (white → zinc)
   - Underline: 48px × 3px indigo-500 bar, centered
   - Description: text-sm/base, zinc-400, max-w-xl centered

2. Content area
   - max-w-5xl (or max-w-4xl for text-heavy)
   - px-4 padding
   - Cards/grid with consistent spacing

3. Optional CTA at bottom
   - Centered, outline style button with arrow icon
```

---

## Terminal Code Block Pattern

```
Container: rounded-xl, bg rgba(9,9,11,0.9), border rgba(255,255,255,0.08)
           blur(16px), shadow with indigo glow ring

Title bar: flex, gap-2, px-4 py-2.5, border-bottom rgba(255,255,255,0.06)
           Three dots (red/amber/green at 50% opacity, 2.5px size)
           Terminal icon + filename in mono text-[11px] zinc-600

Code body: px-4 py-3, font-mono text-[11px] leading-[1.9]
           Line numbers: w-5, zinc-700, text-[10px], select-none
           Syntax colors: purple (#818cf8) for keywords
                          green (#34d399) for strings
                          orange (#fb923c) for values
                          zinc (#a1a1aa) for brackets/syntax
           Blinking cursor: indigo-400, 1s infinite opacity toggle
```

---

## Chat Sidebar Pattern

```
Welcome state:
  - Avatar image (rounded-2xl, 64px, border white/8%, green online dot)
  - "Ask me about [Name]" heading
  - Subtitle in zinc-600
  - Suggested question buttons (text-left, rounded-lg, border white/5%)

Message bubbles:
  - User: right-aligned, max-w-85%, bg white/7%, border white/12%, rounded-lg
  - AI: full-width, Bot icon + name label, markdown rendered content
  - Typing: three-dot bounce animation

Input area:
  - Bottom pinned, border-top white/6%
  - Auto-resize textarea, 48-150px height range
  - Send button with indigo gradient
```

---

## Responsive Breakpoints

```
sm:  640px   — padding increase, side-by-side layouts
md:  768px   — full grid layouts, desktop nav visible
lg:  1024px  — sidebar visible, hero two-column, 3-col project grid
xl:  1280px  — slightly wider hero terminal column
```

### Mobile Specifics
- All `min-height: 44px` touch targets
- `font-size: 16px` on inputs (prevent iOS zoom)
- Mobile chat: full-screen overlay, spring slide from right
- Mobile FAB: fixed bottom-6 right-5, w-12 h-12, indigo-600 circle
- Hamburger menu: dropdown with backdrop blur

---

## File Architecture

```
src/
├── app/
│   ├── page.tsx              — Main page, section orchestrator
│   ├── globals.css           — Tailwind imports + base styles
│   ├── aion-design.css       — Design system CSS variables (71 vars)
│   └── layout.tsx            — Root layout, font loading, providers
├── core/
│   ├── data/portfolio-data.ts — Single source of truth for ALL content
│   └── providers/             — React context (data, navigation, chat state)
├── features/
│   ├── portfolio/sections/    — Each section is its own component
│   │   ├── hero-section.tsx
│   │   ├── projects-section.tsx
│   │   ├── overview-section.tsx
│   │   ├── tech-stack-section.tsx
│   │   ├── experience-section.tsx
│   │   ├── certifications-section.tsx
│   │   ├── contact-section.tsx
│   │   ├── footer.tsx
│   │   └── section-header.tsx  — Reusable section header component
│   └── chat/                   — Chat message rendering, reasoning blocks
└── shared/components/          — Reusable UI (header, sidebar, shadcn primitives)
```

---

## Key Rules for AI Agents

1. **All content from data file** — never hardcode text in components
2. **Dark mode only** — no light mode variables or toggles
3. **Honest metrics only** — don't surface unverified/aspirational numbers
4. **Mobile-first responsive** — test every change at 375px, 768px, 1024px
5. **No gratuitous animation** — every motion must communicate something
6. **Consistent border/bg opacity** — use the rgba scales defined above
7. **Keep line count low** — this is a portfolio, not a framework. ~9K lines total.
8. **Spring animations for layout shifts** — stiffness 300-400, damping 28-35
9. **Zinc for neutrals, indigo for accents** — never mix in other color families for UI chrome
10. **Glassmorphism for floating elements** — blur(16-24px) + semi-transparent bg + subtle border
