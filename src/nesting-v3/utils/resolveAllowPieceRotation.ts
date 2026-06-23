import type { ProjectState } from "../../context/projectTypes";
import type { CutPiece } from "../../core/cutlayout/cutLayoutTypes";
import { isIndustrialDoorPanelTipo } from "../../core/doors/industrialDoorPanels";

/**
 * Resolve override de rotação por peça a partir do projeto (sem alterar cutlist industrial).
 */
export function resolveAllowPieceRotationFromProject(
  project: ProjectState,
  cp: CutPiece
): boolean | undefined {
  const meta = cp.metadata;
  if (meta?.allowPieceRotation === true) return true;
  if (meta?.allowPieceRotation === false) return false;

  const remateId = typeof meta?.remateId === "string" ? meta.remateId : undefined;
  if (remateId) {
    const remate = (project.remates ?? []).find((r) => r.id === remateId);
    return remate?.allowPieceRotation;
  }

  const rodapeId = typeof meta?.rodapeId === "string" ? meta.rodapeId : undefined;
  if (rodapeId) {
    const rodape = (project.rodapes ?? []).find((r) => r.id === rodapeId);
    return rodape?.allowPieceRotation;
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
    if (drawerIdx >= 0) return box.drawersLayer?.[drawerIdx]?.allowPieceRotation;
  }
  if (tipo === "gaveta_frente_ext" || tipo === "gaveta_frente_int" || tipo === "gaveta_frente") {
    return box.drawersLayer?.[0]?.allowPieceRotation;
  }

  if (isIndustrialDoorPanelTipo(tipo) || tipo === "frente_fixa") {
    if (panelId && box.panelIds?.portas) {
      const doorIdx = box.panelIds.portas.indexOf(panelId);
      if (doorIdx >= 0) return box.doorsLayer?.[doorIdx]?.allowPieceRotation;
    }
    if (panelId && box.panelIds?.frente_fixa === panelId) {
      return box.doorsLayer?.[0]?.allowPieceRotation ?? box.allowPieceRotation;
    }
    return box.doorsLayer?.[0]?.allowPieceRotation;
  }

  return box.allowPieceRotation;
}
