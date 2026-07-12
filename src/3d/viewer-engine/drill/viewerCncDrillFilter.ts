import type { DrillType, TechnicalDrillHole, ViewerDrillMarkersByPanel } from "../../../core/types";

/**
 * Todos os furos industriais do SSOT (cutlist / PanelDrillHole) são visíveis no viewer 3D.
 * A filtragem por tipo foi removida — cavilha, parafuso e minifix aparecem na peça correcta.
 */
export function isViewerManufacturingCncDrillTipo(_tipo: DrillType): boolean {
  return false;
}

export function filterTechnicalDrillHolesForViewerMesh(
  holes: TechnicalDrillHole[] | undefined | null
): TechnicalDrillHole[] {
  if (!holes?.length) return [];
  return holes;
}

export function filterViewerDrillMarkersForMesh(markers: ViewerDrillMarkersByPanel): ViewerDrillMarkersByPanel {
  return {
    cima: filterTechnicalDrillHolesForViewerMesh(markers.cima),
    fundo: filterTechnicalDrillHolesForViewerMesh(markers.fundo),
    lateral_esquerda: filterTechnicalDrillHolesForViewerMesh(markers.lateral_esquerda),
    lateral_direita: filterTechnicalDrillHolesForViewerMesh(markers.lateral_direita),
    porta: filterTechnicalDrillHolesForViewerMesh(markers.porta),
    portaPerDoor: markers.portaPerDoor?.map((row) => filterTechnicalDrillHolesForViewerMesh(row)),
    frente_fixa: filterTechnicalDrillHolesForViewerMesh(markers.frente_fixa),
    separadoresById: markers.separadoresById
      ? Object.fromEntries(
          Object.entries(markers.separadoresById).map(([id, holes]) => [
            id,
            filterTechnicalDrillHolesForViewerMesh(holes),
          ])
        )
      : undefined,
    divisoresById: markers.divisoresById
      ? Object.fromEntries(
          Object.entries(markers.divisoresById).map(([id, holes]) => [
            id,
            filterTechnicalDrillHolesForViewerMesh(holes),
          ])
        )
      : undefined,
  };
}
