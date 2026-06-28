import { useEffect, useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

import { applyResultados } from "@/context/projectState";
import { reviveState } from "@/context/projectPersistence";
import type { ProjectState } from "@/context/projectTypes";
import type { SavedProjectRecord } from "@/core/projects/types";
import { ShowroomCanvas } from "@/components/showroom/ShowroomCanvas";
import { ShowroomProjectRoot } from "@/components/showroom/ShowroomProjectRoot";
import { ShowroomReadOnlyInteractions } from "@/components/showroom/ShowroomReadOnlyInteractions";
import { ShowroomToolbar } from "@/components/showroom/ShowroomToolbar";
import { useShowroomStore } from "@/components/showroom/showroomStore";

export type ShowroomViewerMode = "project" | "box" | "piece";

export type ShowroomViewerProps = {
  snapshot: SavedProjectRecord | null;
  mode: ShowroomViewerMode;
  projectId?: string;
  boxId?: string;
  pieceId?: string;
  readOnly?: boolean;
};

const FOCUS_OPACITY = 1;
const DIM_OPACITY = 0.12;
const PIECE_EMISSIVE = 0.22;

function reviveProjectState(snapshot: SavedProjectRecord | null): ProjectState | null {
  if (!snapshot) return null;
  const revived = reviveState(snapshot.snapshot?.projectState);
  if (!revived) return null;
  return applyResultados(revived);
}

function resolveFocusBoxId(
  projectState: ProjectState,
  mode: ShowroomViewerMode,
  boxId?: string,
  pieceId?: string
): string | undefined {
  if (mode === "project") return undefined;
  if (mode === "box") return boxId;
  if (boxId) return boxId;
  if (!pieceId) return undefined;

  for (const wsBox of projectState.workspaceBoxes ?? []) {
    const module = projectState.boxes.find((box) => box.id === wsBox.id);
    const cutList = module?.cutList ?? [];
    if (cutList.some((item) => item.id === pieceId)) {
      return wsBox.id;
    }
  }

  return undefined;
}

function storeMeshBaseState(mesh: THREE.Mesh): void {
  if (mesh.userData.showroomFocusBaseStored) return;
  const material = mesh.material;
  const materials = Array.isArray(material) ? material : [material];
  mesh.userData.showroomFocusBaseStored = true;
  mesh.userData.showroomFocusBaseOpacity = materials.map((mat) =>
    mat instanceof THREE.Material ? mat.opacity : 1
  );
  mesh.userData.showroomFocusBaseEmissive = materials.map((mat) =>
    mat instanceof THREE.MeshStandardMaterial ? mat.emissiveIntensity : 0
  );
}

function restoreMeshBaseState(mesh: THREE.Mesh): void {
  if (!mesh.userData.showroomFocusBaseStored) return;
  const material = mesh.material;
  const materials = Array.isArray(material) ? material : [material];
  const baseOpacity = mesh.userData.showroomFocusBaseOpacity as number[] | undefined;
  const baseEmissive = mesh.userData.showroomFocusBaseEmissive as number[] | undefined;
  materials.forEach((mat, index) => {
    if (!(mat instanceof THREE.Material)) return;
    if (baseOpacity?.[index] !== undefined) {
      mat.opacity = baseOpacity[index];
      mat.transparent = baseOpacity[index] < 1;
    }
    if (mat instanceof THREE.MeshStandardMaterial && baseEmissive?.[index] !== undefined) {
      mat.emissiveIntensity = baseEmissive[index];
    }
    mat.needsUpdate = true;
  });
}

function applyMeshFocus(mesh: THREE.Mesh, focus: "full" | "dim" | "highlight"): void {
  storeMeshBaseState(mesh);
  const material = mesh.material;
  const materials = Array.isArray(material) ? material : [material];
  materials.forEach((mat) => {
    if (!(mat instanceof THREE.Material)) return;
    if (focus === "full") {
      restoreMeshBaseState(mesh);
      return;
    }
    mat.transparent = true;
    mat.opacity = focus === "dim" ? DIM_OPACITY : FOCUS_OPACITY;
    if (mat instanceof THREE.MeshStandardMaterial && focus === "highlight") {
      mat.emissive.set("#ff8800");
      mat.emissiveIntensity = PIECE_EMISSIVE;
    }
    mat.needsUpdate = true;
  });
}

function ShowroomFocusController({
  mode,
  focusBoxId,
  pieceId,
}: {
  mode: ShowroomViewerMode;
  focusBoxId?: string;
  pieceId?: string;
}) {
  const { scene } = useThree();

  useEffect(() => {
    if (mode === "project" || !focusBoxId) {
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) restoreMeshBaseState(obj);
      });
      return;
    }

    scene.traverse((obj) => {
      if (typeof obj.name !== "string" || !obj.name.startsWith("showroom-box-wrap-")) return;

      const currentBoxId =
        (obj.userData.boxId as string | undefined) ?? obj.name.replace("showroom-box-wrap-", "");
      const isTarget = currentBoxId === focusBoxId;

      obj.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        if (isTarget) {
          applyMeshFocus(child, mode === "piece" && pieceId ? "highlight" : "full");
        } else {
          applyMeshFocus(child, "dim");
        }
      });
    });
  }, [focusBoxId, mode, pieceId, scene]);

  return null;
}

export default function ShowroomViewer({
  snapshot,
  mode,
  projectId,
  boxId,
  pieceId,
  readOnly = true,
}: ShowroomViewerProps) {
  const projectState = useMemo(() => reviveProjectState(snapshot), [snapshot]);
  const resolvedProjectId = projectId ?? snapshot?.id ?? "";
  const focusBoxId = useMemo(
    () => (projectState ? resolveFocusBoxId(projectState, mode, boxId, pieceId) : undefined),
    [projectState, mode, boxId, pieceId]
  );

  useLayoutEffect(() => {
    if (!resolvedProjectId || !projectState) return;
    useShowroomStore.getState().initProjectIds([resolvedProjectId]);
    if (readOnly) {
      useShowroomStore.getState().setSelectedId(null);
    }
  }, [resolvedProjectId, projectState, readOnly]);

  if (!snapshot || !projectState || !resolvedProjectId) {
    return (
      <div style={{ padding: 16, color: "var(--ui-color-muted, #71717a)" }}>
        Snapshot indisponível para visualização.
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {!readOnly ? <ShowroomToolbar /> : null}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ShowroomCanvas readOnly={readOnly} fillHeight>
          <ShowroomProjectRoot
            projectId={resolvedProjectId}
            projectState={projectState}
            offsetMm={{ xMm: 0, zMm: 0 }}
            displayName={snapshot.name}
            readOnly={readOnly}
          />
          <ShowroomFocusController mode={mode} focusBoxId={focusBoxId} pieceId={pieceId} />
          {readOnly ? <ShowroomReadOnlyInteractions projectState={projectState} /> : null}
        </ShowroomCanvas>
      </div>
    </div>
  );
}
