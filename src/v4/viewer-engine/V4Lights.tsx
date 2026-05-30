/**
 * V4 — Lightweight 3-point lighting rig
 * Adapted from src/3d/viewer-engine/lighting/Lights.ts (read-only source)
 *
 * Performance note:
 * - Only ONE light casts shadows (keyLight) with 1024 map (not 2048)
 * - Hemisphere replaces many fill lights
 * - Rim light is cheap (no shadow)
 */
export function V4Lights() {
  return (
    <>
      {/* Ambient — base fill, shadows stay readable */}
      <ambientLight intensity={0.42} color={0xffffff} />

      {/* Hemisphere — sky/ground gradient */}
      <hemisphereLight args={[0xe8eeff, 0xd0d8e8, 0.44]} position={[0, 10, 0]} />

      {/* Key light — single shadow caster, 1024 map for performance */}
      <directionalLight
        castShadow
        position={[5, 7, 5]}
        intensity={0.50}
        color={0xfff8f0}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.1}
        shadow-camera-far={20}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-bias={-0.0003}
        shadow-normalBias={0.05}
        shadow-radius={4}
      />

      {/* Fill light — soft, no shadow */}
      <directionalLight position={[-3, 4, 2.5]} intensity={0.20} color={0xe8ecf4} />

      {/* Rim light — back edge definition, no shadow */}
      <directionalLight position={[-2, 3, -5]} intensity={0.12} color={0xffffff} />
    </>
  );
}
