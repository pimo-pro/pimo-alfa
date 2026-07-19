/**
 * Botões desfazer/refazer no Header; fora de WorkspaceUndoRedoRegistryProvider não renderiza nada.
 * Ícones e tooltips iguais a `VIEWER_TOOLBAR_ITEMS` (desfazer / refazer).
 */

import type { CSSProperties } from "react";
import { VIEWER_TOOLBAR_ITEMS } from "../../../constants/toolbarConfig";
import { useWorkspaceUndoRedoRegistryOptional } from "../../../context/WorkspaceUndoRedoRegistryContext";
import { Icon } from "@/components/icons";

const cfgUndo = VIEWER_TOOLBAR_ITEMS.find((i) => i.id === "desfazer");
const cfgRedo = VIEWER_TOOLBAR_ITEMS.find((i) => i.id === "refazer");

/** Mesmo estilo inline que `HeaderActionButton` em Header.tsx (sem novos tokens CSS). */
const headerActionButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  minHeight: 29,
  padding: "0 10px",
  border: "1px solid var(--border)",
  borderRadius: "var(--pi-btn-radius, var(--radius))",
  background: "var(--button-ghost-bg)",
  color: "var(--text-main)",
  cursor: "pointer",
  fontSize: 13,
};

export default function HeaderUndoRedoButtons() {
  const registry = useWorkspaceUndoRedoRegistryOptional();
  if (!registry) return null;

  const { handleUndo, handleRedo } = registry;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <button
        type="button"
        className="header-action-button"
        title={cfgUndo?.tooltip ?? "Desfazer (Ctrl+Z)"}
        aria-label={cfgUndo?.tooltip ?? "Desfazer (Ctrl+Z)"}
        style={headerActionButtonStyle}
        onClick={handleUndo}
      >
        <Icon name={cfgUndo?.iconName ?? "undo"} size={16} aria-hidden />
      </button>
      <button
        type="button"
        className="header-action-button"
        title={cfgRedo?.tooltip ?? "Refazer (Ctrl+Shift+Z)"}
        aria-label={cfgRedo?.tooltip ?? "Refazer (Ctrl+Shift+Z)"}
        style={headerActionButtonStyle}
        onClick={handleRedo}
      >
        <Icon name={cfgRedo?.iconName ?? "redo"} size={16} aria-hidden />
      </button>
    </div>
  );
}
