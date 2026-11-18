# CodeCity homepage

The marketing site for CodeCity at <https://codecity.magnova.ai>. It is a static
[Astro 5](https://astro.build) site: plain `.astro` components, one stylesheet of
design tokens, and no client framework.

## Run it locally

You need Node.js 20.9 or newer and pnpm 9 (see the root [README](../README.md#prerequisites)).

### macOS (Terminal)

```bash
cd codecity/homepage
pnpm install
pnpm dev            # http://localhost:4321
```

### Windows (PowerShell or Command Prompt)

```powershell
cd codecity\homepage
pnpm install
pnpm dev            # http://localhost:4321
```

From the repository root you can also run `pnpm dev:homepage` (port 3001).

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server with hot reload |
| `pnpm build` | Static build into `dist/` |
| `pnpm preview` | Serve the built `dist/` locally |
| `pnpm astro check` | Type-check `.astro` files |

## Structure

```
homepage/
├── public/
│   ├── brand/logo-mark.svg     the CodeCity mark (also favicon.svg)
│   ├── og.png                  1200x630 share image
│   └── assets/
│       ├── art/                section illustrations and the hero cover (hero-city-*.webp)
│       └── screens/            screenshots of the app
├── design/                     source brand files (4K cover, logo SVG and 512px PNG); not served
└── src/
    ├── pages/                  index, privacy, terms, 404
    ├── layouts/BaseLayout.astro
    ├── components/sections/    one file per page section
    ├── components/ui/          nav, footer, buttons, logo, icons
    ├── lib/                    site facts (site.ts), FAQ copy, icon set
    └── styles/global.css       design tokens and shared classes
```

## Design system

Tokens live in `src/styles/global.css` and match the desktop app.

| Role | Token | Value | Contrast on `--bg` |
| --- | --- | --- | --- |
| Page ground | `--bg` | `#0a0a0a` | |
| Cards, panels | `--surface-1` … `--surface-4` | `#141414` → `#303030` | |
| Body text | `--text-1` | `#f3f3f3` | 17.8 : 1 |
| Secondary text | `--text-2` | `#a3a3a3` | 7.9 : 1 |
| Captions | `--text-3` | `#8a8a8a` | 5.7 : 1 |
| Primary (actions, focus) | `--lime` | `#c8e64a` | 14.0 : 1 |
| Secondary | `--sky` | `#38bdf8` | 9.2 : 1 |
| Accent (rare emphasis) | `--pink` | `#f472b6` | 7.5 : 1 |
| Text on lime | `--on-lime` | `#121212` | 13.3 : 1 on lime |

The three hues sit near a triadic split (lime 72°, sky 198°, pink 329°) on a
neutral charcoal ground, so the brand colour stays dominant and the other two
read as data colours, the same way the app colours its districts. Every pair
above passes WCAG AA; most pass AAA.

Type is Instrument Sans (DM Mono for code). Radii are 6, 10 and 16 px. Motion is
limited to hover and press feedback; nothing animates on scroll except the
tagline, and everything rests under `prefers-reduced-motion`.

### Gradients

One brand ramp, lime → mint → sky (`--grad-brand`), never through violet. It
colours one phrase per heading (`.grad-text`), the primary button, card and frame
borders, and the section grounds below, built from the taste skill's CSS-ground
catalogue:

| Section | Ground | What it is |
| --- | --- | --- |
| Hero | photo layer | the Krea night city behind the headline, faded to the page |
| Features | `.g-mist` | four soft radial washes of lime and mint |
| Tagline | `.g-field` | a grainy gradient ribbon (Krea), the one loud ground |
| Closing | `.g-arcs` | rings rising from below over a low aurora (Krea) |

Words on a ground sit on its calm, dark part, so body text keeps about 7:1.

The hero cover, both gradient fields and the logo were generated with Krea in
this palette; full-size sources are in `design/`.
