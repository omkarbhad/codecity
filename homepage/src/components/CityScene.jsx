import React from 'react';

// CityScene — pure-CSS isometric "city" of buildings.
// Buildings are colored 3D boxes laid out on a tilted plane.
// No three.js — uses CSS 3D transforms.
//
// Props:
//   layout: array of { x, z, w, d, h, color, label?, lines?, complexity?, district? }
//     x,z in grid cells; w,d,h in cells (h = height multiplier)
//   tilt: rotateX angle (default 58deg = isometric-ish)
//   spin: rotation in degrees (auto-rotates if `auto`)
//   cell: pixel size of one grid cell (default 14)
//   onPick: (building) => void

const CityScene = ({
  layout,
  tilt = 58,
  spin = 35,
  cell = 14,
  auto = false,
  speed = 60, // seconds per full rotation
  hovered,
  setHovered,
  picked,
  setPicked,
  glow = '#ff3d3d',
  showGround = true,
  showGrid = true,
  className = '',
  style = {},
}) => {
  const [autoSpin, setAutoSpin] = React.useState(0);
  const rafRef = React.useRef();
  const startRef = React.useRef();

  React.useEffect(() => {
    if (!auto) return;
    const tick = (t) => {
      if (!startRef.current) startRef.current = t;
      const elapsed = (t - startRef.current) / 1000;
      setAutoSpin((elapsed / speed) * 360);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [auto, speed]);

  // Compute bounding box for centering
  const bounds = React.useMemo(() => {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    layout.forEach((b) => {
      minX = Math.min(minX, b.x);
      maxX = Math.max(maxX, b.x + b.w);
      minZ = Math.min(minZ, b.z);
      maxZ = Math.max(maxZ, b.z + b.d);
    });
    return { minX, maxX, minZ, maxZ, cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2 };
  }, [layout]);

  const groundW = (bounds.maxX - bounds.minX + 4) * cell;
  const groundD = (bounds.maxZ - bounds.minZ + 4) * cell;

  const totalSpin = (auto ? autoSpin : 0) + spin;

  return (
    <div
      className={`city-scene ${className}`}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        perspective: '2000px',
        perspectiveOrigin: '50% 40%',
        ...style,
      }}
    >
      <div
        className="city-stage"
        style={{
          transform: `rotateX(${tilt}deg) rotateZ(${totalSpin}deg)`,
          transformStyle: 'preserve-3d',
          transformOrigin: '50% 50%',
          position: 'absolute',
          inset: 0,
          willChange: 'transform',
        }}
      >
        {/* Ground plane */}
        {showGround && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: groundW,
              height: groundD,
              transform: `translate(-50%, -50%)`,
              background: 'linear-gradient(180deg, rgba(20,20,30,0.85), rgba(8,8,14,0.95))',
              boxShadow: `inset 0 0 200px rgba(0,0,0,0.8), 0 0 80px ${glow}22`,
              border: `1px solid rgba(255,255,255,0.04)`,
              borderRadius: 4,
            }}
          >
            {showGrid && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: `
                    linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
                  `,
                  backgroundSize: `${cell}px ${cell}px`,
                  opacity: 0.6,
                }}
              />
            )}
          </div>
        )}

        {/* Buildings */}
        {layout.map((b, i) => {
          const id = b.id ?? i;
          const isHovered = hovered === id;
          const isPicked = picked === id;
          const heightPx = b.h * cell;
          const widthPx = b.w * cell;
          const depthPx = b.d * cell;
          // Position relative to ground center
          const left = (b.x + b.w / 2 - bounds.cx) * cell;
          const top = (b.z + b.d / 2 - bounds.cz) * cell;
          const color = b.color;

          return (
            <Building
              key={id}
              id={id}
              left={left}
              top={top}
              w={widthPx}
              d={depthPx}
              h={heightPx}
              color={color}
              isHovered={isHovered}
              isPicked={isPicked}
              counterRotate={totalSpin}
              tilt={tilt}
              onEnter={() => setHovered && setHovered(id)}
              onLeave={() => setHovered && setHovered(null)}
              onClick={() => setPicked && setPicked(id)}
              data={b}
            />
          );
        })}
      </div>
    </div>
  );
};

