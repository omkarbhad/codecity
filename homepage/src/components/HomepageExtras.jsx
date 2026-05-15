import React from 'react';
import { COPY, CCButton, Icon, SectionHead } from './Shared.jsx';
import { CityScene, makeCity } from './CityScene.jsx';

// Additional homepage sections — Graph View + Security.
// Pixel-themed to match the rest of the page.

// ──────────────────────────────────────────────────────────────
// GRAPH VIEW SECTION
// Alternative visualization to the 3D city: a 2D force-directed graph
// rendered in SVG. Square nodes, colored by community.
// ──────────────────────────────────────────────────────────────
const GraphView = ({ accent }) => {
  const [view, setView] = React.useState('graph');
  const [hovered, setHovered] = React.useState(null);

  // Deterministic graph layout — 6 communities in a soft FCoSE-like spread
  const graph = React.useMemo(() => buildGraph(accent), [accent]);
  // Matching city layout — same community palette
  const cityLayout = React.useMemo(() => makeCity(17, {
    cols: 18, rows: 12, density: 0.78, maxH: 14,
    districts: graph.communityColors,
  }), [graph]);

  return (
    <section style={{ maxWidth: 1240, margin: '0 auto', padding: '40px 32px 100px' }}>
      <SectionHead accent={accent}
        eyebrow={COPY.views.eyebrow}
        title={COPY.views.title}
        sub={COPY.views.sub}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 24, marginTop: 48, alignItems: 'stretch' }}>
        {/* Left: list of points + toggle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="pixel-shadow" style={{ background: '#1c1c20', border: '2px solid var(--border-light)', padding: 22 }}>
            <div style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 12, color: accent, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              [ 3D CITY MODE ]
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {COPY.views.cityPoints.map(p => (
                <div key={p} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 12, color: 'var(--cream-dark)', lineHeight: 1.5 }}>
                  <span style={{ color: accent, marginTop: 2 }}>▶</span>
                  <span style={{ flex: 1 }}>{p}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pixel-shadow" style={{ background: '#1c1c20', border: '2px solid var(--border-light)', padding: 22 }}>
            <div style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 12, color: accent, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              [ 2D GRAPH MODE ]
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {COPY.views.graphPoints.map(p => (
                <div key={p} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 12, color: 'var(--cream-dark)', lineHeight: 1.5 }}>
                  <span style={{ color: accent, marginTop: 2 }}>▶</span>
                  <span style={{ flex: 1 }}>{p}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11, color: 'var(--muted)', lineHeight: 1.7, padding: '4px 4px' }}>
            <span style={{ color: accent }}>›</span> Press <kbd style={kbdStyle}>V</kbd> in the app to flip modes. Selection persists.
          </div>
        </div>

        {/* Right: the viewer */}
        <div className="pixel-shadow scanlines" style={{
          background: '#06060b', border: '2px solid var(--border-light)',
          minHeight: 460, position: 'relative', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Toggle bar */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', gap: 8, background: '#1c1c20', borderBottom: '2px solid var(--border)' }}>
            <span style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 10, color: 'var(--muted)', marginRight: 8, letterSpacing: '0.08em' }}>VIEW:</span>
            <ToggleBtn active={view === 'city'}  onClick={() => setView('city')}  accent={accent}>3D CITY</ToggleBtn>
            <ToggleBtn active={view === 'graph'} onClick={() => setView('graph')} accent={accent}>2D GRAPH</ToggleBtn>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 10, color: 'var(--cream-dark)' }}>
              <span><span style={{ color: accent }}>●</span> {graph.nodes.length} nodes</span>
              <span><span style={{ color: 'var(--muted)' }}>—</span> {graph.edges.length} edges</span>
              <span><span style={{ color: 'var(--cream)' }}>{graph.communityColors.length}</span> communities</span>
            </div>
          </div>

          {/* The display */}
          <div style={{ flex: 1, position: 'relative', minHeight: 420 }}>
            {view === 'graph' ? (
              <GraphSVG graph={graph} accent={accent} hovered={hovered} setHovered={setHovered} />
            ) : (
              <CityScene
                layout={cityLayout}
                tilt={62} spin={28} cell={14} auto speed={140}
                hovered={null} setHovered={() => {}} picked={null} setPicked={() => {}}
                glow={accent}
              />
            )}
          </div>

          {/* Bottom HUD */}
          <div style={{
            padding: '8px 14px', background: '#1c1c20', borderTop: '2px solid var(--border)',
            fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 10, color: 'var(--muted)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span>{view === 'graph' ? '> FCOSE LAYOUT · LOUVAIN COMMUNITIES' : '> FCOSE PROJECTED · DISTRICTS BY COMMUNITY'}</span>
            <span style={{ color: 'var(--dim)' }}>↻ SAME SNAPSHOT</span>
          </div>
        </div>
      </div>
    </section>
  );
};

