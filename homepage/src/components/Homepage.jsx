import React from 'react';
import { COPY, CCWordmark, CCLogo, CCButton, Icon, DownloadButton, GITHUB_REPO, SectionHead } from './Shared.jsx';
import { CityScene, makeCity } from './CityScene.jsx';
import { GraphView, Security } from './HomepageExtras.jsx';

// CodeCity Homepage — pixel art theme.
// Sharp corners, hard pixel shadows, Silkscreen font, cream/lime palette.
// City canvas is untouched — it pops as colorful 3D against the muted UI.

const Homepage = ({ accent }) => (
  <div style={{ background: '#0d0d0f', color: 'var(--warm)', minHeight: '100%', position: 'relative', overflow: 'hidden' }}>
    {/* Pixel grid background — subtle dotted dot-grid */}
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      backgroundImage: 'radial-gradient(circle, rgba(58,58,68,0.4) 1px, transparent 1px)',
      backgroundSize: '24px 24px',
      maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, #000, transparent 70%)',
      WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, #000, transparent 70%)',
    }} />

    <Nav accent={accent} />
    <Hero accent={accent} />
    <Stats accent={accent} />
    <Showcase accent={accent} />
    <Features accent={accent} />
    <GraphView accent={accent} />
    <Surfaces accent={accent} />
    <Security accent={accent} />
    <UseCases accent={accent} />
    <HowItWorks accent={accent} />
    <Languages accent={accent} />
    <Privacy accent={accent} />
    <FAQ accent={accent} />
    <FinalCTA accent={accent} />
    <Footer accent={accent} />
  </div>
);