const Building = ({ id, left, top, w, d, h, color, isHovered, isPicked, onEnter, onLeave, onClick, data, counterRotate, tilt }) => {
  // Lighten/darken helpers
  const top_color = lighten(color, 0.18);
  const front_color = darken(color, 0.10);
  const side_color = darken(color, 0.28);
  const intense = isHovered || isPicked;

  return (
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: w,
        height: d,
        transform: `translate(${left - w/2}px, ${top - d/2}px)`,
        transformStyle: 'preserve-3d',
        cursor: data.label ? 'pointer' : 'default',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transformStyle: 'preserve-3d',
          transform: `translateZ(${h/2}px)`,
          transition: 'transform 0.4s cubic-bezier(.2,.7,.2,1), filter 0.3s',
          filter: intense ? `brightness(1.5) drop-shadow(0 0 12px ${color})` : 'none',
        }}
      >
        {/* Top face */}
        <div style={{
          position: 'absolute', inset: 0,
          background: top_color,
          transform: `translateZ(${h/2}px)`,
          boxShadow: intense ? `inset 0 0 12px rgba(255,255,255,0.4)` : `inset 0 0 4px rgba(0,0,0,0.2)`,
        }} />
        {/* Bottom face (rarely seen) */}
        <div style={{
          position: 'absolute', inset: 0,
          background: side_color,
          transform: `translateZ(${-h/2}px) rotateX(180deg)`,
        }} />
        {/* Front face */}
        <div style={{
          position: 'absolute', left: 0, top: 0,
          width: w, height: h,
          background: `linear-gradient(180deg, ${front_color} 0%, ${darken(color, 0.22)} 100%)`,
          transform: `rotateX(-90deg) translateY(${-h/2}px) translateZ(${d/2}px)`,
          transformOrigin: 'top',
        }}>
          <Windows color={color} w={w} h={h} />
        </div>
        {/* Back face */}
        <div style={{
          position: 'absolute', left: 0, top: 0,
          width: w, height: h,
          background: `linear-gradient(180deg, ${darken(color, 0.18)} 0%, ${darken(color, 0.32)} 100%)`,
          transform: `rotateX(-90deg) translateY(${-h/2}px) translateZ(${-d/2}px) rotateY(180deg)`,
          transformOrigin: 'top',
        }}>
          <Windows color={color} w={w} h={h} />
        </div>
        {/* Left face */}
        <div style={{
          position: 'absolute', left: 0, top: 0,
          width: d, height: h,
          background: `linear-gradient(180deg, ${side_color} 0%, ${darken(color, 0.36)} 100%)`,
          transform: `rotateX(-90deg) rotateY(90deg) translateY(${-h/2}px) translateZ(${-w/2}px)`,
          transformOrigin: 'top left',
        }}>
          <Windows color={color} w={d} h={h} />
        </div>
        {/* Right face */}
        <div style={{
          position: 'absolute', left: 0, top: 0,
          width: d, height: h,
          background: `linear-gradient(180deg, ${side_color} 0%, ${darken(color, 0.36)} 100%)`,
          transform: `rotateX(-90deg) rotateY(-90deg) translateY(${-h/2}px) translateZ(${w/2}px) translateX(${-d}px)`,
          transformOrigin: 'top left',
        }}>
          <Windows color={color} w={d} h={h} />
        </div>
      </div>
    </div>
  );
};

// Decorative "windows" — subtle dotted pattern on building sides
const Windows = ({ color, w, h }) => {
  // Skip rendering on very small faces
  if (w < 8 || h < 8) return null;
  return (
    <div style={{
      position: 'absolute', inset: 0,
      backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.18) 0.5px, transparent 1px)`,
      backgroundSize: '4px 4px',
      opacity: 0.7,
      pointerEvents: 'none',
    }} />
  );
};

// Color helpers — work on hex
function hexToRgb(hex) {
  const m = hex.replace('#', '');
  const v = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
  return [parseInt(v.substr(0,2),16), parseInt(v.substr(2,2),16), parseInt(v.substr(4,2),16)];
}
function rgbToHex(r,g,b) {
  return '#' + [r,g,b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2,'0')).join('');
}
function lighten(hex, amt) {
  const [r,g,b] = hexToRgb(hex);
  return rgbToHex(r + (255-r)*amt, g + (255-g)*amt, b + (255-b)*amt);
}
function darken(hex, amt) {
  const [r,g,b] = hexToRgb(hex);
  return rgbToHex(r * (1-amt), g * (1-amt), b * (1-amt));
}

// ─────────────────────────────────────────────────────────────
// Layout generator — produces a deterministic city for a "repo"
// ─────────────────────────────────────────────────────────────
function makeCity(seed = 1, opts = {}) {
  const {
    districts = ['#ff3d3d', '#448aff', '#00e676', '#ffea00', '#b388ff', '#ff9100'],
    cols = 18,
    rows = 14,
    density = 0.72,
    maxH = 14,
    minH = 1,
  } = opts;

  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  // Carve into rectangular districts (folders)
  const buildings = [];
  // Split grid into 2-3 districts per axis
  const xCuts = [0, Math.floor(cols * 0.35), Math.floor(cols * 0.65), cols];
  const zCuts = [0, Math.floor(rows * 0.45), rows];
  let dIdx = 0;
  for (let zi = 0; zi < zCuts.length - 1; zi++) {
    for (let xi = 0; xi < xCuts.length - 1; xi++) {
      const x0 = xCuts[xi] + 1;
      const x1 = xCuts[xi+1] - 1;
      const z0 = zCuts[zi] + 1;
      const z1 = zCuts[zi+1] - 1;
      const color = districts[dIdx % districts.length];
      dIdx++;
      // Place buildings in this district
      for (let z = z0; z < z1; z++) {
        for (let x = x0; x < x1; x++) {
          if (rand() > density) continue;
          // building size 1-3 cells, random
          const w = rand() < 0.7 ? 1 : 2;
          const d = rand() < 0.7 ? 1 : 2;
          // skip if doesn't fit
          if (x + w > x1 || z + d > z1) continue;
          // height: bias toward small, occasional skyscraper
          const r = rand();
          const h = Math.floor(minH + Math.pow(r, 2.2) * (maxH - minH));
          buildings.push({
            x, z, w, d, h: h + 1,
            color,
            id: `${x}-${z}`,
          });
          // skip cells we just filled (rough)
          x += w - 1;
        }
      }
    }
  }

  return buildings;
}

export { CityScene, makeCity };
export default CityScene;
