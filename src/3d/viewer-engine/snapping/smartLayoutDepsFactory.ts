import type * as THREE from "three";
import type { ViewerBoxEntry } from "../types";
import type { SmartAlignSnapContext } from "./smartAlignSnapTypes";
import type { SmartLayoutBridge, SmartLayoutEngineDeps } from "./smartLayoutTypes";

export function createDisabledSmartLayoutDeps(deps: {
  getBridge: () => SmartLayoutBridge | null;
  buildSnapContext: () => SmartAlignSnapContext;
  getBoxEntry: (_boxId: string) => ViewerBoxEntry | undefined;
}): SmartLayoutEngineDeps {
  return {
    getBridge: deps.getBridge,
    refineBoxWithSmartSnap: () => {},
    isSmartSnapEnabled: () => false,
    buildSnapContext: deps.buildSnapContext,
    getBoxWorldPosition: (boxId: string) => {
      const entry = deps.getBoxEntry(boxId);
      return entry ? entry.mesh.position.clone() : null;
    },
    setBoxWorldPosition: (boxId: string, pos: THREE.Vector3) => {
      const entry = deps.getBoxEntry(boxId);
      if (entry) entry.mesh.position.copy(pos);
    },
  };
}