// ── Nav ──────────────────────────────────────────────────────
const Nav = ({ accent }) => (
  <nav style={{
    position: 'sticky', top: 0, zIndex: 50, height: 60,
    display: 'flex', alignItems: 'center', padding: '0 28px',
    borderBottom: '2px solid var(--border)',
    background: '#0d0d0f',
  }}>
    <CCWordmark size={14} color={accent} />
    <div style={{ display: 'flex', gap: 22, marginLeft: 40, fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
      {[
        ['Features', '#features'],
        ['Surfaces', '#surfaces'],
        ['Languages', '#languages'],
        ['Docs', `${GITHUB_REPO}#readme`],
        ['Changelog', `${GITHUB_REPO}/releases`],
      ].map(([l, h]) => (
        <a key={l} href={h} style={{ color: 'inherit', textDecoration: 'none' }}>{l}</a>
      ))}
    </div>
    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
      <a href={GITHUB_REPO} className="pixel-shadow-sm btn-press" style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 12px',
        fontSize: 11, fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', color: 'var(--cream)',
        textDecoration: 'none', border: '2px solid #0d0d0f',
        background: '#1c1c20', textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        <Icon.github />
        <span style={{ color: 'var(--accent)' }}>★ 2.4K</span>
      </a>
      <DownloadButton kind="primary" />
    </div>
  </nav>
);

// ── Hero ─────────────────────────────────────────────────────
const Hero = ({ accent }) => {
  const [hov, setHov] = React.useState(null);
  const [pick, setPick] = React.useState(null);
  const layout = React.useMemo(() => makeCity(7, {
    districts: [accent, '#ff8a3d', '#3dd4ff', '#ff3d8a', '#b388ff', '#ffea00'],
    cols: 22, rows: 16, density: 0.78, maxH: 16,
  }), [accent]);

  return (
    <section style={{ position: 'relative', maxWidth: 1240, margin: '0 auto', padding: '64px 32px 0', textAlign: 'center' }}>
      <Pill accent={accent}>
        <span className="blink-dot" style={{ width: 6, height: 6, background: accent, display: 'inline-block' }} />
        <span>V1.0 LIVE · OPEN SOURCE</span>
        <span style={{ color: 'var(--muted)' }}>▶</span>
      </Pill>
      <h1 style={{
        fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
        fontSize: 72,
        lineHeight: 1.0,
        margin: '32px auto 24px',
        maxWidth: 980,
        color: 'var(--cream)',
        textTransform: 'uppercase',
        letterSpacing: 0,
      }}>
        SEE YOUR<br/>
        <span style={{ color: accent, textShadow: `4px 4px 0 var(--lime-shadow)` }}>CODEBASE.</span><br/>
        NOT YOUR FILE TREE.
      </h1>
      <p style={{
        fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
        fontSize: 14, lineHeight: 1.7, color: 'var(--cream-dark)',
        maxWidth: 620, margin: '0 auto 36px',
        letterSpacing: 0.2,
      }}>
        Folders become districts. Files become buildings. Complexity becomes skyline. Walk through any repo and see what to fix — at a glance.
      </p>
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
        <DownloadButton kind="primary" big />
        <CCButton kind="secondary" big href={GITHUB_REPO} icon={<Icon.github />}>SOURCE</CCButton>
      </div>
      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 20, fontSize: 10, color: 'var(--dim)', flexWrap: 'wrap', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        <span>[+] 45 LANGUAGES</span>
        <span style={{ color: 'var(--border-light)' }}>·</span>
        <span>[+] LOCAL-FIRST</span>
        <span style={{ color: 'var(--border-light)' }}>·</span>
        <span>[+] MIT LICENSE</span>
      </div>

      {/* Hero city — in pixel frame */}
      <div className="pixel-shadow scanlines" style={{
        marginTop: 56, height: 540,
        position: 'relative',
        background: '#06060b',
        border: '2px solid var(--border-light)',
        overflow: 'hidden',
      }}>
        <CityScene layout={layout} tilt={62} spin={28} cell={15} auto speed={100}
          hovered={hov} setHovered={setHov} picked={pick} setPicked={setPick} glow={accent} />
        {/* Faux app chrome — pixel-themed */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 36,
          display: 'flex', alignItems: 'center', padding: '0 12px', gap: 14,
          background: '#1c1c20', borderBottom: '2px solid var(--border)',
        }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {['#ff3d8a', '#ff8a3d', accent].map(c => <span key={c} style={{ width: 10, height: 10, background: c, border: '1px solid #0d0d0f' }} />)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: 'var(--cream)', fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', textTransform: 'uppercase' }}>
            <CCLogo size={12} color={accent} />
            <span>CODECITY</span>
            <span style={{ color: 'var(--dim)' }}>/</span>
            <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', textTransform: 'none', color: 'var(--cream-dark)' }}>pytorch/pytorch</span>
            <span style={{ marginLeft: 8, padding: '2px 6px', background: 'rgba(200,230,74,0.12)', color: accent, fontSize: 9, border: `1px solid ${accent}40` }}>● READY</span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            {['FOLDER', 'CPLX', 'DEPS', 'UNUSED', 'TYPES', 'SIZE'].map((t,i) => (
              <span key={t} style={{
                padding: '3px 8px', fontSize: 9, fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
                background: i === 2 ? accent : '#0d0d0f',
                color: i === 2 ? '#0d0d0f' : 'var(--cream-dark)',
                border: `1px solid ${i === 2 ? accent : 'var(--border-light)'}`,
                letterSpacing: '0.05em',
              }}>{t}</span>
            ))}
          </div>
        </div>
        {/* HUD bottom */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 28,
          display: 'flex', alignItems: 'center', padding: '0 14px', gap: 18,
          fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11,
          background: '#1c1c20', borderTop: '2px solid var(--border)', color: 'var(--cream-dark)',
        }}>
          <span style={{ color: accent }}>●</span>
          <span>14,201 FILES</span>
          <span style={{ color: 'var(--dim)' }}>·</span>
          <span>2.16M LOC</span>
          <span style={{ color: 'var(--dim)' }}>·</span>
          <span>6 DISTRICTS</span>
          <span style={{ color: 'var(--dim)' }}>·</span>
          <span>2,612 UNUSED</span>
          <div style={{ flex: 1 }} />
          <span style={{ color: 'var(--dim)' }}>60 FPS · ↻ ROTATING · HOVER</span>
        </div>
        {/* Pixel tooltip */}
        {(hov != null || pick != null) && (() => {
          const b = layout.find(x => x.id === (pick != null ? pick : hov));
          if (!b) return null;
          return (
            <div className="pixel-shadow" style={{
              position: 'absolute', bottom: 48, left: 18,
              padding: '12px 14px', minWidth: 240,
              background: '#0d0d0f',
              border: `2px solid ${b.color}`,
              fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ width: 10, height: 10, background: b.color }} />
                <span style={{ fontSize: 12, color: 'var(--cream)', textTransform: 'uppercase' }}>
                  {b.h > 10 ? 'TENSOR_OPS.PY' : b.h > 6 ? 'REGISTRY.PY' : 'HELPERS.PY'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 14, fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase' }}>
                <span><span style={{ color: 'var(--cream)' }}>{b.h * 47}</span> LINES</span>
                <span><span style={{ color: 'var(--cream)' }}>{Math.max(1, b.h)}</span> FNS</span>
                <span><span style={{ color: 'var(--cream)' }}>{b.h * 3}</span> CPLX</span>
              </div>
            </div>
          );
        })()}
      </div>
    </section>
  );
};

// ── Stats strip ──────────────────────────────────────────────
const Stats = ({ accent }) => (
  <section style={{ maxWidth: 1240, margin: '56px auto 0', padding: '0 32px' }}>
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0,
      border: '2px solid var(--border)',
      background: '#1c1c20',
    }}>
      {COPY.stats.map((s, i) => (
        <div key={i} style={{
          padding: '24px 24px',
          borderLeft: i ? '1px dashed var(--border-light)' : 'none',
        }}>
          <div style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 32, color: 'var(--cream)' }}>{s.value}</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
        </div>
      ))}
    </div>
  </section>
);

