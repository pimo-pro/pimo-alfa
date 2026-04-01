import { Edges } from "@react-three/drei";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import type { ProjectState } from "../../context/projectTypes";
import type { ShowroomOffsetMm } from "./showroomLayout";
import { intersectRayWithHorizontalPlane } from "./showroomRaycast";
import { useShowroomStore } from "./showroomStore";

type Props = {
  projectId: string;
  projectState: ProjectState;
  offsetMm: ShowroomOffsetMm;
  displayName?: string | null;
};

const MM_TO_M = 0.001;

/**
 * Grupo por projeto: grelha + transform local do showroom, seleção, drag XZ (modo Mover).
 */
export function ShowroomProjectRoot({ projectId, projectState, offsetMm, displayName }: Props) {
  const { camera, gl } = useThree();
  const entity = useShowroomStore((s) => s.entities[projectId]);
  const selectedId = useShowroomStore((s) => s.selectedId);
  const activeTool = useShowroomStore((s) => s.activeTool);
  const setSelectedId = useShowroomStore((s) => s.setSelectedId);
  const moveProject = useShowroomStore((s) => s.moveProject);
  const setOrbitSuspended = useShowroomStore((s) => s.setOrbitSuspended);

  const gridPos = useMemo(
    () => [offsetMm.xMm * MM_TO_M, 0, offsetMm.zMm * MM_TO_M] as [number, number, number],
    [offsetMm.xMm, offsetMm.zMm]
  );

  const dragRef = useRef<{ last: THREE.Vector3 | null }>({ last: null });
  const selected = selectedId === projectId;

  const boxCount = projectState.workspaceBoxes?.length ?? 0;
  const label = (displayName?.trim() || projectState.projectName?.trim() || projectId).slice(0, 48);

  if (!entity) return null;

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (activeTool === "measure") return;

    const wasSelected = selectedId === projectId;
    setSelectedId(projectId);

    if (activeTool !== "move" || !wasSelected) return;

    const ne = e.nativeEvent;
    const hit = intersectRayWithHorizontalPlane(ne.clientX, ne.clientY, camera, gl.domElement, 0);
    if (!hit) return;

    dragRef.current.last = hit.clone();
    setOrbitSuspended(true);

    const onMove = (ev: PointerEvent) => {
      if ((ev.buttons & 1) === 0) return;
      const h = intersectRayWithHorizontalPlane(ev.clientX, ev.clientY, camera, gl.domElement, 0);
      if (!h || !dragRef.current.last) return;
      const dx = h.x - dragRef.current.last.x;
      const dz = h.z - dragRef.current.last.z;
      dragRef.current.last.copy(h);
      moveProject(projectId, { x: dx, y: 0, z: dz });
    };

    const onUp = () => {
      dragRef.current.last = null;
      setOrbitSuspended(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  return (
    <group
      visible={entity.visible}
      position={gridPos}
      userData={{
        projectId,
        showroom: true,
        showroomLabel: label,
        workspaceBoxCount: boxCount,
      }}
    >
      <group
        position={entity.position}
        rotation={[0, entity.rotationY, 0]}
        onPointerDown={handlePointerDown}
        userData={{ projectId, showroom: true }}
      >
        <mesh position={[0, 0.6, 0]} castShadow receiveShadow userData={{ projectId, showroom: true }}>
          <boxGeometry args={[1.2, 1.2, 1.2]} />
          <meshStandardMaterial
            color="#6b8cae"
            metalness={0.15}
            roughness={0.55}
            emissive={selected ? "#ffcc66" : "#000000"}
            emissiveIntensity={selected ? 0.35 : 0}
          />
          <Edges color={selected ? "#ff8800" : "#1a1a1a"} threshold={15} />
        </mesh>
      </group>
    </group>
  );
}
