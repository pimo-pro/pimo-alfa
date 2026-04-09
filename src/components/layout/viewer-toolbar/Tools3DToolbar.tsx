/**
 * Segunda linha de toolbar no layout do Workspace (reservada / legacy).
 * Exportações e «Gerar Arquivo» estão apenas em UnifiedExportPanel («Salvar e Gerar Design»).
 * Props mantidas para compatibilidade com Workspace.tsx sem alterar o pai.
 */

import type { Tool3DId } from "../../../constants/toolbarConfig";

export type Tools3DToolbarProps = {
  activeTool?: Tool3DId;
  onToolSelect?: (_toolId: Tool3DId, _eventKey: string) => void;
  lockEnabled?: boolean;
  onToggleLock?: () => void;
};

export default function Tools3DToolbar(_props: Tools3DToolbarProps) {
  return null;
}