// ── Showcase ─────────────────────────────────────────────────
const Showcase = ({ accent }) => {
  const repos = [
    { name: 'pytorch/pytorch', stars: '82K', loc: '2.16M', seed: 11, palette: ['#3dd4ff', '#ff8a3d', accent, '#ff3d8a'] },
    { name: 'facebook/react',  stars: '230K', loc: '720K', seed: 23, palette: ['#3dd4ff', accent, '#ffea00'] },
    { name: 'torvalds/linux',  stars: '180K', loc: '38M',  seed: 47, palette: ['#ff8a3d', '#b388ff', accent] },
    { name: 'rust-lang/rust',  stars: '95K', loc: '4.1M', seed: 31, palette: ['#ff8a3d', '#ffea00', accent] },
  ];
  return (
    <section style={{ maxWidth: 1240, margin: '0 auto', padding: '88px 32px 40px' }}>
      <SectionLabel accent={accent}>BATTLE-TESTED ON THE BIGGEST REPOS</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18, marginTop: 24 }}>
        {repos.map(r => <RepoCard key={r.name} repo={r} accent={accent} />)}
      </div>
    </section>
  );
};

const RepoCard = ({ repo, accent }) => {
  const [hover, setHover] = React.useState(false);
  const layout = React.useMemo(() => makeCity(repo.seed, { districts: repo.palette, cols: 14, rows: 10, density: 0.7, maxH: 10 }), [repo.seed]);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      className={hover ? 'pixel-shadow-lime' : 'pixel-shadow'}
      style={{
        background: '#1c1c20',
        border: `2px solid ${hover ? accent : 'var(--border-light)'}`,
        padding: 12,
        transition: 'border-color 0.12s steps(2), box-shadow 0.12s steps(2)',
        cursor: 'pointer',
      }}>
      <div style={{ height: 130, marginBottom: 12, position: 'relative', overflow: 'hidden', background: '#06060b', border: '1px solid var(--border)' }}>
        <CityScene layout={layout} tilt={64} spin={hover ? 90 : 35} cell={9} glow={accent} showGrid={false} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}>
        <span style={{ fontSize: 12, color: 'var(--cream)' }}>{repo.name}</span>
        <span style={{ fontSize: 10, color: 'var(--muted)' }}>{repo.loc}</span>
      </div>
    </div>
  );
};

