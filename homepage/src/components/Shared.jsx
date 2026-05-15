import React from 'react';

// Shared content + small UI atoms.

const COPY = {
  brand: 'CodeCity',
  repo: 'MagnovaAI/codecity',

  hero: {
    eyebrow: 'v1.0 · open source',
    title: 'See your codebase.',
    titleAccent: 'Not your file tree.',
    subtitle:
      'CodeCity turns any repository into a 3D city you can fly through. Folders become districts. Files become buildings. Complexity becomes skyline. Find what matters — and what to delete — in seconds, not days.',
    bullets: [
      '45+ languages parsed with tree-sitter',
      'Louvain communities · hubs · entry points',
      'Local-first · your code never leaves the machine',
    ],
  },

  // Real numbers from the actual project
  stats: [
    { value: '45+',  label: 'languages parsed' },
    { value: '38M',  label: 'LOC tested (Linux kernel)' },
    { value: '60fps', label: 'render at any scale' },
    { value: '100%', label: 'local · zero telemetry' },
  ],

  features: [
    {
      tag: 'Hubs',
      title: 'Find the load-bearing files',
      body: 'CodeCity ranks every file by in-degree across the symbol graph. The tallest, brightest buildings are the ones N teams depend on. Touch them carefully.',
      example: 'app.rs · imported by 1,799 files',
      icon: 'hub',
    },
    {
      tag: 'Entry points',
      title: 'See where the program begins',
      body: 'Files nothing imports — your `main.rs`, your `app/page.tsx`, your CLI binaries. Production entries are filtered from tests and benchmarks automatically.',
      example: 'src-tauri/src/main.rs · 0 callers',
      icon: 'entry',
    },
    {
      tag: 'Communities',
      title: 'Discover hidden subsystems',
      body: 'Louvain community detection clusters tightly-coupled files into districts. What you thought was one folder is often four communities; what you thought was scattered is often one.',
      example: '6 communities · 0.74 modularity',
      icon: 'cluster',
    },
    {
      tag: 'Blast radius',
      title: 'Trace what depends on what',
      body: 'Click any file to highlight every caller and callee, transitively. Plan refactors visually before you write a single line.',
      example: '142 callers · 23 deep',
      icon: 'deps',
    },
    {
      tag: 'Hot spots',
      title: 'Spot complexity from orbit',
      body: 'Cyclomatic complexity drives building height. Skyscrapers are where bugs live; clusters of skyscrapers are where you should refactor first.',
      example: 'registry.py · cplx 130 · 808 LOC',
      icon: 'cplx',
    },
    {
      tag: 'Recent changes',
      title: 'See where the team is working',
      body: 'Git activity overlaid on structure. Files that are both hot AND load-bearing get flagged — the intersection of churn and importance.',
      example: '12 hot hubs in last 14 days',
      icon: 'churn',
    },
  ],

  // Three surfaces — huge differentiator for CodeCity
  surfaces: [
    {
      kind: 'Desktop',
      tag: 'codecity',
      title: 'The 3D app',
      body: 'Tauri 2 desktop client. SQLite-cached, opens any local repo or GitHub URL. Renders with @react-three/fiber.',
      bullet: 'For exploring.',
      cmd: '$ open CodeCity.app',
    },
    {
      kind: 'CLI',
      tag: 'codecity-cli',
      title: 'The command line',
      body: 'Same engine, headless. JSON snapshots for CI, dashboards, custom tooling. Outputs every metric the GUI shows.',
      bullet: 'For automation.',
      cmd: '$ codecity-cli analyze ./repo --json',
    },
    {
      kind: 'MCP',
      tag: 'codecity-mcp',
      title: 'The agent server',
      body: 'Exposes the snapshot to Claude, Cursor, and any MCP client. Nine tools: overview, hubs, find_callers, find_path, communities, more.',
      bullet: 'For AI.',
      cmd: '$ claude mcp add codecity ./codecity-mcp -- --repo .',
    },
  ],

  useCases: [
    {
      title: 'Onboarding in a day',
      body: 'New to the team? Open the repo, find the entry points, walk down to the hubs. You have an architectural model before you write your first line.',
      stat: '5 days → 1 day',
      statLabel: 'first commit, on average',
    },
    {
      title: 'Refactoring with a map',
      body: 'Pick a tall building. See every file that imports it. Draw a perimeter on the map. You know the blast radius before you touch a thing.',
      stat: '0 mystery imports',
      statLabel: 'unpinned by the graph',
    },
    {
      title: 'Tech debt, ranked',
      body: 'Sort by complexity × churn. The skyscrapers nobody dares touch but everyone keeps editing — that\'s your list, in priority order.',
      stat: 'cplx × churn',
      statLabel: 'the only ranking that matters',
    },
  ],

  // 12 of the 45 languages — these are the most-shown
  languages: [
    { name: 'TypeScript', color: '#448aff' },
    { name: 'JavaScript', color: '#ffea00' },
    { name: 'Python',     color: '#00e676' },
    { name: 'Rust',       color: '#ff9100' },
    { name: 'Go',         color: '#00e5ff' },
    { name: 'Java',       color: '#b388ff' },
    { name: 'Kotlin',     color: '#ff4081' },
    { name: 'Swift',      color: '#ff3d3d' },
    { name: 'C / C++',    color: '#1de9b6' },
    { name: 'Ruby',       color: '#ff1744' },
    { name: 'PHP',        color: '#8c9eff' },
    { name: 'Elixir',     color: '#aeea00' },
  ],
  // …and the long tail
  moreLangs: [
    'C#', 'Scala', 'Dart', 'Haskell', 'OCaml', 'Erlang', 'Lua', 'Bash',
    'Zig', 'Julia', 'R', 'Perl', 'GraphQL', 'Proto', 'HCL', 'Nix',
    'WGSL', 'GLSL', 'Make', 'Dockerfile', 'Groovy', 'Elisp',
  ],

  scaleStops: [
    { repo: 'tiny-utility',       files: '23',      loc: '1.4k',  note: 'A hamlet.',    ms: '120ms'  },
    { repo: 'startup-app',        files: '2.1k',    loc: '180k',  note: 'A small town.', ms: '1.2s'   },
    { repo: 'react/react',        files: '6.8k',    loc: '720k',  note: 'A city.',       ms: '3.4s'   },
    { repo: 'pytorch/pytorch',    files: '14.2k',   loc: '2.16M', note: 'A megalopolis.', ms: '8s'    },
    { repo: 'torvalds/linux',     files: '85k',     loc: '38M',   note: 'A capital.',     ms: '42s'   },
  ],

  // Two views — city vs graph
  views: {
    eyebrow: 'TWO VIEWS · ONE SNAPSHOT',
    title: 'WHEN A CITY ISN\'T ENOUGH.',
    sub: 'The 3D city is for spatial intuition. The graph view is for structural truth. Toggle anytime — same data, same selection, two complementary lenses.',
    cityPoints: [
      'Walk districts, fly over skylines',
      'Building height = complexity',
      'Color = dominant language',
      'Pipes show dependencies',
    ],
    graphPoints: [
      'Force-directed FCoSE layout',
      'Nodes sized by in-degree',
      'Edges colored by call vs import',
      'Communities as clustered hulls',
    ],
  },

  // Opengrep-powered security scanning
  security: {
    eyebrow: 'SECURITY · POWERED BY OPENGREP',
    title: 'FIND THE BUGS BEFORE THEY SHIP.',
    sub: 'A bundled Opengrep sidecar runs static analysis on every file in your repo — eval calls, SQL injection, hardcoded secrets, weak crypto, XSS sinks. Findings are pinned to buildings in the city, so the skyline literally lights up red where the risk is.',
    summary: { high: 8, med: 23, low: 47, files: 14201, ms: '12.4s' },
    findings: [
      { sev: 'HIGH', rule: 'tainted-sql-string',     path: 'src/api/users.ts',     line: 42, msg: 'User input flows into raw SQL query' },
      { sev: 'HIGH', rule: 'hardcoded-secret-aws',   path: 'src/lib/storage.ts',   line: 12, msg: 'Hardcoded AWS access key id detected' },
      { sev: 'HIGH', rule: 'eval-detected',          path: 'src/utils/parser.ts',  line: 88, msg: 'Use of eval() on untrusted input' },
      { sev: 'MED',  rule: 'weak-crypto-md5',        path: 'src/auth/hash.ts',     line: 7,  msg: 'MD5 is cryptographically broken' },
      { sev: 'MED',  rule: 'xss-react-href',         path: 'src/components/Link.tsx', line: 19, msg: 'href bound to unsanitized prop' },
      { sev: 'MED',  rule: 'path-traversal',         path: 'src/api/files.ts',     line: 56, msg: 'Path traversal via untrusted input' },
      { sev: 'LOW',  rule: 'missing-error-handler',  path: 'src/server.ts',        line: 134, msg: 'Promise rejection not handled' },
    ],
  },

  faq: [
    {
      q: 'Where does my code go?',
      a: 'Nowhere. CodeCity indexes and renders entirely on your machine. The desktop app uses local SQLite, the parser is in-process Rust, and there is no telemetry. The MCP server speaks stdio to your local agent. The only network calls are to GitHub when you clone a public repo.',
    },
    {
      q: 'Which languages are supported?',
      a: 'First-class parsing for 45+ languages via tree-sitter — TypeScript, JavaScript, Python, Rust, Go, Java, Kotlin, Swift, C, C++, Ruby, PHP, Elixir, Scala, Dart, Haskell, OCaml, Erlang, C#, R, Julia, Bash, Zig, Lua, GraphQL, Proto, Dockerfile, and more. Cross-file import resolution is wired for the major ones; the long tail still renders, just with import detection disabled.',
    },
    {
      q: 'How big a repo can it handle?',
      a: 'We test against pytorch (2.16M LOC, ~8s analysis) and the Linux kernel (38M LOC, ~42s). Rendering is consistent 60fps at any size — buildings are instanced, dependency pipes are batched, and large repos progressively stream districts as you fly toward them.',
    },
    {
      q: 'Is it open source?',
      a: 'MIT. The whole stack: codecity-core (the pure Rust analysis engine), codecity-cli, codecity-mcp, and the Tauri desktop client. PRs welcome.',
    },
    {
      q: 'What\'s the MCP server for?',
      a: 'It exposes your code graph to AI agents. When Claude or Cursor asks "what depends on X?" or "where should this new feature live?", it can call CodeCity tools — overview, hubs, find_callers, find_path, community — instead of grep-and-pray. Same data, structured.',
    },
    {
      q: 'Does it work with private repos?',
      a: 'Yes. Point it at any local clone — the app reads files directly, never uploads. For GitHub auth (private repo browsing inside the app), CodeCity uses device-code OAuth; the token lives in your local keychain.',
    },
    {
      q: 'What does it cost?',
      a: 'Nothing. CodeCity is free and open source. Forever. No tiers, no telemetry, no \'pro\' upsell.',
    },
  ],
};

