import type { V4RoomConfig } from "./V4RoomConfig";

interface V4RoomFloorProps {
  config: V4RoomConfig;
}

export function V4RoomFloor({ config }: V4RoomFloorProps) {
  const w = config.width  / 1000;
  const d = config.depth  / 1000;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial
        color={config.floorColor}
        roughness={0.6}
        metalness={0}
      />
    </mesh>
  );
}