// ── Features ─────────────────────────────────────────────────
const Features = ({ accent }) => {
  const [active, setActive] = React.useState(0);
  const f = COPY.features[active];
  return (
    <section id="features" style={{ maxWidth: 1240, margin: '0 auto', padding: '88px 32px' }}>
      <SectionHead accent={accent}
        eyebrow="FEATURES"
        title="SIX LENSES ON YOUR REPO."
        sub="Click any to explore. Each lens computes from the same symbol graph — Louvain communities, hubs, entry points, complexity, callers, churn."
      />
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, marginTop: 48 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {COPY.features.map((feat, i) => {
            const isActive = i === active;
            return (
              <button key={feat.tag} onClick={() => setActive(i)}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '14px 16px',
                  background: isActive ? '#1c1c20' : 'transparent',
                  border: '2px solid ' + (isActive ? accent : 'var(--border)'),
                  borderBottomWidth: i === COPY.features.length - 1 ? 2 : (isActive ? 2 : 0),
                  cursor: 'pointer',
                  fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
                  position: 'relative',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: isActive ? accent : 'var(--dim)', letterSpacing: '0.05em' }}>{String(i+1).padStart(2, '0')}</span>
                  <span style={{ fontSize: 10, color: isActive ? accent : 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{feat.tag}</span>
                  {isActive && <span style={{ marginLeft: 'auto', color: accent }}>▶</span>}
                </div>
                <div style={{ fontSize: 13, color: isActive ? 'var(--cream)' : 'var(--cream-dark)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                  {feat.title}
                </div>
              </button>
            );
          })}
        </div>

        <div className="pixel-shadow" style={{
          background: '#1c1c20', border: '2px solid var(--border-light)',
          padding: 32, minHeight: 420, position: 'relative', overflow: 'hidden',
        }}>
          <div key={active} style={{ animation: 'fade-in 0.3s steps(6)' }}>
            <div style={{ display: 'inline-block', padding: '4px 10px', background: accent, color: '#0d0d0f', fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 20 }}>
              ◆ {f.tag}
            </div>
            <h3 style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 28, color: 'var(--cream)', margin: '0 0 16px', textTransform: 'uppercase', lineHeight: 1.15 }}>{f.title}</h3>
            <p style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 13, color: 'var(--cream-dark)', lineHeight: 1.75, maxWidth: 500, margin: 0 }}>{f.body}</p>
            <div style={{
              marginTop: 24, padding: '10px 14px',
              background: '#0d0d0f', border: `1px solid ${accent}`,
              display: 'inline-flex', alignItems: 'center', gap: 10,
              fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 12, color: accent,
            }}>
              <span>›</span>
              <span style={{ color: 'var(--cream)' }}>{f.example}</span>
            </div>
          </div>
          <div style={{ position: 'absolute', right: 24, bottom: 24, width: 220, height: 150, background: '#06060b', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <CityScene layout={makeCity(active * 11 + 3, { cols: 13, rows: 9, density: 0.78, maxH: 9, districts: [accent, '#3dd4ff', '#ff8a3d'] })}
              tilt={64} spin={active * 30 + 10} cell={9} glow={accent} showGrid={false} />
          </div>
        </div>
      </div>
    </section>
  );
};

