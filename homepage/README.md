# CodeCity Homepage — Astro

Astro port of the CodeCity marketing homepage. Static `.astro` shell with React islands for the interactive parts (CityScene canvas, GraphView, Features tabs, FAQ, DownloadButton).

## Getting started

```bash
cd astro
npm install
npm run dev          # http://localhost:4321
```

## Project structure

```
astro/
├── astro.config.mjs       # @astrojs/react integration
├── package.json
├── public/
│   └── assets/            # logos copied from the root project
└── src/
    ├── data/
    │   └── copy.ts        # all marketing copy + meta
    ├── components/
    │   ├── CityScene.jsx        # the 3D city (React island)
    │   ├── Shared.jsx           # atoms: CCLogo, CCButton, DownloadButton, Icon
    │   ├── HomepageExtras.jsx   # GraphView + Security
    │   └── Homepage.jsx         # the full page composed as React
    ├── layouts/
    │   └── BaseLayout.astro
    ├── pages/
    │   └── index.astro          # mounts <Homepage client:load />
    └── styles/
        └── global.css           # the pixel-theme design tokens
```

## Hybrid model

The whole homepage currently mounts as a single React island (`<Homepage client:load />`). This is the pragmatic port — every interactive piece (city rotation, graph view toggle, feature tabs, FAQ accordion, download dropdown, accent picker) already exists as React.

To split into smaller islands (better TTFB, partial hydration), break sections out of `Homepage.jsx` into their own files and import them individually in `index.astro` with appropriate `client:*` directives (`client:visible`, `client:idle`, etc.).

## Build

```bash
npm run build   # → dist/
npm run preview # serve the static build locally
```

Astro's output is fully static — no server required. Deploy `dist/` to Vercel, Netlify, Cloudflare Pages, or any static host.
