/**
 * Tipos partilhados — seleção interna (faces, arestas, pontos) do Viewer.
 * Fase 5 Parte A: fundação para régua interna (Parte B).
 */

export type InternalSelectionType = "internal-face" | "internal-edge" | "internal-point";

export type InternalSelectionPoint = {
  x: number;
  y: number;
  z: number;
};

export type InternalSelectionState = {
  type: InternalSelectionType;
  boxId: string;
  panelId?: string;
  faceId?: string;
  edgeId?: string;
  pointId?: string;
  worldPoint: InternalSelectionPoint;
  localPoint: InternalSelectionPoint;
  /** Aresta selecionada (espaço mundo), quando type === internal-edge. */
  worldEdgeStart?: InternalSelectionPoint;
  worldEdgeEnd?: InternalSelectionPoint;
};

export type InternalSelectionHit = InternalSelectionState;

export function cloneInternalSelectionState(
  state: InternalSelectionState | null
): InternalSelectionState | null {
  if (!state) return null;
  return {
    ...state,
    worldPoint: { ...state.worldPoint },
    localPoint: { ...state.localPoint },
    worldEdgeStart: state.worldEdgeStart ? { ...state.worldEdgeStart } : undefined,
    worldEdgeEnd: state.worldEdgeEnd ? { ...state.worldEdgeEnd } : undefined,
  };
}
