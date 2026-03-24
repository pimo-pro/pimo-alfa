import type { DrillType, TechnicalDrillHole, ViewerDrillMarkersByPanel } from "../../../core/types";

/**
 * Tipos de furo tratados como furação CNC / montagem estrutural no Viewer.
 * Não são mostrados na malha nem nos contornos; permanecem na cutlist/manufatura.
 * Visíveis: dobradiças, corrediças, prateleiras e restantes tipos (ex.: variantes de nesting importadas).
 */
const VIEWER_MESH_HIDDEN_MANUFACTURING_TIPOS: ReadonlySet<DrillType> = new Set([
  "cavilha",
  "parafuso",
  "minifix",
]);

export function isViewerManufacturingCncDrillTipo(tipo: DrillType): boolean {
  return VIEWER_MESH_HIDDEN_MANUFACTURING_TIPOS.has(tipo);
}

export function filterTechnicalDrillHolesForViewerMesh(
  holes: TechnicalDrillHole[] | undefined | null
): TechnicalDrillHole[] {
  if (!holes?.length) return [];
  return holes.filter((h) => !isViewerManufacturingCncDrillTipo(h.tipo));
}

export function filterViewerDrillMarkersForMesh(markers: ViewerDrillMarkersByPanel): ViewerDrillMarkersByPanel {
  return {
    cima: filterTechnicalDrillHolesForViewerMesh(markers.cima),
    fundo: filterTechnicalDrillHolesForViewerMesh(markers.fundo),
    lateral_esquerda: filterTechnicalDrillHolesForViewerMesh(markers.lateral_esquerda),
    lateral_direita: filterTechnicalDrillHolesForViewerMesh(markers.lateral_direita),
    porta: filterTechnicalDrillHolesForViewerMesh(markers.porta),
    portaPerDoor: markers.portaPerDoor?.map((row) => filterTechnicalDrillHolesForViewerMesh(row)),
  };
}
