import { useEffect, useRef, useState } from "react";
import { useProject } from "../../../context/useProject";
import { listOfficialMaterials } from "../../../core/materials/materials.api";

export type ContextMenuPosition = { x: number; y: number } | null;

export type ContextMenuLayerTarget = {
  boxId: string;
  type: "door" | "drawer";
  doorLayerId?: string;
  drawerLayerId?: string;
} | null;

export type ContextMenuProps = {
  /** Posição do canto superior esquerdo do menu (clientX, clientY). null = não exibir. */
  position: ContextMenuPosition;
  /** Chamado ao fechar o menu (clique fora, ESC ou após ação). */
  onClose: () => void;
  /** Alvo do clique direito: porta ou gaveta (para mostrar item "Alterar material"). */
  contextMenuLayerTarget?: ContextMenuLayerTarget;
  /** Chamado após alterar material da porta (para atualizar o viewer imediatamente). */
  onDoorMaterialChange?: (_boxId: string, _doorLayerId: string, _materialId: string) => void;
  /** Chamado após alterar material da gaveta (para atualizar o viewer imediatamente). */
  onDrawerMaterialChange?: (_boxId: string, _drawerLayerId: string, _materialId: string) => void;
};

/** Materiais oficiais do projeto (mesma lista do módulo); apenas labels para o picker. */
const OFFICIAL_MATERIALS = listOfficialMaterials();

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
export default function ContextMenu({
  position,
  onClose,
  contextMenuLayerTarget = null,
  onDoorMaterialChange,
  onDrawerMaterialChange,
}: ContextMenuProps) {
  const { project, actions } = useProject();
  const menuRef = useRef<HTMLDivElement>(null);
  const [materialSubmenuOpen, setMaterialSubmenuOpen] = useState<"door" | "drawer" | null>(null);

  const selectedBoxId = project.selectedWorkspaceBoxId ?? "";
  const selectedBox = selectedBoxId
    ? project.workspaceBoxes.find((b) => b.id === selectedBoxId)
    : undefined;
  const locked = selectedBox?.locked === true;
  const mousePreset = project.viewerSettings.mousePreset ?? "cad";

  const isDoorTarget = contextMenuLayerTarget?.type === "door" && contextMenuLayerTarget.doorLayerId != null;
  const isDrawerTarget = contextMenuLayerTarget?.type === "drawer" && contextMenuLayerTarget.drawerLayerId != null;
  const showDoorMaterial = isDoorTarget;
  const showDrawerMaterial = isDrawerTarget;

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
      if (el && !el.contains(e.target as Node)) {
        onClose();
        setMaterialSubmenuOpen(null);
      }
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
      {selectedBoxId && (
        <button
          type="button"
          role="menuitem"
          style={itemStyle}
          onClick={() => {
            actions.alignFrontWithNeighbor(selectedBoxId);
            onClose();
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--viewer-toolbar-hover-bg)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <span aria-hidden>↔</span>
          <span>Alinhar pela frente do box ao lado</span>
        </button>
      )}
      {(showDoorMaterial || showDrawerMaterial) && (
        <div
          style={{ position: "relative" }}
          onMouseEnter={() => setMaterialSubmenuOpen(showDoorMaterial ? "door" : "drawer")}
          onMouseLeave={() => setMaterialSubmenuOpen(null)}
        >
          <button
            type="button"
            role="menuitem"
            style={itemStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--viewer-toolbar-hover-bg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <span aria-hidden>🎨</span>
            <span>{showDoorMaterial ? "Alterar material da porta" : "Alterar material da gaveta"}</span>
          </button>
          {materialSubmenuOpen && (
            <div
              role="menu"
              aria-label="Materiais"
              style={{
                ...menuStyle,
                position: "absolute",
                left: "100%",
                top: 0,
                marginLeft: 4,
                minWidth: 140,
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {OFFICIAL_MATERIALS.map((m) => (
                <button
                  key={m.canonicalId}
                  type="button"
                  role="menuitem"
                  style={itemStyle}
                  onClick={() => {
                    const canonicalId = m.canonicalId;
                    if (contextMenuLayerTarget?.type === "door" && contextMenuLayerTarget.doorLayerId) {
                      onDoorMaterialChange?.(contextMenuLayerTarget.boxId, contextMenuLayerTarget.doorLayerId, canonicalId);
                    } else if (contextMenuLayerTarget?.type === "drawer" && contextMenuLayerTarget.drawerLayerId) {
                      onDrawerMaterialChange?.(contextMenuLayerTarget.boxId, contextMenuLayerTarget.drawerLayerId, canonicalId);
                    }
                    onClose();
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--viewer-toolbar-hover-bg)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>
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
