"use client"

export function Lighting() {
  return (
    <>
      {/* Ambient fill */}
      <ambientLight color="#303050" intensity={0.7} />

      {/* Directional sun — key light */}
      <directionalLight
        color="#ffeedd"
        intensity={0.7}
        position={[40, 60, 30]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-camera-near={1}
        shadow-camera-far={200}
      />

      {/* Fill light — cool blue */}
      <directionalLight
        color="#4d94ff"
        intensity={0.2}
        position={[-30, 20, -10]}
      />
    </>
  )
}
