import * as THREE from "three"

/**
 * Building facade material + geometry.
 *
 * Each building is one instance of a two-part box: a body and a crown. Towers
 * at least SETBACK_MIN_HEIGHT tall get a narrower crown (a setback) in the
 * vertex shader; shorter buildings keep the crown flush, so they read as a
 * plain block. The total height is never changed — height still encodes size.
 *
 * The fragment shader draws an architectural facade in world units:
 * - three facade styles picked per building: glass curtain wall, ribbon
 *   windows, punched windows (small buildings always use punched)
 * - corner pilasters, a dark storefront ground floor, a top band in the data color
 * - warm interior light per office bay (a minority lit, dim), never white
 * - roofs and terraces carry the data color, so color coding reads from above
 * Per-instance `aLit` scales the light (dimmed buildings switch theirs off).
 * Fine detail fades to its average below a pixel, so distant towers don't shimmer.
 */

const SETBACK_MIN_HEIGHT = 6.0
const CROWN_INSET = 0.78
/** Placeholder crown fraction baked into the geometry; the vertex shader moves the ledge per building. */
const GEOMETRY_CROWN_FRACTION = 0.15

const VERTEX_DECLARATIONS = /* glsl */ `
attribute float aLit;
attribute float aCrown;
attribute float aLedge;
varying vec3 vCcObjPos;
varying vec3 vCcObjNormal;
varying vec3 vCcScale;
varying vec2 vCcSeed;
varying float vCcLit;
varying float vCcCrown;`

/** Shared by the color and depth materials so the shadow matches the silhouette. */
const SETBACK_TRANSFORM = /* glsl */ `
#ifdef USE_INSTANCING
  vec3 ccScale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  vec2 ccSeedV = instanceMatrix[3].xz;
#else
  vec3 ccScale = vec3(1.0);
  vec2 ccSeedV = vec2(0.0);
#endif
float ccSetback = step(${SETBACK_MIN_HEIGHT.toFixed(1)}, ccScale.y);
float ccCrownH = clamp(ccScale.y * 0.12, 0.7, 3.0);
if (aLedge > 0.5) transformed.y = mix(transformed.y, 0.5 - ccCrownH / max(ccScale.y, 0.001), ccSetback);
if (aCrown > 0.5) transformed.xz *= mix(1.0, ${CROWN_INSET.toFixed(2)}, ccSetback);`

