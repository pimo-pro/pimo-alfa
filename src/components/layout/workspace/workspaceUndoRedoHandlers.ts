import type { ProjectActions } from "../../../context/projectTypes";

/**
 * Mesma semântica que ViewerToolbar.handleAction("desfazer" | "refazer").
 * Funções puras — o `actions` vem de useProject() no Workspace ou noutro ascendente com ProjectProvider.
 */
export function runProjectUndo(actions: Pick<ProjectActions, "undo">): void {
  actions.undo();
}

export function runProjectRedo(actions: Pick<ProjectActions, "redo">): void {
  actions.redo();
}
