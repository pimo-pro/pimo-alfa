/**
 * Configuração centralizada da toolbar do Viewer.
 * Ícones, ações, tooltips e IDs para ViewerToolbar e Tools3DToolbar.
 *
 * Novos botões (ex.: Reset Camera): adicionar em VIEWER_TOOLBAR_ITEMS
 * respeitando a ordem definida para a toolbar.
 */

import type { IconName } from "@/components/icons";

export type ToolbarActionId =
  | "reset-camera"
  | "projeto"
  | "novo"
  | "desfazer"
  | "refazer"
  | "imagem"
  | "enviar";

export type Tool3DId = "select" | "move" | "rotate" | "scale" | "orbit" | "pan";

export const VIEWER_TOOLBAR_ITEMS: Array<{
  id: ToolbarActionId;
  label: string;
  icon: string;
  iconName: IconName;
  tooltip: string;
}> = [
  { id: "projeto", label: "PROJETO", icon: "P", iconName: "projects", tooltip: "Projetos salvos" },
  { id: "novo", label: "NOVO", icon: "N", iconName: "adminDocs", tooltip: "Limpar dados locais e iniciar sessão nova" },
  { id: "desfazer", label: "DESFAZER", icon: "⟲", iconName: "undo", tooltip: "Desfazer (Ctrl+Z)" },
  { id: "refazer", label: "REFAZER", icon: "⟳", iconName: "redo", tooltip: "Refazer (Ctrl+Shift+Z)" },
  { id: "imagem", label: "PHOTO", icon: "📷", iconName: "photoMode", tooltip: "Photo Mode" },
  { id: "reset-camera", label: "RESET", icon: "⌖", iconName: "resetCamera", tooltip: "Reset Camera – Vista frontal centralizada" },
  { id: "enviar", label: "ENVIAR", icon: "↗", iconName: "send", tooltip: "Enviar pacote" },
];

export const TOOLS_3D_ITEMS: Array<{
  id: Tool3DId;
  label: string;
  icon: string;
  iconName: IconName;
  tooltip: string;
  eventKey: string;
}> = [
  { id: "select", label: "Selecionar", icon: "◆", iconName: "select", tooltip: "Selecionar", eventKey: "tool:select" },
  { id: "move", label: "Mover", icon: "↔", iconName: "move", tooltip: "Mover", eventKey: "tool:move" },
  { id: "rotate", label: "Rodar", icon: "↻", iconName: "rotate", tooltip: "Rodar", eventKey: "tool:rotate" },
  { id: "scale", label: "Escalar", icon: "⊞", iconName: "adminSettings", tooltip: "Escalar (futuro)", eventKey: "tool:scale" },
  { id: "orbit", label: "Orbit", icon: "◎", iconName: "orbit", tooltip: "Orbit (futuro)", eventKey: "tool:orbit" },
  { id: "pan", label: "Pan", icon: "✥", iconName: "pan", tooltip: "Pan (futuro)", eventKey: "tool:pan" },
];