// ─────────────────────────────────────────────────────────────
// Platform detection + download URLs
// ─────────────────────────────────────────────────────────────
const GITHUB_REPO = 'https://github.com/MagnovaAI/codecity';
const RELEASES_BASE = `${GITHUB_REPO}/releases/latest`;

const PLATFORMS = {
  mac:    { id: 'mac',    label: 'macOS',     short: 'Mac',     icon: 'apple',   url: `${RELEASES_BASE}/download/CodeCity.dmg`,        ext: 'DMG · Apple Silicon + Intel' },
  win:    { id: 'win',    label: 'Windows',   short: 'Windows', icon: 'windows', url: `${RELEASES_BASE}/download/CodeCity-Setup.msi`,  ext: 'MSI · x64'                    },
  linux:  { id: 'linux',  label: 'Linux',     short: 'Linux',   icon: 'linux',   url: `${RELEASES_BASE}/download/CodeCity.AppImage`,   ext: 'AppImage · x86_64'             },
};

function detectPlatform() {
  if (typeof navigator === 'undefined') return PLATFORMS.mac;
  const ua = (navigator.userAgent || '').toLowerCase();
  const p  = (navigator.platform  || '').toLowerCase();
  if (/win/.test(p) || /windows/.test(ua))  return PLATFORMS.win;
  if (/linux/.test(p) || /x11/.test(ua))    return PLATFORMS.linux;
  return PLATFORMS.mac;
}

