import { Html, Line } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

import { useShowroomStore } from "./showroomStore";

const MM = 1000;

export function ShowroomMeasureLine() {
  const a = useShowroomStore((s) => s.measurePointA);
  const b = useShowroomStore((s) => s.measurePointB);

  const { points, mid, distMm } = useMemo(() => {
    if (!a || !b) return { points: null as THREE.Vector3[] | null, mid: null as THREE.Vector3 | null, distMm: 0 };
    const va = new THREE.Vector3(a[0], a[1], a[2]);
    const vb = new THREE.Vector3(b[0], b[1], b[2]);
    const dist = va.distanceTo(vb) * MM;
    return {
      points: [va, vb],
      mid: va.clone().add(vb).multiplyScalar(0.5),
      distMm: Math.round(dist),
    };
  }, [a, b]);

  if (!points || !mid) return null;

  return (
    <group>
      <Line points={points} color="#c62828" lineWidth={2} dashed={false} />
      <Html position={[mid.x, mid.y + 0.15, mid.z]} center style={{ pointerEvents: "none" }}>
        <div
          style={{
            background: "rgba(255,255,255,0.95)",
            border: "1px solid #c62828",
            borderRadius: 4,
            padding: "4px 8px",
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          {distMm} mm
        </div>
      </Html>
    </group>
  );
}
