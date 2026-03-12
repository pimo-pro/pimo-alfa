import { useEffect, useRef } from "react";
import { useProject } from "../../../context/useProject";

export type ContextMenuPosition = { x: number; y: number } | null;

export type ContextMenuProps = {
  /** Posição do canto superior esquerdo do menu (clientX, clientY). null = não exibir. */
  position: ContextMenuPosition;
  /** Chamado ao fechar o menu (clique fora, ESC ou após ação). */
  onClose: () => void;
};

const menuStyle: React.CSSProperties = {
  position: "fixed",
  minWidth: 180,
  background: "var(--popover-bg)",
  border: "1px solid var(--popover-border)",
  borderRadius: 8,
  padding: 6,
  zIndex: 100,
  display: "flex",
  flexDirection: "column",
  gap: 2,
  boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
};

const itemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  padding: "8px 12px",
  border: "none",
  borderRadius: 6,
  background: "transparent",
  color: "var(--text-main)",
  fontSize: 13,
  cursor: "pointer",
  textAlign: "left",
  fontFamily: "inherit",
};

/**
 * Menu de contexto (clique direito) no Viewer/Workspace.
 * Mostra: Bloquear/Desbloquear peça (se houver peça selecionada) e modo do mouse (CAD / Classic).
 * Fecha ao clicar fora, pressionar ESC ou ao escolher uma ação.
 */
export default function ContextMenu({ position, onClose }: ContextMenuProps) {
  const { project, actions } = useProject();
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedBoxId = project.selectedWorkspaceBoxId ?? "";
  const rawSelectedIds = project.selectedWorkspaceBoxIds;
  const selectedWorkspaceBoxIds = Array.isArray(rawSelectedIds)
    ? rawSelectedIds
    : selectedBoxId
      ? [selectedBoxId]
      : [];
  const selectedGroupId = project.selectedGroupId ?? null;
  const selectedBox = selectedBoxId
    ? project.workspaceBoxes.find((b) => b.id === selectedBoxId)
    : undefined;
  const locked = selectedBox?.locked === true;
  const mousePreset = project.viewerSettings.mousePreset ?? "cad";
  const hasMultiSelect = selectedWorkspaceBoxIds.length >= 2;
  const isGroupSelected = selectedGroupId != null;
  const showAgrupar = hasMultiSelect && !isGroupSelected;
  const showDesagrupar = isGroupSelected;

  if (import.meta.env.DEV && position) {
    console.log("[ContextMenu]", {
      selectedWorkspaceBoxIds,
      selectedGroupId,
      hasMultiSelect,
      showAgrupar,
      showDesagrupar,
    });
  }

  useEffect(() => {
    if (!position) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [position, onClose]);

  useEffect(() => {
    if (!position) return;
    const handlePointerDown = (e: MouseEvent) => {
      const el = menuRef.current;
      if (el && !el.contains(e.target as Node)) onClose();
    };
    // Pequeno atraso para não fechar no mesmo evento que abriu
    const t = setTimeout(() => {
      window.addEventListener("pointerdown", handlePointerDown);
    }, 0);
    return () => {
      clearTimeout(t);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [position, onClose]);

  if (!position) return null;

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Menu de contexto"
      style={{
        ...menuStyle,
        left: position.x,
        top: position.y,
        transform: "translate(8px, 8px)",
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {selectedBoxId && (
        <button
          type="button"
          role="menuitem"
          style={itemStyle}
          onClick={() => {
            actions.setWorkspaceBoxLocked(selectedBoxId, !locked);
            onClose();
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--viewer-toolbar-hover-bg)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <span aria-hidden>{locked ? "🔓" : "🔒"}</span>
          <span>{locked ? "Desbloquear peça" : "Bloquear peça"}</span>
        </button>
      )}
      {selectedBoxId && (
        <button
          type="button"
          role="menuitem"
          style={itemStyle}
          onClick={() => {
            onClose();
            const currentName = selectedBox?.nome ?? "";
            const newName = window.prompt("Novo nome da peça:", currentName);
            if (newName != null) {
              const trimmed = newName.trim();
              if (trimmed) actions.setWorkspaceBoxNome(selectedBoxId, trimmed);
            }
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--viewer-toolbar-hover-bg)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <span aria-hidden>✏️</span>
          <span>Renomear peça</span>
        </button>
      )}
      {selectedBoxId && (
        <button
          type="button"
          role="menuitem"
          style={itemStyle}
          onClick={() => {
            actions.duplicateWorkspaceBoxAtOffset(50);
            onClose();
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--viewer-toolbar-hover-bg)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <span aria-hidden>📋</span>
          <span>Duplicar peça</span>
        </button>
      )}
      {selectedBoxId && (
        <button
          type="button"
          role="menuitem"
          style={{ ...itemStyle, color: "var(--text-danger, #f87171)" }}
          onClick={() => {
            actions.removeWorkspaceBox();
            onClose();
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--viewer-toolbar-hover-bg)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <span aria-hidden>🗑️</span>
          <span>Excluir peça</span>
        </button>
      )}
      {showAgrupar && (
        <button
          type="button"
          role="menuitem"
          title="Use Shift para selecionar várias peças"
          style={itemStyle}
          onClick={() => {
            actions.createGroup();
            onClose();
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--viewer-toolbar-hover-bg)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <span aria-hidden>🔗</span>
          <span>Agrupar peças</span>
        </button>
      )}
      {showDesagrupar && (
        <button
          type="button"
          role="menuitem"
          style={itemStyle}
          onClick={() => {
            actions.ungroup();
            onClose();
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--viewer-toolbar-hover-bg)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <span aria-hidden>🔀</span>
          <span>Desagrupar</span>
        </button>
      )}
      {selectedBoxId && (
        <div
          style={{
            height: 1,
            background: "var(--popover-border)",
            margin: "4px 0",
          }}
          aria-hidden
        />
      )}
      <button
        type="button"
        role="menuitem"
        style={itemStyle}
        onClick={() => {
          actions.setViewerSettings({ mousePreset: "cad" });
          onClose();
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--viewer-toolbar-hover-bg)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        <span style={{ width: 16, textAlign: "center" }}>{mousePreset === "cad" ? "✓" : ""}</span>
        <span>Mouse CAD</span>
      </button>
      <button
        type="button"
        role="menuitem"
        style={itemStyle}
        onClick={() => {
          actions.setViewerSettings({ mousePreset: "classic" });
          onClose();
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--viewer-toolbar-hover-bg)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        <span style={{ width: 16, textAlign: "center" }}>{mousePreset === "classic" ? "✓" : ""}</span>
        <span>Mouse Classic</span>
      </button>
    </div>
  );
}