// ── Three surfaces ───────────────────────────────────────────
const Surfaces = ({ accent }) => (
  <section id="surfaces" style={{ maxWidth: 1240, margin: '0 auto', padding: '40px 32px 100px' }}>
    <SectionHead accent={accent}
      eyebrow="ONE ENGINE · THREE SURFACES"
      title="FOR HUMANS · SCRIPTS · AGENTS."
      sub="Same Rust core. Three front doors. Pick what fits your workflow."
    />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginTop: 48 }}>
      {COPY.surfaces.map((s, i) => (
        <div key={s.kind} className="pixel-shadow" style={{
          padding: 24,
          background: '#1c1c20',
          border: `2px solid ${i === 0 ? accent : 'var(--border-light)'}`,
          position: 'relative',
        }}>
          {i === 0 && (
            <span style={{
              position: 'absolute', top: -10, right: 12,
              padding: '2px 8px', background: accent, color: '#0d0d0f',
              fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 9,
              letterSpacing: '0.08em', border: '2px solid #0d0d0f',
            }}>★ START HERE</span>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 10, color: accent, letterSpacing: '0.1em' }}>{s.kind}</span>
            <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11, color: 'var(--dim)' }}>$ {s.tag}</span>
          </div>
          <h3 style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 20, color: 'var(--cream)', margin: '0 0 10px', textTransform: 'uppercase' }}>{s.title}</h3>
          <p style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 12, color: 'var(--cream-dark)', lineHeight: 1.7, margin: '0 0 16px' }}>{s.body}</p>
          <div style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 11, color: 'var(--muted)', fontStyle: 'italic', marginBottom: 16 }}>{s.bullet}</div>
          <div style={{
            padding: '10px 12px', background: '#0d0d0f', border: '1px solid var(--border)',
            fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11, color: 'var(--cream-dark)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ color: accent }}>$</span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.cmd.replace('$ ', '')}</span>
            <span style={{ color: 'var(--dim)', cursor: 'pointer' }}><Icon.copy /></span>
          </div>
        </div>
      ))}
    </div>
  </section>
);

// ── Use cases ────────────────────────────────────────────────
const UseCases = ({ accent }) => (
  <section style={{ maxWidth: 1240, margin: '0 auto', padding: '40px 32px 100px' }}>
    <SectionHead accent={accent} eyebrow="USE CASES" title="THREE JOBS DEVS HIRE IT FOR." />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, marginTop: 48, border: '2px solid var(--border)' }}>
      {COPY.useCases.map((u, i) => (
        <div key={i} style={{
          background: '#1c1c20', padding: 32,
          borderLeft: i ? '1px dashed var(--border-light)' : 'none',
          minHeight: 280, display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 11, color: 'var(--dim)', marginBottom: 22, letterSpacing: '0.1em' }}>
            {String(i+1).padStart(2, '0')} / 03
          </div>
          <h3 style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 20, color: 'var(--cream)', margin: '0 0 12px', textTransform: 'uppercase', lineHeight: 1.2 }}>{u.title}</h3>
          <p style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 12, color: 'var(--cream-dark)', lineHeight: 1.7, margin: 0, flex: 1 }}>{u.body}</p>
          <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px dashed var(--border-light)' }}>
            <div style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 24, color: accent }}>{u.stat}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{u.statLabel}</div>
          </div>
        </div>
      ))}
    </div>
  </section>
);

// ── How it works ─────────────────────────────────────────────
const HowItWorks = ({ accent }) => {
  const steps = [
    { num: '01', title: 'WALK',     body: 'Discover every source file. Respects .gitignore, monorepo conventions, lockfiles.',                                                detail: 'codecity-core/discovery' },
    { num: '02', title: 'PARSE',    body: 'tree-sitter parses 45+ languages in parallel via rayon. Functions, classes, types, imports, complexity.',                          detail: '~45 GRAMMARS · IN-PROCESS' },
    { num: '03', title: 'RESOLVE',  body: 'Cross-file import resolution with tsconfig paths, zig build deps, and language-specific resolvers.',                              detail: 'TSCONFIG + ZIGDEPS' },
    { num: '04', title: 'NETWORK',  body: 'Louvain community detection partitions the symbol graph. In-degree ranks hubs; out-degree-zero finds entry points.',               detail: 'LOUVAIN · DEGREE · FCOSE' },
    { num: '05', title: 'LAYOUT',   body: 'Force-directed FCoSE layout positions districts on the plane. Buildings get heights, footprints, and pipes.',                      detail: 'CITY SNAPSHOT' },
    { num: '06', title: 'RENDER',   body: 'React 19 + @react-three/fiber draws instanced buildings, batched dependency pipes, 60fps at any scale.',                            detail: 'TAURI 2 · WEBGL2' },
  ];
  return (
    <section style={{ maxWidth: 1240, margin: '0 auto', padding: '40px 32px 100px' }}>
      <SectionHead accent={accent}
        eyebrow="HOW IT WORKS"
        title="A 6-STAGE PIPELINE, IN RUST."
        sub="From git clone to skyline: under 10 seconds for most repos, under a minute for the kernel."
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginTop: 48 }}>
        {steps.map((s, i) => (
          <div key={s.num} className="pixel-shadow" style={{
            position: 'relative', padding: 24,
            background: '#1c1c20', border: '2px solid var(--border-light)',
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 12 }}>
              <span style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 26, color: accent }}>{s.num}</span>
              <span style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 18, color: 'var(--cream)' }}>{s.title}</span>
            </div>
            <p style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 12, color: 'var(--cream-dark)', lineHeight: 1.7, margin: '0 0 14px' }}>{s.body}</p>
            <div style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 10, color: accent, opacity: 0.85, letterSpacing: '0.02em' }}>{s.detail}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

