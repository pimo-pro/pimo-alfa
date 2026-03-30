import { useEffect, useMemo, useRef, useState } from "react";
import { useProject } from "../../../context/useProject";
import { listOfficialMaterials } from "../../../core/materials/materials.api";
import { Icon } from "@/components/icons";

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
  /** IDs de seleção atual (Ctrl+Click) para ações em lote. */
  selectedBoxIds?: string[];
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

const ITEM_HEIGHT = 34;
const MENU_MARGIN = 8;
const MENU_MIN_WIDTH = 180;
const SUBMENU_MIN_WIDTH = 160;

type Placement = "right-down" | "right-up" | "left-down" | "left-up";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function placeMenu(anchorX: number, anchorY: number, width: number, height: number): { left: number; top: number; placement: Placement } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const preferRight = anchorX + width + MENU_MARGIN <= vw - MENU_MARGIN;
  const preferDown = anchorY + height + MENU_MARGIN <= vh - MENU_MARGIN;
  const left = preferRight
    ? clamp(anchorX + MENU_MARGIN, MENU_MARGIN, vw - width - MENU_MARGIN)
    : clamp(anchorX - width - MENU_MARGIN, MENU_MARGIN, vw - width - MENU_MARGIN);
  const top = preferDown
    ? clamp(anchorY + MENU_MARGIN, MENU_MARGIN, vh - height - MENU_MARGIN)
    : clamp(anchorY - height - MENU_MARGIN, MENU_MARGIN, vh - height - MENU_MARGIN);
  const placement: Placement = preferRight
    ? (preferDown ? "right-down" : "right-up")
    : (preferDown ? "left-down" : "left-up");
  return { left, top, placement };
}

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
  selectedBoxIds = [],
}: ContextMenuProps) {
  const { project, actions } = useProject();
  const menuRef = useRef<HTMLDivElement>(null);
  const materialAnchorRef = useRef<HTMLDivElement>(null);
  const mouseAnchorRef = useRef<HTMLDivElement>(null);
  const submenuCloseTimerRef = useRef<number | null>(null);
  const [materialSubmenuOpen, setMaterialSubmenuOpen] = useState<"door" | "drawer" | null>(null);
  const [mouseSubmenuOpen, setMouseSubmenuOpen] = useState(false);
  const [materialSubmenuPos, setMaterialSubmenuPos] = useState<{ left: number; top: number } | null>(null);
  const [mouseSubmenuPos, setMouseSubmenuPos] = useState<{ left: number; top: number } | null>(null);

  const selectedBoxId = project.selectedWorkspaceBoxId ?? "";
  const selectedBox = selectedBoxId
    ? project.workspaceBoxes.find((b) => b.id === selectedBoxId)
    : undefined;
  const locked = selectedBox?.locked === true;
  const mousePreset = project.viewerSettings.mousePreset ?? "cad";
  const activeSelectedIds = useMemo(() => {
    const fromContext = Array.isArray(selectedBoxIds) ? selectedBoxIds.filter(Boolean) : [];
    if (fromContext.length > 0) return Array.from(new Set(fromContext));
    if (!selectedBoxId) return [];
    return [selectedBoxId];
  }, [selectedBoxId, selectedBoxIds]);

  const isDoorTarget = contextMenuLayerTarget?.type === "door" && contextMenuLayerTarget.doorLayerId != null;
  const isDrawerTarget = contextMenuLayerTarget?.type === "drawer" && contextMenuLayerTarget.drawerLayerId != null;
  const showDoorMaterial = isDoorTarget;
  const showDrawerMaterial = isDrawerTarget;
  const submenuTarget = showDoorMaterial ? "door" : showDrawerMaterial ? "drawer" : null;

  const clearSubmenuCloseTimer = () => {
    if (submenuCloseTimerRef.current == null) return;
    window.clearTimeout(submenuCloseTimerRef.current);
    submenuCloseTimerRef.current = null;
  };

  const openMaterialSubmenu = () => {
    clearSubmenuCloseTimer();
    if (!submenuTarget || !materialAnchorRef.current) return;
    const rect = materialAnchorRef.current.getBoundingClientRect();
    const estimatedHeight = OFFICIAL_MATERIALS.length * ITEM_HEIGHT + 16;
    const nextPos = placeMenu(rect.right, rect.top, SUBMENU_MIN_WIDTH, estimatedHeight);
    setMaterialSubmenuPos({ left: nextPos.left, top: nextPos.top });
    setMaterialSubmenuOpen(submenuTarget);
  };

  const scheduleCloseMaterialSubmenu = () => {
    clearSubmenuCloseTimer();
    submenuCloseTimerRef.current = window.setTimeout(() => {
      setMaterialSubmenuOpen(null);
      submenuCloseTimerRef.current = null;
    }, 140);
  };

  useEffect(() => {
    if (!position) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [position, onClose]);

  useEffect(() => {
    return () => {
      clearSubmenuCloseTimer();
    };
  }, []);

  useEffect(() => {
    if (!position) return;
    const handlePointerDown = (e: MouseEvent) => {
      const el = menuRef.current;
      if (el && !el.contains(e.target as Node)) {
        onClose();
        setMaterialSubmenuOpen(null);
        setMouseSubmenuOpen(false);
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
  const baseItems = selectedBoxId ? 6 : 1;
  const maybeMaterial = (showDoorMaterial || showDrawerMaterial) ? 1 : 0;
  const estimatedMainHeight = (baseItems + maybeMaterial + 1) * ITEM_HEIGHT + 16;
  const mainPos = placeMenu(position.x, position.y, MENU_MIN_WIDTH, estimatedMainHeight);
  const canAlignBottom = activeSelectedIds.length > 0;

  const renderMousePresetItem = (preset: "cad" | "classic" | "orbital", label: string) => (
    <button
      key={preset}
      type="button"
      role="menuitem"
      style={itemStyle}
      onClick={() => {
        actions.setViewerSettings({ mousePreset: preset });
        onClose();
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--viewer-toolbar-hover-bg)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      <span style={{ width: 16, textAlign: "center" }} aria-hidden>
        {mousePreset === preset ? <Icon name="check" size={12} aria-hidden /> : null}
      </span>
      <span>{label}</span>
    </button>
  );

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Menu de contexto"
      style={{
        ...menuStyle,
        left: mainPos.left,
        top: mainPos.top,
        minWidth: MENU_MIN_WIDTH,
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
          <span aria-hidden>
            <Icon name={locked ? "unlock" : "lock"} size={14} aria-hidden />
          </span>
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
          <span aria-hidden>
            <Icon name="rename" size={14} aria-hidden />
          </span>
          <span>Renomear peça</span>
        </button>
      )}
      {selectedBoxId && (
        <button
          type="button"
          role="menuitem"
          style={itemStyle}
          onClick={() => {
            actions.duplicateWorkspaceBoxAtOffset(0);
            onClose();
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--viewer-toolbar-hover-bg)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <span aria-hidden>
            <Icon name="duplicate" size={14} aria-hidden />
          </span>
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
          <span aria-hidden>
            <Icon name="delete" size={14} aria-hidden />
          </span>
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
          <span aria-hidden>
            <Icon name="alignFront" size={14} aria-hidden />
          </span>
          <span>Alinhar pela frente do box ao lado</span>
        </button>
      )}
      {selectedBoxId && (
        <button
          type="button"
          role="menuitem"
          style={itemStyle}
          onClick={() => {
            actions.alignBottomSelectedBoxes(activeSelectedIds);
            onClose();
          }}
          disabled={!canAlignBottom}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--viewer-toolbar-hover-bg)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <span aria-hidden>
            <Icon name="alignBottom" size={14} aria-hidden />
          </span>
          <span>Alinhar Baixo</span>
        </button>
      )}
      {(showDoorMaterial || showDrawerMaterial) && (
        <div
          ref={materialAnchorRef}
          style={{ position: "relative" }}
          onPointerEnter={openMaterialSubmenu}
          onPointerLeave={scheduleCloseMaterialSubmenu}
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
            <span aria-hidden>
              <Icon name="material" size={14} aria-hidden />
            </span>
            <span>{showDoorMaterial ? "Alterar material da porta" : "Alterar material da gaveta"}</span>
            <span style={{ marginLeft: "auto" }} aria-hidden>
              <Icon name="chevronRight" size={12} aria-hidden />
            </span>
          </button>
          {materialSubmenuOpen && materialSubmenuPos && (
            <div
              role="menu"
              aria-label="Materiais"
              style={{
                ...menuStyle,
                position: "fixed",
                left: materialSubmenuPos.left,
                top: materialSubmenuPos.top,
                minWidth: SUBMENU_MIN_WIDTH,
              }}
              onPointerEnter={openMaterialSubmenu}
              onPointerLeave={scheduleCloseMaterialSubmenu}
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
      <div
        ref={mouseAnchorRef}
        style={{ position: "relative" }}
        onPointerEnter={() => {
          const rect = mouseAnchorRef.current?.getBoundingClientRect();
          if (rect) {
            const nextPos = placeMenu(rect.right, rect.top, SUBMENU_MIN_WIDTH, 3 * ITEM_HEIGHT + 16);
            setMouseSubmenuPos({ left: nextPos.left, top: nextPos.top });
          }
          setMouseSubmenuOpen(true);
        }}
        onPointerLeave={() => setMouseSubmenuOpen(false)}
      >
        <button
          type="button"
          role="menuitem"
          style={itemStyle}
          onClick={() => {
            const rect = mouseAnchorRef.current?.getBoundingClientRect();
            if (rect) {
              const nextPos = placeMenu(rect.right, rect.top, SUBMENU_MIN_WIDTH, 3 * ITEM_HEIGHT + 16);
              setMouseSubmenuPos({ left: nextPos.left, top: nextPos.top });
            }
            setMouseSubmenuOpen((prev) => !prev);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--viewer-toolbar-hover-bg)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <span aria-hidden>
            <Icon name="mouse" size={14} aria-hidden />
          </span>
          <span>Modo do Mouse</span>
          <span style={{ marginLeft: "auto" }} aria-hidden>
            <Icon name="chevronRight" size={12} aria-hidden />
          </span>
        </button>
        {mouseSubmenuOpen && mouseSubmenuPos && (
          <div
            role="menu"
            aria-label="Modo do mouse"
            style={{
              ...menuStyle,
              position: "fixed",
              left: mouseSubmenuPos.left,
              top: mouseSubmenuPos.top,
              minWidth: SUBMENU_MIN_WIDTH,
            }}
            onPointerEnter={() => setMouseSubmenuOpen(true)}
            onPointerLeave={() => setMouseSubmenuOpen(false)}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {renderMousePresetItem("cad", "Mouse CAD")}
            {renderMousePresetItem("classic", "Mouse Classic")}
            {renderMousePresetItem("orbital", "Mouse Orbital (sem botão direito)")}
          </div>
        )}
      </div>
    </div>
  );
}