const FACADE_FRAGMENT = /* glsl */ `
// Each building is a shade lighter or darker than its neighbours (same hue), so a
// district reads as many buildings instead of one block of flat colour.
vec3 ccBase = diffuseColor.rgb * (0.86 + 0.28 * ccHash(vec3(vCcSeed * 0.291, 5.0)));
float ccTop = step(0.5, vCcObjNormal.y);
float ccSide = 1.0 - step(0.5, abs(vCcObjNormal.y));
float ccOnX = step(0.5, abs(vCcObjNormal.x));

// Face coordinates in world units. Columns align to the body face so crown windows line up with the body.
float ccHalf = mix(0.5, ${(CROWN_INSET / 2).toFixed(3)}, vCcCrown);
float ccW = mix(vCcScale.x, vCcScale.z, ccOnX);
float ccU = mix((vCcObjPos.x + 0.5) * vCcScale.x, (vCcObjPos.z + 0.5) * vCcScale.z, ccOnX);
float ccEdgeLo = (0.5 - ccHalf) * ccW;
float ccEdgeHi = (0.5 + ccHalf) * ccW;
float ccH = (vCcObjPos.y + 0.5) * vCcScale.y;
float ccFace = ccOnX * 2.0 + step(0.0, vCcObjNormal.x + vCcObjNormal.z);

// 0 = glass curtain wall, 1 = ribbon windows, 2 = punched windows
float ccStyle = vCcScale.y < 1.4 ? 2.0 : floor(ccHash(vec3(vCcSeed * 0.173, 1.0)) * 2.999);

const float CC_COL = 0.38;
const float CC_FLOOR = 0.42;
const float CC_LOBBY = 0.32;
const float CC_PARAPET = 0.16;
float ccCols = max(1.0, floor((ccW - 0.14) / CC_COL));
float ccOff = (ccW - ccCols * CC_COL) * 0.5;
vec2 ccCell = vec2((ccU - ccOff) / CC_COL, (ccH - CC_LOBBY) / CC_FLOOR);
vec2 ccId = floor(ccCell);
vec2 ccFr = fract(ccCell);
vec2 ccFw = max(fwidth(ccCell), vec2(1e-4));
// Window detail dissolves into a smooth facade early, so mid-distance towers do not sparkle
float ccFar = smoothstep(0.1, 0.38, max(ccFw.x, ccFw.y));

float ccHasLobby = step(0.9, vCcScale.y);
float ccLobby = ccHasLobby * (1.0 - step(CC_LOBBY, ccH));
float ccParapet = step(vCcScale.y - CC_PARAPET, ccH);
float ccInBody = (1.0 - ccLobby) * (1.0 - ccParapet);
float ccPilaster = 1.0 - step(0.07, min(ccU - ccEdgeLo, ccEdgeHi - ccU));

float ccMullion = ccBand(ccFr.x, 0.06, 0.94, ccFw.x);
float ccGlass;
// Window head height within a floor, per style (used for the reveal shadow)
float ccHead = ccStyle < 0.5 ? 0.95 : (ccStyle < 1.5 ? 0.92 : 0.78);
if (ccStyle < 0.5) {
  ccGlass = mix(ccMullion * ccBand(ccFr.y, 0.07, 0.95, ccFw.y), 0.82, ccFar);
} else if (ccStyle < 1.5) {
  ccGlass = mix(ccMullion * ccBand(ccFr.y, 0.36, 0.92, ccFw.y), 0.5, ccFar);
} else {
  ccGlass = mix(ccBand(ccFr.x, 0.24, 0.76, ccFw.x) * ccBand(ccFr.y, 0.3, 0.78, ccFw.y), 0.25, ccFar);
}
ccGlass *= ccInBody * (1.0 - ccPilaster) * ccSide;
// A thin dark reveal along the top of each window gives the facade some depth.
float ccReveal = ccSide * ccInBody * (1.0 - ccFar) * (1.0 - ccPilaster) * ccBand(ccFr.y, ccHead - 0.07, ccHead, ccFw.y) * step(0.01, ccGlass);

// Interior light per office bay: a minority lit, at varied dim levels
// Lit windows are scattered one by one (no blocky clusters); some floors are busier than others.
float ccR1 = ccHash(vec3(ccId, ccFace) + vec3(vCcSeed * 0.731, 0.0));
float ccR2 = ccHash(vec3(ccId.yx, ccFace + 7.0) + vec3(vCcSeed.yx * 1.37, 3.0));
float ccFloorBusy = ccHash(vec3(ccId.y, ccFace + 3.0, vCcSeed.x * 0.517));
float ccLit = step(ccR1, 0.07 + 0.1 * ccFloorBusy) * (0.45 + 0.35 * ccR2);
ccLit = mix(ccLit, 0.12 * 0.62, ccFar);

// Dusk palette: walls carry most of the district colour so files read clearly.
vec3 ccWallCol = mix(vec3(0.12, 0.125, 0.14), ccBase, 0.94);
float ccPaneY = mix(clamp(ccFr.y, 0.0, 1.0), 0.5, ccFar);
vec3 ccSky = vec3(0.55, 0.68, 0.82);
// Glass is a darker shade of the wall, not a black grid: low contrast is easier on the eye
vec3 ccGlassCol = ccBase * 0.6 + vec3(0.02, 0.025, 0.035) + vec3(0.02, 0.03, 0.05) * clamp(ccH / max(vCcScale.y, 0.01), 0.0, 1.0);
// Each pane reflects a little sky near its head; a soft diagonal streak breaks up the grid.
float ccStreak = smoothstep(0.35, 0.0, abs(fract((ccU + ccH) * 0.18 + vCcSeed.x * 0.37) - 0.5));
ccGlassCol += ccSky * (0.03 + 0.05 * smoothstep(0.35, 0.95, ccPaneY) + 0.02 * ccStreak) * (1.0 - ccFar * 0.5);
vec3 ccSideCol = mix(ccWallCol, ccGlassCol, ccGlass);
ccSideCol *= 1.0 - 0.15 * ccReveal;
ccSideCol = mix(ccSideCol, ccBase * 0.22 + vec3(0.04), ccLobby * (1.0 - ccPilaster));
ccSideCol = mix(ccSideCol, ccBase * 1.0, ccParapet);

float ccEx = (ccHalf - abs(vCcObjPos.x)) * vCcScale.x;
float ccEz = (ccHalf - abs(vCcObjPos.z)) * vCcScale.z;
// Roof: a light coping on the parapet, a shadowed gutter inside it, then a
// darker membrane with faint panel seams (seams fade out with distance).
float ccEdge = min(ccEx, ccEz);
float ccCope = 1.0 - smoothstep(0.06, 0.085, ccEdge);
float ccGutter = (1.0 - smoothstep(0.09, 0.16, ccEdge)) * (1.0 - ccCope);
vec2 ccRoofP = vec2(vCcObjPos.x * vCcScale.x, vCcObjPos.z * vCcScale.z) / 0.55;
vec2 ccRoofD = min(fract(ccRoofP), 1.0 - fract(ccRoofP));
vec2 ccRoofW = max(fwidth(ccRoofP), vec2(1e-4));
float ccSeam = 1.0 - smoothstep(0.5, 1.5, min(ccRoofD.x / ccRoofW.x, ccRoofD.y / ccRoofW.y));
ccSeam *= 1.0 - smoothstep(0.15, 0.4, max(ccRoofW.x, ccRoofW.y));
vec3 ccMembrane = ccBase * 0.8 + vec3(0.025);
ccMembrane *= 1.0 - 0.1 * ccSeam;
ccMembrane *= 1.0 - 0.22 * ccGutter;
vec3 ccRoof = mix(ccMembrane, ccBase * 1.12 + vec3(0.05), ccCope);

diffuseColor.rgb = mix(ccSideCol, ccRoof, ccTop);
// Contact shadow: walls darken toward the street, as if the ground occluded the sky light.
diffuseColor.rgb *= mix(1.0, mix(0.6, 1.0, smoothstep(0.0, 0.9, ccH)), ccSide);
// Street canyon: the lower floors of a tower get less sky than the top ones.
diffuseColor.rgb *= mix(1.0, mix(0.8, 1.04, smoothstep(0.0, 7.0, ccH)), ccSide);

vec3 ccLight = vec3(1.0, 0.9, 0.74); // soft warm white
vec3 ccEmit = (ccLight * ccGlass * ccLit + vec3(1.0, 0.9, 0.74) * ccLobby * ccSide * 0.1) * uWindowGlow * vCcLit;`