// ── Languages + scale ────────────────────────────────────────
const Languages = ({ accent }) => (
  <section id="languages" style={{ maxWidth: 1240, margin: '0 auto', padding: '40px 32px 100px' }}>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56 }}>
      <div>
        <SectionLabel accent={accent}>LANGUAGES</SectionLabel>
        <h2 style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 38, color: 'var(--cream)', margin: '20px 0 16px', textTransform: 'uppercase', lineHeight: 1.05 }}>
          45+ LANGUAGES.<br/>ONE SYMBOL GRAPH.
        </h2>
        <p style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 13, color: 'var(--cream-dark)', lineHeight: 1.7, margin: '0 0 24px' }}>
          tree-sitter grammars for the languages you ship. Color = dominant language. Building height = cyclomatic complexity, not LOC.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
          {COPY.languages.map(l => (
            <span key={l.name} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 10px', background: '#1c1c20',
              border: '1px solid var(--border-light)',
              fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 11, color: 'var(--cream)',
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              <span style={{ width: 10, height: 10, background: l.color, border: '1px solid #0d0d0f' }} />
              {l.name}
            </span>
          ))}
        </div>
        <div style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11, color: 'var(--muted)', lineHeight: 1.7 }}>
          <span style={{ color: accent }}>+ {COPY.moreLangs.length} MORE: </span>
          {COPY.moreLangs.join(' · ')}
        </div>
      </div>
      <div>
        <SectionLabel accent={accent}>SCALE</SectionLabel>
        <h2 style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 38, color: 'var(--cream)', margin: '20px 0 24px', textTransform: 'uppercase', lineHeight: 1.05 }}>
          FROM SCRIPT TO KERNEL.
        </h2>
        <div className="pixel-shadow" style={{ background: '#1c1c20', border: '2px solid var(--border-light)' }}>
          {COPY.scaleStops.map((s, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '40px 1fr 80px 60px',
              padding: '14px 16px', gap: 12, alignItems: 'center',
              borderTop: i ? '1px dashed var(--border-light)' : 'none',
              fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            }}>
              <span style={{ width: 14, height: 14, background: ['#3a3a44', '#3dd4ff', '#c8e64a', '#ff8a3d', accent][i], boxShadow: i === 4 ? `0 0 8px ${accent}` : 'none' }} />
              <div>
                <div style={{ fontSize: 12, color: 'var(--cream)' }}>{s.repo}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2, textTransform: 'uppercase' }}>{s.note}</div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--cream-dark)' }}>{s.files} · {s.loc}</div>
              <div style={{ fontSize: 11, color: accent, textAlign: 'right' }}>{s.ms}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