const ToggleBtn = ({ active, onClick, accent, children }) => (
  <button onClick={onClick} className="btn-press" style={{
    padding: '5px 12px',
    fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 10,
    background: active ? accent : 'transparent',
    color: active ? '#0d0d0f' : 'var(--cream-dark)',
    border: `1px solid ${active ? accent : 'var(--border-light)'}`,
    textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer',
  }}>{children}</button>
);

const kbdStyle = {
  display: 'inline-block', padding: '1px 6px',
  background: '#1c1c20', border: '1px solid var(--border-light)',
  borderBottom: '2px solid var(--border-light)',
  fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 10, color: 'var(--cream)',
  margin: '0 2px',
};

// ─── Graph data + SVG ────────────────────────────────────────
function buildGraph(accent) {
  // 6 community clusters, manually positioned for a pleasing spread
  const palette = [accent, '#3dd4ff', '#ff8a3d', '#ff3d8a', '#b388ff', '#ffea00'];
  const W = 800, H = 460;
  const centers = [
    { x: 0.25, y: 0.30, color: palette[0] },
    { x: 0.55, y: 0.22, color: palette[1] },
    { x: 0.78, y: 0.42, color: palette[2] },
    { x: 0.68, y: 0.72, color: palette[3] },
    { x: 0.34, y: 0.70, color: palette[4] },
    { x: 0.50, y: 0.50, color: palette[5] },
  ];

  // Deterministic pseudo-random
  let s = 42;
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };

  const nodes = [];
  centers.forEach((c, ci) => {
    const count = 4 + Math.floor(rand() * 4); // 4-7 nodes per cluster
    for (let i = 0; i < count; i++) {
      const r = 0.04 + rand() * 0.08;
      const angle = rand() * Math.PI * 2;
      const x = c.x + Math.cos(angle) * r;
      const y = c.y + Math.sin(angle) * r * 0.7;
      const isHub = i === 0; // first node of each cluster is the hub
      nodes.push({
        id: nodes.length,
        x: x * W, y: y * H,
        size: isHub ? 14 : 6 + Math.floor(rand() * 5),
        color: c.color,
        cluster: ci,
        isHub,
        name: isHub ? hubName(ci) : `${fileBase(ci)}_${i}.${fileExt(ci)}`,
        degree: isHub ? 40 + Math.floor(rand() * 60) : 1 + Math.floor(rand() * 8),
      });
    }
  });

  // Build edges — heavy within cluster, sparse between
  const edges = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      const sameCluster = a.cluster === b.cluster;
      const p = sameCluster ? 0.45 : 0.02;
      if (rand() < p) {
        edges.push({ from: a.id, to: b.id, sameCluster, isImport: rand() < 0.5 });
      }
    }
  }

  return { nodes, edges, communityColors: palette, W, H };
}

function hubName(i)  { return ['app.rs', 'index.ts', 'auth.py', 'models.go', 'utils.kt', 'core.cpp'][i] || 'hub'; }
function fileBase(i) { return ['handler', 'route', 'user', 'model', 'helper', 'engine'][i] || 'file'; }
function fileExt(i)  { return ['rs', 'ts', 'py', 'go', 'kt', 'cpp'][i] || 'rs'; }