export function createBuildingMaterial(): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.7, metalness: 0.1 })
  const uniforms = { uWindowGlow: { value: 0.45 } }
  // Lets the scene dim lit windows by day (see InstancedBuildings).
  material.userData.windowGlow = uniforms.uWindowGlow

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWindowGlow = uniforms.uWindowGlow

    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${VERTEX_DECLARATIONS}`)
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
${SETBACK_TRANSFORM}
vCcObjPos = transformed;
vCcObjNormal = normal;
vCcScale = ccScale;
vCcSeed = ccSeedV;
vCcLit = aLit;
vCcCrown = aCrown * ccSetback;`
      )

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform float uWindowGlow;
varying vec3 vCcObjPos;
varying vec3 vCcObjNormal;
varying vec3 vCcScale;
varying vec2 vCcSeed;
varying float vCcLit;
varying float vCcCrown;

float ccHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

// 1 inside [a, b], antialiased over w
float ccBand(float x, float a, float b, float w) {
  return smoothstep(a - w, a + w, x) - smoothstep(b - w, b + w, x);
}`
      )
      .replace("#include <color_fragment>", `#include <color_fragment>\n${FACADE_FRAGMENT}`)
      .replace(
        "#include <metalnessmap_fragment>",
        `#include <metalnessmap_fragment>
// Glass gets a low-roughness sheen; walls stay matte
roughnessFactor = mix(roughnessFactor, 0.3, ccGlass);
metalnessFactor = mix(metalnessFactor, 0.25, ccGlass);`
      )
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>\ntotalEmissiveRadiance += ccEmit;`)
  }

  material.customProgramCacheKey = () => "codecity-building-facade-v11"
  return material
}

/** Shadow-pass material that applies the same setback, so shadows match the crown. */
export function createBuildingDepthMaterial(): THREE.MeshDepthMaterial {
  const material = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking })
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${VERTEX_DECLARATIONS}`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>\n${SETBACK_TRANSFORM}`)
  }
  material.customProgramCacheKey = () => "codecity-building-depth-v1"
  return material
}

/**
 * Unit two-part box (body + crown, centered, 1×1×1) with per-vertex flags the
 * shader uses for the setback, plus the per-instance `aLit` attribute.
 */
export function createBuildingGeometry(count: number): THREE.BufferGeometry {
  const ledge = 0.5 - GEOMETRY_CROWN_FRACTION
  const positions: number[] = []
  const normals: number[] = []
  const crownFlags: number[] = []
  const ledgeFlags: number[] = []
  const indices: number[] = []

  // One quad: four corners, counter-clockwise seen from the side the normal points to
  function quad(corners: number[][], normal: number[], crown: number) {
    const base = positions.length / 3
    for (const [x, y, z] of corners) {
      positions.push(x, y, z)
      normals.push(normal[0], normal[1], normal[2])
      crownFlags.push(crown)
      ledgeFlags.push(Math.abs(y - ledge) < 1e-6 ? 1 : 0)
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
  }

  // Four walls plus a top face for a slab spanning y0..y1
  function part(y0: number, y1: number, crown: number) {
    quad([[0.5, y0, 0.5], [0.5, y0, -0.5], [0.5, y1, -0.5], [0.5, y1, 0.5]], [1, 0, 0], crown)
    quad([[-0.5, y0, -0.5], [-0.5, y0, 0.5], [-0.5, y1, 0.5], [-0.5, y1, -0.5]], [-1, 0, 0], crown)
    quad([[-0.5, y0, 0.5], [0.5, y0, 0.5], [0.5, y1, 0.5], [-0.5, y1, 0.5]], [0, 0, 1], crown)
    quad([[0.5, y0, -0.5], [-0.5, y0, -0.5], [-0.5, y1, -0.5], [0.5, y1, -0.5]], [0, 0, -1], crown)
    quad([[-0.5, y1, 0.5], [0.5, y1, 0.5], [0.5, y1, -0.5], [-0.5, y1, -0.5]], [0, 1, 0], crown)
  }

  part(-0.5, ledge, 0) // body; its top face becomes the terrace when the crown is set back
  part(ledge, 0.5, 1) // crown

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute("aCrown", new THREE.Float32BufferAttribute(crownFlags, 1))
  geometry.setAttribute("aLedge", new THREE.Float32BufferAttribute(ledgeFlags, 1))
  geometry.setIndex(indices)
  geometry.setAttribute("aLit", new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, count)).fill(1), 1))
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}
