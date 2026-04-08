import type { CSSProperties } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";

export interface V4ViewerProps {
  style?: CSSProperties;
}

export default function V4Viewer({ style }: V4ViewerProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: 280,
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid var(--border, #ccc)",
        background: "#d8dce3",
        boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
        ...style,
      }}
    >
      <Canvas gl={{ antialias: true, alpha: false }}>
        <color attach="background" args={["#d8dce3"]} />
        <PerspectiveCamera makeDefault position={[5, 5, 10]} fov={45} near={0.1} far={500} />
        <ambientLight intensity={0.72} />
        <directionalLight position={[12, 18, 8]} intensity={1.05} />
        <OrbitControls enableDamping />

        <mesh position={[0, 0.5, 0]} castShadow={false} receiveShadow={false}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#a3a3a3" />
        </mesh>

        <gridHelper args={[20, 20, "#b0b4bc", "#c8ccd4"]} position={[0, 0, 0]} />
      </Canvas>
    </div>
  );
}
