import React, { useEffect, useState } from 'react';
import Homepage from './Homepage.jsx';

/**
 * Root — single React island that owns the accent state and renders
 * both the Homepage and the floating Tweaks panel.
 * Persists accent choice in localStorage; syncs CSS vars on every change.
 */

const ACCENTS = [
  { value: '#c8e64a', label: 'Lime',    shadow: '#5a7a00' },
  { value: '#ff8a3d', label: 'Amber',   shadow: '#7a3a00' },
  { value: '#3dd4ff', label: 'Sky',     shadow: '#005a7a' },
  { value: '#ff3d8a', label: 'Magenta', shadow: '#7a005a' },
];

const STORAGE_KEY = 'codecity:accent';

export default function Root() {
  const [accent, setAccent] = useState(ACCENTS[0].value);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && ACCENTS.some(a => a.value === saved)) setAccent(saved);
    } catch {}
  }, []);

  useEffect(() => {
    const a = ACCENTS.find(x => x.value === accent) ?? ACCENTS[0];
    const root = document.documentElement;
    root.style.setProperty('--accent', a.value);
    root.style.setProperty('--accent-shadow', a.shadow);
    root.style.setProperty('--primary', a.value);
    root.style.setProperty('--lime-shadow', a.shadow);
    try { localStorage.setItem(STORAGE_KEY, a.value); } catch {}
  }, [accent]);

  return (
    <>
      <Homepage accent={accent} />
      {mounted && (
        <TweaksPanel
          accent={accent}
          setAccent={setAccent}
          open={tweaksOpen}
          setOpen={setTweaksOpen}
        />
      )}
    </>
  );
}

function TweaksPanel({ accent, setAccent, open, setOpen }) {
  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Theme"
        style={{
          position: 'fixed', right: 24, bottom: 24, zIndex: 1000,
          width: 44, height: 44,
          background: '#1c1c20',
          border: '2px solid #0d0d0f',
          boxShadow: '4px 4px 0 0 rgba(0,0,0,0.6)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <span style={{ width: 18, height: 18, background: accent, border: '2px solid #0d0d0f' }} />
      </button>

      {open && (
        <div
          style={{
            position: 'fixed', right: 24, bottom: 80, zIndex: 1000,
            padding: 16,
            background: '#1c1c20',
            border: '2px solid #0d0d0f',
            boxShadow: '4px 4px 0 0 rgba(0,0,0,0.6)',
            minWidth: 240,
            fontFamily: 'Inter, sans-serif',
            color: '#e8dcc8',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Theme</span>
            <button onClick={() => setOpen(false)} style={{ background: 'transparent', border: 'none', color: '#8c8c9c', cursor: 'pointer', fontSize: 16 }}>×</button>
          </div>
          <div style={{ fontSize: 10, color: '#8c8c9c', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Accent color</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {ACCENTS.map(a => (
              <button
                key={a.value}
                onClick={() => setAccent(a.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px',
                  background: accent === a.value ? '#0d0d0f' : 'transparent',
                  border: `2px solid ${accent === a.value ? a.value : '#3a3a44'}`,
                  color: '#e8dcc8',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontFamily: 'inherit',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  textAlign: 'left',
                }}
              >
                <span style={{ width: 14, height: 14, background: a.value, border: '1px solid #0d0d0f' }} />
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