const GraphSVG = ({ graph, accent, hovered, setHovered }) => {
  const nodeMap = React.useMemo(() => Object.fromEntries(graph.nodes.map(n => [n.id, n])), [graph]);
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000 / 8);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${graph.W} ${graph.H}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
        {/* Community hulls — rough convex hull approximation as soft rects */}
        {graph.communityColors.map((c, ci) => {
          const ns = graph.nodes.filter(n => n.cluster === ci);
          if (ns.length === 0) return null;
          const xs = ns.map(n => n.x), ys = ns.map(n => n.y);
          const x0 = Math.min(...xs) - 18, x1 = Math.max(...xs) + 18;
          const y0 = Math.min(...ys) - 18, y1 = Math.max(...ys) + 18;
          return (
            <rect key={ci} x={x0} y={y0} width={x1 - x0} height={y1 - y0}
              fill={c} fillOpacity={0.06}
              stroke={c} strokeOpacity={0.35} strokeWidth={1} strokeDasharray="3 3" />
          );
        })}

        {/* Edges */}
        {graph.edges.map((e, i) => {
          const a = nodeMap[e.from], b = nodeMap[e.to];
          if (!a || !b) return null;
          const isHL = hovered != null && (e.from === hovered || e.to === hovered);
          return (
            <line key={i}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={isHL ? accent : (e.sameCluster ? '#3a3a44' : '#2a2a30')}
              strokeWidth={isHL ? 1.4 : (e.sameCluster ? 0.8 : 0.5)}
              strokeOpacity={isHL ? 1 : 0.55}
              strokeDasharray={e.isImport ? "0" : "2 3"}
            />
          );
        })}

        {/* Nodes — square pixel buildings */}
        {graph.nodes.map((n) => {
          const isHov = hovered === n.id;
          const pulse = n.isHub ? (Math.floor(tick / 4) % 2 === 0 ? 1 : 0.6) : 1;
          const size = n.size;
          return (
            <g key={n.id} onMouseEnter={() => setHovered(n.id)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
              {n.isHub && (
                <rect x={n.x - size - 2} y={n.y - size - 2} width={(size + 2) * 2} height={(size + 2) * 2}
                  fill="none" stroke={n.color} strokeOpacity={0.4 * pulse} strokeWidth={1} />
              )}
              <rect x={n.x - size / 2} y={n.y - size / 2} width={size} height={size}
                fill={isHov ? '#fff' : n.color}
                stroke="#0d0d0f" strokeWidth={1.5} />
              {n.isHub && (
                <rect x={n.x - 1.5} y={n.y - 1.5} width={3} height={3} fill="#0d0d0f" />
              )}
            </g>
          );
        })}

        {/* Hover tooltip */}
        {hovered != null && (() => {
          const n = nodeMap[hovered];
          if (!n) return null;
          const right = n.x > graph.W * 0.6;
          return (
            <g transform={`translate(${right ? n.x - 188 : n.x + 18}, ${Math.min(n.y - 26, graph.H - 80)})`}>
              <rect x={0} y={0} width={180} height={70} fill="#0d0d0f" stroke={n.color} strokeWidth={2} />
              <text x={10} y={20} fill="#e8dcc8" fontFamily='"Inter", ui-sans-serif, system-ui, sans-serif' fontSize="10">{n.name.toUpperCase()}</text>
              <text x={10} y={36} fill="#8c8c9c" fontFamily='"JetBrains Mono", ui-monospace, monospace' fontSize="9">community {n.cluster}{n.isHub ? ' · hub' : ''}</text>
              <text x={10} y={56} fill="#c8b89c" fontFamily='"JetBrains Mono", ui-monospace, monospace' fontSize="10">
                <tspan fill={n.color}>{'>'}</tspan> {n.degree} edges
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────
// SECURITY SECTION
// Opengrep-powered findings, displayed terminal-style.
// ──────────────────────────────────────────────────────────────
const Security = ({ accent }) => {
  const sev = (s) => ({
    HIGH: { bg: '#ff3d8a', fg: '#0d0d0f', dark: '#7a005a' },
    MED:  { bg: '#ff8a3d', fg: '#0d0d0f', dark: '#7a3a00' },
    LOW:  { bg: '#3dd4ff', fg: '#0d0d0f', dark: '#005a7a' },
  }[s]);

  return (
    <section style={{ maxWidth: 1240, margin: '0 auto', padding: '40px 32px 100px' }}>
      <SectionHead accent={accent}
        eyebrow={COPY.security.eyebrow}
        title={COPY.security.title}
        sub={COPY.security.sub}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 24, marginTop: 48 }}>
        {/* Left: Summary card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="pixel-shadow" style={{ background: '#1c1c20', border: '2px solid var(--border-light)', padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 11, color: accent, letterSpacing: '0.1em' }}>[ SCAN COMPLETE ]</span>
              <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 10, color: 'var(--muted)' }}>{COPY.security.summary.ms}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { k: COPY.security.summary.high, l: 'HIGH', c: sev('HIGH') },
                { k: COPY.security.summary.med,  l: 'MED',  c: sev('MED') },
                { k: COPY.security.summary.low,  l: 'LOW',  c: sev('LOW') },
              ].map((x, i) => (
                <div key={i} className="pixel-shadow-sm" style={{
                  padding: 12,
                  background: '#0d0d0f',
                  border: `2px solid ${x.c.bg}`,
                }}>
                  <div style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 24, color: x.c.bg }}>{x.k}</div>
                  <div style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 10, color: 'var(--cream-dark)', marginTop: 4, letterSpacing: '0.08em' }}>{x.l}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px dashed var(--border-light)', fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11, color: 'var(--cream-dark)', display: 'flex', justifyContent: 'space-between' }}>
              <span>{COPY.security.summary.files.toLocaleString()} files scanned</span>
              <span style={{ color: 'var(--dim)' }}>{COPY.security.findings.length}+ findings</span>
            </div>
          </div>

          {/* Opengrep attribution */}
          <a href="https://github.com/opengrep/opengrep" className="pixel-shadow btn-press" style={{
            display: 'block', padding: 22,
            background: '#1c1c20', border: '2px solid var(--border-light)',
            textDecoration: 'none', color: 'var(--cream)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 4px)', gap: 1 }}>
                {[1,1,1,1,0,1,1,1,1].map((v,i) => (
                  <span key={i} style={{ width: 4, height: 4, background: v ? accent : 'transparent' }} />
                ))}
              </div>
              <span style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 14, letterSpacing: '0.05em' }}>OPENGREP</span>
              <span style={{ marginLeft: 'auto', fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 10, color: 'var(--muted)' }}>↗</span>
            </div>
            <p style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 11, color: 'var(--cream-dark)', lineHeight: 1.7, margin: '0 0 12px' }}>
              Open-source static analysis. Bundled as a Tauri sidecar — runs locally, no API keys, no telemetry. Same Semgrep-compatible rule syntax.
            </p>
            <div style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 10, color: accent }}>
              ›  ./binaries/opengrep · spawned via tokio
            </div>
          </a>

          <CCButton kind="primary" big icon={<span style={{ fontSize: 12 }}>▶</span>}>RE-SCAN REPO</CCButton>
        </div>

        {/* Right: Findings terminal */}
        <div className="pixel-shadow scanlines" style={{
          background: '#0d0d0f', border: '2px solid var(--border-light)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}>
          {/* Terminal header */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', background: '#1c1c20', borderBottom: '2px solid var(--border)', gap: 10 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {['#ff3d8a', '#ff8a3d', accent].map(c => <span key={c} style={{ width: 8, height: 8, background: c, border: '1px solid #0d0d0f' }} />)}
            </div>
            <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11, color: 'var(--cream-dark)' }}>
              opengrep scan ~ findings.json
            </span>
            <span style={{ marginLeft: 'auto', fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 10, color: accent }}>
              <span className="blink-dot">●</span> LIVE
            </span>
          </div>

          {/* Findings list */}
          <div style={{ flex: 1, fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 12 }}>
            {COPY.security.findings.map((f, i) => {
              const s = sev(f.sev);
              return (
                <div key={i} style={{
                  display: 'grid',
                  gridTemplateColumns: '70px 220px 1fr 60px',
                  alignItems: 'center', gap: 14,
                  padding: '12px 16px',
                  borderTop: i ? '1px dashed var(--border)' : 'none',
                  transition: 'background 80ms steps(2)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <span style={{
                    display: 'inline-block', padding: '2px 8px',
                    background: s.bg, color: s.fg,
                    fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 10,
                    textAlign: 'center', letterSpacing: '0.08em',
                  }}>{f.sev}</span>
                  <span style={{ color: accent, fontSize: 11 }}>{f.rule}</span>
                  <span style={{ color: 'var(--cream-dark)', fontSize: 11 }}>
                    <span style={{ color: 'var(--cream)' }}>{f.path}</span>
                    <span style={{ color: 'var(--muted)' }}>:{f.line}</span>
                    <span style={{ color: 'var(--dim)', marginLeft: 12 }}>// {f.msg}</span>
                  </span>
                  <span style={{ color: 'var(--dim)', fontSize: 10, textAlign: 'right' }}>OPEN ▶</span>
                </div>
              );
            })}
          </div>

          {/* Terminal footer */}
          <div style={{
            padding: '10px 14px', background: '#1c1c20', borderTop: '2px solid var(--border)',
            fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 10, color: 'var(--muted)',
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span>› showing 7 of {COPY.security.findings.length + 71}</span>
            <span style={{ color: 'var(--dim)' }}>FILTER: severity ≥ low · sort: severity desc</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export { GraphView, Security };
