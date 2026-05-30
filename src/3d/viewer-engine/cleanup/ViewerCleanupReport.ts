/**
 * Registo interno — passagem de estabilidade/limpeza do Viewer Engine.
 * Não altera runtime; documenta remoções e isolamentos.
 */

export type ViewerCleanupEntry = {
  id: string;
  category: "legacy" | "listener" | "dead-code" | "duplicate" | "global";
  location: string;
  action: "removed" | "isolated" | "deduplicated" | "documented";
  note: string;
};

/** Entradas desta passagem (2026-05). */
export const VIEWER_CLEANUP_REPORT: ViewerCleanupEntry[] = [
  {
    id: "transform-change-noop",
    category: "dead-code",
    location: "ViewerCore.ts — TransformControls listener `change`",
    action: "removed",
    note: "Listener vazio (régua antiga); zero efeito funcional.",
  },
  {
    id: "transform-drag-end-dup",
    category: "duplicate",
    location: "ViewerCore.ts — mouseUp + dragging-changed(false)",
    action: "deduplicated",
    note: "Fim de drag unificado em finishTransformDrag() com guard por frame.",
  },
  {
    id: "selection-manager-export",
    category: "legacy",
    location: "viewer-engine/index.ts — ViewerSelectionManager",
    action: "isolated",
    note: "Export removido do barrel; substituído por ViewerState. Classe mantida (@deprecated).",
  },
  {
    id: "dispose-auto-layout-bridge",
    category: "legacy",
    location: "ViewerCore.dispose() — AutoLayoutEngine",
    action: "removed",
    note: "bindBridge(null) no dispose para libertar referências ao ProjectContext.",
  },
  {
    id: "dispose-callbacks-null",
    category: "global",
    location: "ViewerCore.dispose() — onBoxTransform / onBoxSelected",
    action: "removed",
    note: "Callbacks externos anulados no teardown.",
  },
  {
    id: "room-openings-cache",
    category: "duplicate",
    location: "ViewerCore.getRoomOpeningsForSnapping()",
    action: "deduplicated",
    note: "Cache invalidado em setRoomFromManager/clearRoomFromManager; evita Box3 por frame.",
  },
  {
    id: "room-mesh-fingerprint",
    category: "duplicate",
    location: "Workspace.tsx — roomMeshSyncToken effect",
    action: "deduplicated",
    note: "Rebuild 3D só quando geometria/aberturas mudam; locked/visible sem rebuild.",
  },
];

export function getViewerCleanupSummary(): string {
  return VIEWER_CLEANUP_REPORT.map((e) => `[${e.action}] ${e.id}: ${e.note}`).join("\n");
}
