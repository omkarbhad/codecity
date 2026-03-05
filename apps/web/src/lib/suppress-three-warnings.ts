/**
 * Suppress known console warnings from third-party Three.js / R3F libraries.
 *
 * - THREE.Clock deprecated in r183+ (used internally by @react-three/fiber)
 * - Non-passive wheel event listener from OrbitControls (@react-three/drei)
 *
 * These are upstream issues that cannot be fixed in application code.
 * Remove this file once @react-three/fiber and @react-three/drei ship fixes.
 */

if (typeof window !== "undefined") {
  const originalWarn = console.warn
  console.warn = (...args: unknown[]) => {
    const msg = typeof args[0] === "string" ? args[0] : ""
    if (msg.includes("THREE.Clock") && msg.includes("deprecated")) return
    originalWarn.apply(console, args)
  }
}
