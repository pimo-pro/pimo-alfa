import { useShowroomStore } from "./showroomStore";

/**
 * Plano invisível só no modo régua: primeiro clique = A, segundo = B.
 */
export function ShowroomMeasureFloor() {
  const activeTool = useShowroomStore((s) => s.activeTool);
  const measurePointA = useShowroomStore((s) => s.measurePointA);
  const measurementStart = useShowroomStore((s) => s.measurementStart);
  const measurementEnd = useShowroomStore((s) => s.measurementEnd);

  if (activeTool !== "measure") return null;

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.02, 0]}
      renderOrder={-1}
      onPointerDown={(e) => {
        e.stopPropagation();
        const p = e.point;
        if (!measurePointA) {
          measurementStart(p.x, p.y, p.z);
        } else {
          measurementEnd(p.x, p.y, p.z);
        }
      }}
    >
      <planeGeometry args={[400, 400]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