// ── Privacy ──────────────────────────────────────────────────
const Privacy = ({ accent }) => (
  <section style={{ maxWidth: 1240, margin: '0 auto', padding: '40px 32px 100px' }}>
    <div className="pixel-shadow scanlines" style={{
      padding: '48px 56px',
      background: '#1c1c20', border: '2px solid var(--border-light)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
        <div>
          <SectionLabel accent={accent}>PRIVACY · OPEN SOURCE · MIT</SectionLabel>
          <h2 style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 38, color: 'var(--cream)', margin: '20px 0 16px', textTransform: 'uppercase', lineHeight: 1.05 }}>
            YOUR CODE STAYS<br/>ON YOUR MACHINE.
          </h2>
          <p style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 13, color: 'var(--cream-dark)', lineHeight: 1.7, margin: 0 }}>
            CodeCity is a local-first desktop app. No cloud. No telemetry. No sign-in walls. The Rust analysis engine runs in-process. The SQLite cache lives next to your data folder. The MCP server speaks stdio to your local agent.
          </p>
          <div style={{ display: 'flex', gap: 14, marginTop: 24, flexWrap: 'wrap' }}>
            <CCButton kind="secondary" href={GITHUB_REPO} icon={<Icon.github />}>VIEW SOURCE</CCButton>
            <CCButton kind="ghost" href={`${GITHUB_REPO}/blob/main/docs/ARCHITECTURE.md`}>READ ARCHITECTURE ▶</CCButton>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[
            { k: '0',    v: 'NETWORK CALLS' },
            { k: 'MIT',  v: 'OPEN SOURCE' },
            { k: '100%', v: 'ON-DEVICE PARSING' },
            { k: 'RUST', v: 'MEMORY-SAFE ENGINE' },
          ].map((it, i) => (
            <div key={i} style={{
              padding: '20px 18px', background: '#0d0d0f',
              border: '1px solid var(--border-light)',
            }}>
              <div style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 26, color: 'var(--cream)' }}>{it.k}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 6, letterSpacing: '0.05em' }}>{it.v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

// ── FAQ ──────────────────────────────────────────────────────
const FAQ = ({ accent }) => {
  const [open, setOpen] = React.useState(0);
  return (
    <section style={{ maxWidth: 820, margin: '0 auto', padding: '40px 32px 100px' }}>
      <SectionHead accent={accent} eyebrow="FAQ" title="REASONABLE QUESTIONS." centered />
      <div style={{ marginTop: 40, border: '2px solid var(--border-light)' }}>
        {COPY.faq.map((f, i) => (
          <div key={i} style={{
            borderTop: i ? '1px dashed var(--border-light)' : 'none',
            background: open === i ? '#1c1c20' : 'transparent',
          }}>
            <button onClick={() => setOpen(open === i ? -1 : i)}
              style={{
                width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
                padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                color: 'var(--cream)', fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 13,
                textTransform: 'uppercase', textAlign: 'left', gap: 16, letterSpacing: '0.02em',
              }}>
              <span>{open === i ? '▼' : '▶'} {f.q}</span>
              <span style={{ color: open === i ? accent : 'var(--dim)' }}>{open === i ? '−' : '+'}</span>
            </button>
            {open === i && (
              <div style={{
                padding: '0 24px 22px',
                fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 12,
                color: 'var(--cream-dark)', lineHeight: 1.75,
              }}>
                {f.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

// ── Final CTA ────────────────────────────────────────────────
const FinalCTA = ({ accent }) => (
  <section style={{ position: 'relative', padding: '100px 32px 60px', textAlign: 'center', overflow: 'hidden' }}>
    <div style={{ position: 'relative', maxWidth: 800, margin: '0 auto' }}>
      <h2 style={{
        fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 68,
        color: 'var(--cream)', margin: '0 0 20px',
        textTransform: 'uppercase', lineHeight: 1, letterSpacing: 0,
      }}>
        OPEN THE<br/>
        <span style={{ color: accent, textShadow: `4px 4px 0 var(--lime-shadow)` }}>CITY.</span>
      </h2>
      <p style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 14, color: 'var(--cream-dark)', margin: '0 0 36px', lineHeight: 1.6 }}>
        FREE. OPEN SOURCE. LOCAL-FIRST. 30 SECONDS FROM INSTALL TO YOUR FIRST SKYLINE.
      </p>
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
        <DownloadButton kind="primary" big />
        <CCButton kind="secondary" big href={GITHUB_REPO}>★ STAR ON GITHUB</CCButton>
      </div>
    </div>
  </section>
);

// ── Footer ───────────────────────────────────────────────────
const Footer = ({ accent }) => (
  <footer style={{ borderTop: '2px solid var(--border)', padding: '48px 32px 28px' }}>
    <div style={{ maxWidth: 1240, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: 48, marginBottom: 36 }}>
      <div>
        <CCWordmark size={14} color={accent} />
        <p style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 11, color: 'var(--muted)', lineHeight: 1.7, margin: '14px 0 16px', maxWidth: 280 }}>
          VISUALIZE, NAVIGATE, AND REFACTOR ANY CODEBASE AS A 3D CITY. OPEN SOURCE UNDER MIT.
        </p>
        <a href={GITHUB_REPO} className="pixel-shadow-sm" style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32, background: '#1c1c20',
          border: '2px solid #0d0d0f', color: 'var(--cream)', textDecoration: 'none',
        }}>
          <Icon.github />
        </a>
      </div>
      {[
        { title: 'PRODUCT', links: [
          ['DOWNLOAD', `${GITHUB_REPO}/releases/latest`],
          ['CLI', `${GITHUB_REPO}/tree/main/crates/codecity-cli`],
          ['MCP SERVER', `${GITHUB_REPO}/tree/main/crates/codecity-mcp`],
          ['CHANGELOG', `${GITHUB_REPO}/releases`],
        ]},
        { title: 'DOCS', links: [
          ['GETTING STARTED', `${GITHUB_REPO}/blob/main/docs/GETTING-STARTED.md`],
          ['ARCHITECTURE',    `${GITHUB_REPO}/blob/main/docs/ARCHITECTURE.md`],
          ['CONFIGURATION',   `${GITHUB_REPO}/blob/main/docs/CONFIGURATION.md`],
          ['CONTRIBUTING',    `${GITHUB_REPO}/blob/main/CONTRIBUTING.md`],
        ]},
        { title: 'COMMUNITY', links: [
          ['GITHUB',      GITHUB_REPO],
          ['ISSUES',      `${GITHUB_REPO}/issues`],
          ['DISCUSSIONS', `${GITHUB_REPO}/discussions`],
          ['LICENSE',     `${GITHUB_REPO}/blob/main/LICENSE`],
        ]},
      ].map(col => (
        <div key={col.title}>
          <div style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 11, color: accent, marginBottom: 14, letterSpacing: '0.1em' }}>
            ▶ {col.title}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {col.links.map(([l, h]) => (
              <a key={l} href={h} style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 11, color: 'var(--cream-dark)', textDecoration: 'none', letterSpacing: '0.03em' }}>{l}</a>
            ))}
          </div>
        </div>
      ))}
    </div>
    <div style={{
      maxWidth: 1240, margin: '0 auto', paddingTop: 22,
      borderTop: '1px dashed var(--border-light)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
      fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 10, color: 'var(--dim)', letterSpacing: '0.08em',
    }}>
      <span>© 2026 MAGNOVAAI · MIT LICENSE</span>
      <span>BUILT WITH TAURI 2 · RUST · REACT 19</span>
    </div>
  </footer>
);

// ── Atoms ────────────────────────────────────────────────────
const Pill = ({ accent, children }) => (
  <div className="pixel-shadow-sm" style={{
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '6px 12px',
    background: '#1c1c20',
    border: '2px solid #0d0d0f',
    fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 11, color: 'var(--cream-dark)',
    letterSpacing: '0.08em',
  }}>
    {children}
  </div>
);

const SectionLabel = ({ accent, children }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: 10,
    fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 11, color: accent,
    letterSpacing: '0.15em', textTransform: 'uppercase',
  }}>
    <span style={{ width: 16, height: 4, background: accent }} />
    {children}
  </div>
);

export default Homepage;
export { Homepage };