// ─────────────────────────────────────────────────────────────
// Pixel logo — chunky 1-bit style
// ─────────────────────────────────────────────────────────────
const CCLogo = ({ size = 28, color = 'var(--accent, #c8e64a)' }) => {
  // Each "pixel" is one unit in the 10x10 grid. White on accent.
  const grid = [
    "..........",
    ".XX....XX.",
    "X..X..X..X",
    "X..XXXX..X",
    "X..X..X..X",
    "X..X..X..X",
    "X..X..X..X",
    "X..XXXX..X",
    ".XX....XX.",
    "..........",
  ];
  const u = size / 10;
  return (
    <div style={{ width: size, height: size, background: color, display: 'inline-block', position: 'relative', imageRendering: 'pixelated' }}>
      {grid.map((row, y) =>
        [...row].map((c, x) => c === 'X' ? (
          <span key={`${x}-${y}`} style={{
            position: 'absolute',
            left: x * u, top: y * u,
            width: u, height: u,
            background: '#0d0d0f',
          }} />
        ) : null)
      )}
    </div>
  );
};

const CCWordmark = ({ size = 18, color }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
    <CCLogo size={size + 8} color={color} />
    <span style={{
      fontSize: size,
      fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
      fontWeight: 700,
      letterSpacing: '0.02em',
      color: 'var(--cream, #e8dcc8)',
      textTransform: 'uppercase',
    }}>CODECITY</span>
  </div>
);

