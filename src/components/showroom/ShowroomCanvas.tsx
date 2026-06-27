import { Canvas } from "@react-three/fiber";
import type { ReactNode } from "react";

import { useShowroomStore } from "./showroomStore";
import { ShowroomArrowKeys } from "./ShowroomArrowKeys";
import { ShowroomMeasureFloor } from "./ShowroomMeasureFloor";
import { ShowroomMeasureLine } from "./ShowroomMeasureLine";
import { ShowroomOrbitControls } from "./ShowroomOrbitControls";
import { ShowroomRotatePointer } from "./ShowroomRotatePointer";

type Props = {
  children: ReactNode;
  readOnly?: boolean;
  fillHeight?: boolean;
};

/**
 * Canvas 3D do showroom: sem ProjectProvider, sem sala. Ferramentas locais via Zustand.
 */
export function ShowroomCanvas({ children, readOnly = false, fillHeight = false }: Props) {
  return (
    <div
      style={{
        height: fillHeight ? "100%" : "min(78vh, 760px)",
        width: "100%",
        borderRadius: fillHeight ? 0 : 8,
        overflow: "hidden",
        border: fillHeight ? "none" : "1px solid var(--border, #ccc)",
        background: "#d8dce3",
        boxShadow: fillHeight ? "none" : "0 2px 8px rgba(0,0,0,0.07)",
      }}
    >
      <Canvas
        camera={{ position: [14, 11, 14], fov: 45, near: 0.1, far: 500 }}
        gl={{ antialias: true, alpha: false }}
        shadows={false}
        onPointerMissed={() => {
          if (readOnly) return;
          const { activeTool, setSelectedId } = useShowroomStore.getState();
          if (activeTool !== "measure") setSelectedId(null);
        }}
      >
        <color attach="background" args={["#d8dce3"]} />
        <ambientLight intensity={0.72} />
        <directionalLight position={[12, 18, 8]} intensity={1.05} />
        <hemisphereLight args={["#ffffff", "#9096a0", 0.35]} />
        <ShowroomOrbitControls />
        {!readOnly ? <ShowroomRotatePointer /> : null}
        {!readOnly ? <ShowroomArrowKeys /> : null}
        <gridHelper args={[80, 40, "#b0b4bc", "#c8ccd4"]} position={[0, 0, 0]} />
        {children}
        {!readOnly ? <ShowroomMeasureFloor /> : null}
        {!readOnly ? <ShowroomMeasureLine /> : null}
      </Canvas>
    </div>
  );
}
