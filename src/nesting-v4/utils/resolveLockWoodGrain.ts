import type { ProjectState } from "../../context/projectTypes";
import type { CutPiece } from "../../core/cutlayout/cutLayoutTypes";
import { isIndustrialDoorPanelTipo } from "../../core/doors/industrialDoorPanels";
import { isMaterialMadeira } from "../../core/materials/nestingGrainLock";

/**
 * Resolve bloqueio de veio por peça a partir do projeto (sem alterar cutlist industrial).
 */
export function resolveLockWoodGrainFromProject(
  project: ProjectState,
  cp: CutPiece
): boolean | undefined {
  const meta = cp.metadata;
  if (meta?.lockWoodGrain === true) return true;
  if (meta?.lockWoodGrain === false) return false;

  const materialId = cp.materialId;
  if (isMaterialMadeira(materialId)) return true;

  const remateId = typeof meta?.remateId === "string" ? meta.remateId : undefined;
  if (remateId) {
    const remate = (project.remates ?? []).find((r) => r.id === remateId);
    if (remate?.lockWoodGrain === true) return true;
    if (remate?.lockWoodGrain === false) return false;
    if (isMaterialMadeira(remate?.materialPresetId)) return true;
    return remate?.lockWoodGrain;
  }

  const rodapeId = typeof meta?.rodapeId === "string" ? meta.rodapeId : undefined;
  if (rodapeId) {
    const rodape = (project.rodapes ?? []).find((r) => r.id === rodapeId);
    if (rodape?.lockWoodGrain === true) return true;
    if (rodape?.lockWoodGrain === false) return false;
    if (isMaterialMadeira(rodape?.materialId)) return true;
    return rodape?.lockWoodGrain;
  }

  const boxId = cp.boxId;
  if (!boxId) return undefined;
  const box = project.workspaceBoxes.find((b) => b.id === boxId);
  if (!box) return undefined;

  const panelId = typeof meta?.panelId === "string" ? meta.panelId : undefined;
  const tipo = cp.pieceTipo ?? "";

  if (
    (tipo === "gaveta_frente_ext" || tipo === "gaveta_frente_int" || tipo === "gaveta_frente") &&
    panelId &&
    box.panelIds?.gavetas
  ) {
    const drawerIdx = box.panelIds.gavetas.indexOf(panelId);
    if (drawerIdx >= 0) {
      const drawer = box.drawersLayer?.[drawerIdx];
      if (drawer?.lockWoodGrain === true) return true;
      if (drawer?.lockWoodGrain === false) return false;
      if (isMaterialMadeira(drawer?.material ?? drawer?.materialId)) return true;
      return drawer?.lockWoodGrain;
    }
  }
  if (tipo === "gaveta_frente_ext" || tipo === "gaveta_frente_int" || tipo === "gaveta_frente") {
    const drawer = box.drawersLayer?.[0];
    if (drawer?.lockWoodGrain === true) return true;
    if (drawer?.lockWoodGrain === false) return false;
    if (isMaterialMadeira(drawer?.material ?? drawer?.materialId)) return true;
    return drawer?.lockWoodGrain;
  }

  if (isIndustrialDoorPanelTipo(tipo) || tipo === "frente_fixa") {
    if (panelId && box.panelIds?.portas) {
      const doorIdx = box.panelIds.portas.indexOf(panelId);
      if (doorIdx >= 0) {
        const door = box.doorsLayer?.[doorIdx];
        if (door?.lockWoodGrain === true) return true;
        if (door?.lockWoodGrain === false) return false;
        if (isMaterialMadeira(door?.material ?? door?.materialId)) return true;
        return door?.lockWoodGrain;
      }
    }
    if (panelId && box.panelIds?.frente_fixa === panelId) {
      const door = box.doorsLayer?.[0];
      if (door?.lockWoodGrain === true) return true;
      if (door?.lockWoodGrain === false) return false;
      if (isMaterialMadeira(door?.material ?? door?.materialId ?? box.material)) return true;
      return door?.lockWoodGrain ?? box.lockWoodGrain;
    }
    const door = box.doorsLayer?.[0];
    if (door?.lockWoodGrain === true) return true;
    if (door?.lockWoodGrain === false) return false;
    if (isMaterialMadeira(door?.material ?? door?.materialId)) return true;
    return door?.lockWoodGrain;
  }

  if (box.lockWoodGrain === true) return true;
  if (box.lockWoodGrain === false) return false;
  if (isMaterialMadeira(box.material)) return true;
  return box.lockWoodGrain;
}