// ─────────────────────────────────────────────────────────────
// Pixel button — sharp corners, hard drop shadow, btn-press
// ─────────────────────────────────────────────────────────────
const CCButton = ({ kind = 'primary', children, icon, href, big, ...rest }) => {
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    padding: big ? '14px 22px' : '10px 16px',
    fontSize: big ? 14 : 12,
    fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
    fontWeight: 400,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    cursor: 'pointer',
    border: '2px solid #0d0d0f',
    borderRadius: 0,
    whiteSpace: 'nowrap',
    textDecoration: 'none',
    lineHeight: 1.1,
    ...(rest.style || {}),
  };
  const variants = {
    primary: {
      background: 'var(--accent, #c8e64a)',
      color: '#0d0d0f',
    },
    secondary: {
      background: '#1c1c20',
      color: 'var(--cream, #e8dcc8)',
      border: '2px solid var(--border-light, #3a3a44)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--cream-dark, #c8b89c)',
      border: '2px solid transparent',
    },
  };
  const shadowClass =
    kind === 'primary' ? 'pixel-shadow-lime btn-press' :
    kind === 'secondary' ? 'pixel-shadow btn-press' :
    'btn-press';
  const Tag = href ? 'a' : 'button';
  return (
    <Tag href={href} className={shadowClass} {...rest} style={{ ...base, ...variants[kind] }}>
      {icon}
      {children}
    </Tag>
  );
};

