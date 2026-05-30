import * as THREE from "three";

/**
 * V4 — Ground plane + grid
 * Adapted from src/3d/viewer-engine/environment/Environment.ts (read-only source)
 *
 * Uses a MeshStandardMaterial ground that receives shadows,
 * plus a thin GridHelper at y=0.001 to avoid z-fighting.
 */
export function V4Ground() {
  return (
    <>
      {/* Shadow-receiving ground */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial
          color="#1a1f27"
          roughness={0.92}
          metalness={0}
        />
      </mesh>

      {/* Grid lines */}
      <gridHelper
        args={[40, 40, "#2d3748", "#232b38"]}
        position={[0, 0.001, 0]}
      />
    </>
  );
}

/**
 * Contact-shadow plane under each box group.
 * Placed at y = 0.002 to sit just above the ground.
 */
export function V4FloorReflection() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} receiveShadow>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial
        color="#1a1f27"
        roughness={1}
        metalness={0}
        transparent
        opacity={0}
      />
    </mesh>
  );
}

/**
 * Creates a soft vignette background color for the scene.
 * Called once on Canvas creation via onCreated.
 */
export const V4_BG_COLOR = "#0f1318";

/**
 * Fog settings to add depth to the scene.
 */
export function V4Fog() {
  return <fog attach="fog" args={[V4_BG_COLOR, 14, 40]} />;
}

/**
 * Build a floor shadow catcher using a transparent MeshStandardMaterial.
 * Re-uses THREE directly (not R3F JSX) for use outside Canvas.
 */
export function createShadowFloor(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(40, 40);
  const mat = new THREE.ShadowMaterial({ opacity: 0.28, color: 0x000000 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.001;
  mesh.receiveShadow = true;
  return mesh;
}
