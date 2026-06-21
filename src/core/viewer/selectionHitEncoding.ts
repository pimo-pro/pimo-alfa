import type { MouseMenuTarget } from "../../ui/context-menu/ContextMenuEngine";
import {
  boxSelectionId,
  doorSelectionId,
  drawerSelectionId,
  divisorSelectionId,
  pieceSelectionId,
  remateSelectionId,
  separadorSelectionId,
} from "./selectionIds";

/** Converte hit de raycast/menu em ID codificado para `selectedObjects`. */
export function encodeSelectionIdFromLayerHit(hit: MouseMenuTarget | null): string | null {
  if (!hit || hit.type === "empty" || hit.type === "room") return null;
  if (hit.type === "box" && hit.boxId) return boxSelectionId(hit.boxId);
  if (hit.type === "door" && hit.doorLayerId) return doorSelectionId(hit.doorLayerId);
  if (hit.type === "drawer" && hit.drawerLayerId) return drawerSelectionId(hit.drawerLayerId);
  if (hit.type === "remate" && hit.remateId) return remateSelectionId(hit.remateId);
  if (hit.type === "divSep" && hit.divSepKind === "div" && hit.divSepItemId) {
    return divisorSelectionId(hit.divSepItemId);
  }
  if (hit.type === "divSep" && hit.divSepKind === "sep" && hit.divSepItemId) {
    return separadorSelectionId(hit.divSepItemId);
  }
  if (hit.type === "piece" && hit.boxId && hit.panelId) {
    return pieceSelectionId(hit.boxId, hit.panelId);
  }
  return null;
}
