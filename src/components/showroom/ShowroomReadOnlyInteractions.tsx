/**
 * Interacções read-only no showroom PROJETOS: double-click abre/fecha portas e gavetas
 * sem mutar o ProjectState.
 */

import { useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef } from "react";
import * as THREE from "three";

import type { ProjectState } from "../../context/projectTypes";
import { createDoorObject, getDoorSpecFromGroup } from "../../3d/objects/BoxBuilder";
import { buildDrawerSpecs, syncDrawerLayerMotion } from "../../3d/objects/DrawerFactory";

type Props = {
  projectState: ProjectState;
  enabled?: boolean;
};

function findDoorLayerGroup(object: THREE.Object3D | null): THREE.Group | null {
  let current: THREE.Object3D | null = object;
  while (current) {
    const doorLayerId = current.userData?.doorLayerId as string | undefined;
    if (doorLayerId && current.name === `door-layer-${doorLayerId}`) {
      return current as THREE.Group;
    }
    current = current.parent;
  }
  return null;
}

function findDrawerLayerGroup(object: THREE.Object3D | null): THREE.Group | null {
  let current: THREE.Object3D | null = object;
  while (current) {
    const drawerLayerId = current.userData?.drawerLayerId as string | undefined;
    if (drawerLayerId && current.name === `drawer-layer-${drawerLayerId}`) {
      return current as THREE.Group;
    }
    current = current.parent;
  }
  return null;
}

function disposeDoorGroup(group: THREE.Object3D): void {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose();
      const m = child.material;
      if (Array.isArray(m)) m.forEach((x) => x.dispose?.());
      else (m as THREE.Material | undefined)?.dispose?.();
    }
  });
}

export function ShowroomReadOnlyInteractions({ projectState, enabled = true }: Props) {
  const { camera, scene, gl } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const pointer = useRef(new THREE.Vector2());
  const doorOpenRef = useRef<Map<string, boolean>>(new Map());
  const drawerOpenRef = useRef<Map<string, boolean>>(new Map());

  useEffect(() => {
    doorOpenRef.current.clear();
    drawerOpenRef.current.clear();
    for (const wsBox of projectState.workspaceBoxes ?? []) {
      for (const door of wsBox.doorsLayer ?? []) {
        doorOpenRef.current.set(door.id, Boolean(door.isOpen));
      }
      for (const drawer of wsBox.drawersLayer ?? []) {
        drawerOpenRef.current.set(drawer.id, Boolean(drawer.isOpen));
      }
    }
  }, [projectState]);

  const toggleDoor = useCallback((doorGroup: THREE.Group) => {
    const spec = getDoorSpecFromGroup(doorGroup);
    if (!spec) return;

    const leaf = doorGroup.children.find((c) => c instanceof THREE.Mesh) as THREE.Mesh | undefined;
    const material = leaf?.material;
    if (!(material instanceof THREE.Material)) return;

    const nextOpen = !(doorOpenRef.current.get(spec.id) ?? spec.isOpen);
    doorOpenRef.current.set(spec.id, nextOpen);

    const parent = doorGroup.parent;
    if (!parent) return;

    const newDoor = createDoorObject({ ...spec, isOpen: nextOpen }, material);
    parent.remove(doorGroup);
    disposeDoorGroup(doorGroup);
    parent.add(newDoor);
  }, []);

  const toggleDrawer = useCallback(
    (drawerGroup: THREE.Group, drawerLayerId: string) => {
      const boxId = drawerGroup.userData?.boxId as string | undefined;
      const wsBox = projectState.workspaceBoxes.find(
        (b) => b.id === boxId || (b.drawersLayer ?? []).some((d) => d.id === drawerLayerId)
      );
      const drawerItem = wsBox?.drawersLayer?.find((d) => d.id === drawerLayerId);
      if (!drawerItem) return;

      const nextOpen = !(drawerOpenRef.current.get(drawerLayerId) ?? drawerItem.isOpen);
      drawerOpenRef.current.set(drawerLayerId, nextOpen);

      const [spec] = buildDrawerSpecs([{ ...drawerItem, isOpen: nextOpen }]);
      if (!spec) return;
      syncDrawerLayerMotion(drawerGroup, spec);
      drawerGroup.userData.isOpen = nextOpen;
    },
    [projectState.workspaceBoxes]
  );

  useEffect(() => {
    if (!enabled) return;

    const canvas = gl.domElement;

    const onDoubleClick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.current.setFromCamera(pointer.current, camera);

      const hits = raycaster.current.intersectObjects(scene.children, true);
      for (const hit of hits) {
        const doorGroup = findDoorLayerGroup(hit.object);
        if (doorGroup) {
          event.preventDefault();
          event.stopPropagation();
          toggleDoor(doorGroup);
          return;
        }

        const drawerGroup = findDrawerLayerGroup(hit.object);
        const drawerLayerId = drawerGroup?.userData?.drawerLayerId as string | undefined;
        if (drawerGroup && drawerLayerId) {
          event.preventDefault();
          event.stopPropagation();
          toggleDrawer(drawerGroup, drawerLayerId);
          return;
        }
      }
    };

    canvas.addEventListener("dblclick", onDoubleClick);
    return () => canvas.removeEventListener("dblclick", onDoubleClick);
  }, [camera, enabled, gl.domElement, scene, toggleDoor, toggleDrawer]);

  return null;
}