// ─────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────
const Icon = {
  arrow: (p = {}) => (
    <svg width="14" height="14" viewBox="0 0 16 16" {...p}>
      <path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  arrowDown: (p = {}) => (
    <svg width="14" height="14" viewBox="0 0 16 16" {...p}>
      <path d="M8 2v11M4 9l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  play: (p = {}) => (
    <svg width="12" height="12" viewBox="0 0 16 16" {...p}>
      <path d="M4 3l9 5-9 5z" fill="currentColor" />
    </svg>
  ),
  github: (p = {}) => (
    <svg width="16" height="16" viewBox="0 0 24 24" {...p}>
      <path fill="currentColor" d="M12 0a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2c-3.34.73-4.04-1.61-4.04-1.61-.55-1.4-1.34-1.78-1.34-1.78-1.1-.75.08-.74.08-.74 1.21.09 1.85 1.25 1.85 1.25 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 12 0z"/>
    </svg>
  ),
  apple: (p = {}) => (
    <svg width="14" height="14" viewBox="0 0 24 24" {...p}>
      <path fill="currentColor" d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
  ),
  windows: (p = {}) => (
    <svg width="14" height="14" viewBox="0 0 24 24" {...p}>
      <path fill="currentColor" d="M0 3.45L9.92 2.1v9.86H0V3.45zm0 17.1l9.92 1.35v-9.74H0v8.39zm10.92 1.49L24 24V12.97H10.92v9.07zM10.92 2L24 0v11.66H10.92V2z"/>
    </svg>
  ),
  linux: (p = {}) => (
    <svg width="14" height="14" viewBox="0 0 24 24" {...p}>
      <path fill="currentColor" d="M12.5 0c-1.95 0-3.55 1.6-3.55 3.55 0 .89.34 1.7.88 2.32-.79 1.05-1.78 3.04-2.6 6.46-.71 2.95-2.13 4.91-2.13 6.85 0 .8.39 1.58 1.02 2.13.21.18.4.49.4.83 0 .35-.13.83.5 1.4.62.57 1.95.46 2.46.31.5-.15.79-.46.84-.92.05-.46.21-.78 1.32-.78.93 0 .96.18 1.21.78.25.6.76.92 1.27.92.5 0 1.83.07 2.45-.5.62-.57.5-1.05.5-1.4 0-.34.18-.65.4-.83.62-.55 1.02-1.33 1.02-2.13 0-1.94-1.42-3.9-2.13-6.85-.82-3.42-1.81-5.41-2.6-6.46.54-.62.88-1.43.88-2.32C16.05 1.6 14.45 0 12.5 0z"/>
    </svg>
  ),
  terminal: (p = {}) => (
    <svg width="14" height="14" viewBox="0 0 16 16" {...p}>
      <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <path d="M4 7l2 2-2 2M8 11h4" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  plus: (p = {}) => (
    <svg width="14" height="14" viewBox="0 0 16 16" {...p}>
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  star: (p = {}) => (
    <svg width="14" height="14" viewBox="0 0 16 16" {...p}>
      <path d="M8 1l2.3 4.7 5.2.8-3.8 3.7.9 5.2L8 12.8l-4.6 2.4.9-5.2L.5 6.5l5.2-.8z" fill="currentColor" />
    </svg>
  ),
  copy: (p = {}) => (
    <svg width="12" height="12" viewBox="0 0 16 16" {...p}>
      <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <path d="M3 11V3a1.5 1.5 0 0 1 1.5-1.5H11" stroke="currentColor" strokeWidth="1.2" fill="none" />
    </svg>
  ),
};

// ─────────────────────────────────────────────────────────────
// Smart download button — detects platform, links to GitHub release
// ─────────────────────────────────────────────────────────────
const DownloadButton = ({ kind = 'primary', big = false, ...rest }) => {
  const [plat, setPlat] = React.useState(PLATFORMS.mac);
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => { setPlat(detectPlatform()); }, []);
  const PIcon = Icon[plat.icon];
  const isPri = kind === 'primary';

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'stretch', ...(rest.style || {}) }}>
      <a href={plat.url} className={`btn-press ${isPri ? 'pixel-shadow-lime' : 'pixel-shadow'}`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: big ? '14px 20px' : '10px 16px',
          fontSize: big ? 14 : 12,
          fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
          textTransform: 'uppercase', letterSpacing: '0.05em',
          background: isPri ? 'var(--accent, #c8e64a)' : '#1c1c20',
          color: isPri ? '#0d0d0f' : 'var(--cream, #e8dcc8)',
          border: '2px solid #0d0d0f',
          borderRight: 'none',
          textDecoration: 'none', cursor: 'pointer',
        }}>
        <PIcon />
        Download · {plat.short}
      </a>
      <button onClick={() => setOpen(!open)} className={`btn-press ${isPri ? 'pixel-shadow-lime' : 'pixel-shadow'}`}
        style={{
          padding: big ? '14px 10px' : '10px 8px',
          background: isPri ? 'var(--accent, #c8e64a)' : '#1c1c20',
          color: isPri ? '#0d0d0f' : 'var(--cream, #e8dcc8)',
          border: '2px solid #0d0d0f',
          borderLeft: '2px solid #0d0d0f',
          cursor: 'pointer',
        }}>
        <svg width="10" height="10" viewBox="0 0 10 10" style={{ display: 'block' }}>
          <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </button>

      {open && (
        <React.Fragment>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
          <div className="pixel-shadow" style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 100,
            minWidth: 280, padding: 0,
            background: '#1c1c20',
            border: '2px solid #0d0d0f',
          }}>
            {Object.values(PLATFORMS).map((p, i) => {
              const I = Icon[p.icon];
              const cur = p.id === plat.id;
              return (
                <a key={p.id} href={p.url} onClick={() => setOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                    borderBottom: i < Object.values(PLATFORMS).length - 1 ? '1px solid var(--border)' : 'none',
                    textDecoration: 'none', color: 'var(--cream, #e8dcc8)',
                    background: cur ? 'rgba(200,230,74,0.08)' : 'transparent',
                    fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 12 }}>
                  <span style={{ color: cur ? 'var(--accent)' : 'var(--muted)' }}><I /></span>
                  <div style={{ flex: 1 }}>
                    <div style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{p.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4, fontFamily: '"JetBrains Mono", ui-monospace, monospace', textTransform: 'none' }}>{p.ext}</div>
                  </div>
                  {cur && <span style={{ color: 'var(--accent)', fontSize: 10 }}>▶</span>}
                </a>
              );
            })}
            <a href={`${GITHUB_REPO}/releases`}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                borderTop: '2px solid var(--border)', background: '#161618',
                fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 11,
                color: 'var(--cream-dark)', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Icon.github />
              <span>ALL RELEASES</span>
            </a>
          </div>
        </React.Fragment>
      )}
    </div>
  );
};

const SectionHead = ({ accent, eyebrow, title, sub, centered }) => (
  <div style={{ maxWidth: centered ? 720 : 760, margin: centered ? '0 auto' : 0, textAlign: centered ? 'center' : 'left' }}>
    <div style={{ display: centered ? 'flex' : 'inline-flex', justifyContent: centered ? 'center' : 'flex-start', alignItems: 'center', gap: 10, fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 11, color: accent, letterSpacing: '0.15em' }}>
      <span style={{ width: 16, height: 4, background: accent }} />
      {eyebrow}
    </div>
    <h2 style={{
      fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
      fontSize: 48, color: 'var(--cream)',
      margin: '18px 0 14px', textTransform: 'uppercase',
      lineHeight: 1.05, letterSpacing: 0,
    }}>
      {title}
    </h2>
    {sub && (
      <p style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 13, color: 'var(--cream-dark)', lineHeight: 1.7, margin: 0 }}>{sub}</p>
    )}
  </div>
);

export { COPY, CCLogo, CCWordmark, CCButton, Icon, DownloadButton, PLATFORMS, GITHUB_REPO, detectPlatform, SectionHead };
