/**
 * Barra de ferramentas fixa acima do Footer.
 * Botões de texto para abrir/fechar painéis de informação (Resumo, Cutlist, Portas, etc.).
 * Um único painel aberto por vez; clique no mesmo botão fecha.
 * Estilo alinhado ao Tools3DToolbar.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBottomInfo, type BottomInfoPanelId } from "../../../context/BottomInfoContext";
import { useProject } from "../../../context/useProject";

const panelLabels: Record<"left" | "right" | "top" | "bottom" | "back", string> = {
  left: "Lateral Esq",
  right: "Lateral Dir",
  top: "Topo",
  bottom: "Fundo",
  back: "Costa",
};

const drawerPartLabels: Record<"front" | "left-side" | "right-side" | "bottom" | "back" | "body", string> = {
  front: "Frente de gaveta",
  "left-side": "Lateral esquerda da gaveta",
  "right-side": "Lateral direita da gaveta",
  bottom: "Fundo da gaveta",
  back: "Traseira da gaveta",
  body: "Corpo da gaveta",
};

const panelKeyByType = {
  left: "lateral_esquerda",
  right: "lateral_direita",
  top: "cima",
  bottom: "fundo",
  back: "costa",
} as const;

const PANELS: { id: Exclude<BottomInfoPanelId, null>; label: string }[] = [
  { id: "resumo", label: "Resumo Financeiro" },
  { id: "cutlist", label: "Cutlist Industrial" },
  { id: "portas", label: "Portas" },
  { id: "ferragens", label: "Ferragens Industriais" },
  { id: "ferragensDetalhado", label: "Ferragens Detalhado" },
  { id: "totais", label: "Totais do Projeto" },
];

const toolbarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
  background: "rgba(15, 23, 42, 0.85)",
  borderTop: "1px solid rgba(255,255,255,0.08)",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  flexShrink: 0,
  minHeight: 40,
  boxSizing: "border-box",
};

const leftButtonsWrapStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  minWidth: 0,
};

const buttonBaseStyle: React.CSSProperties = {
  padding: "6px 12px",
  border: "none",
  borderRadius: 4,
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
  color: "var(--text-main)",
  background: "transparent",
  whiteSpace: "nowrap",
};

const componentsGroupStyle: React.CSSProperties = {
  marginLeft: "auto",
  paddingLeft: 12,
  borderLeft: "1px solid rgba(255,255,255,0.12)",
  position: "relative",
  display: "flex",
  alignItems: "center",
};

const componentsButtonStyle: React.CSSProperties = {
  ...buttonBaseStyle,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  color: "var(--text-muted)",
};

const componentsPopoverStyle: React.CSSProperties = {
  position: "absolute",
  right: 0,
  bottom: "calc(100% + 8px)",
  minWidth: 340,
  padding: 6,
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(8, 12, 26, 0.98)",
  boxShadow: "0 10px 22px rgba(0,0,0,0.35)",
  zIndex: 40,
};

const componentsSidePanelStyle: React.CSSProperties = {
  position: "fixed",
  right: 10,
  width: 300,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(7, 11, 24, 0.98)",
  boxShadow: "-10px 0 30px rgba(0,0,0,0.35)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  zIndex: 45,
};

const componentsSidePanelResizeHandleStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: 10,
  cursor: "ns-resize",
  zIndex: 2,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const componentsSidePanelResizeGripStyle: React.CSSProperties = {
  width: 44,
  height: 3,
  borderRadius: 999,
  background: "rgba(255,255,255,0.35)",
};

const componentsSidePanelHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 12px",
  borderBottom: "1px solid rgba(255,255,255,0.12)",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--text-main)",
};

const componentsSidePanelBodyStyle: React.CSSProperties = {
  padding: "12px 12px 14px",
  color: "var(--text-muted)",
  fontSize: 12,
  lineHeight: 1.45,
  overflow: "auto",
};

const piecePanelContainerStyle: React.CSSProperties = {
  minWidth: 340,
};

const piecePanelListStyle: React.CSSProperties = {
  maxHeight: 180,
  overflowY: "auto",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 8,
  padding: 8,
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const piecePanelHeaderButtonStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "var(--text-main)",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  padding: 0,
};

export default function BottomInfoToolbar() {
  const { openPanel, togglePanel } = useBottomInfo();
  const { actions, project } = useProject();
  const [componentsPopoverOpen, setComponentsPopoverOpen] = useState(false);
  const [componentsPanelOpen, setComponentsPanelOpen] = useState(false);
  const [pieceSearch, setPieceSearch] = useState("");
  const [layoutInsets, setLayoutInsets] = useState({ top: 56, bottom: 42 });
  const [componentsPanelTop, setComponentsPanelTop] = useState(56);
  const componentsGroupRef = useRef<HTMLDivElement | null>(null);
  const resizeStartYRef = useRef(0);
  const resizeStartTopRef = useRef(56);
  const isResizingPanelRef = useRef(false);

  const workspaceBoxes = useMemo(() => project.workspaceBoxes ?? [], [project.workspaceBoxes]);
  const panelVisibilityEntries = useMemo(() => {
    return workspaceBoxes.flatMap((box) => {
      const entries: Array<{
        id: string;
        panel?: "left" | "right" | "top" | "bottom" | "back";
        boxId: string;
        boxName: string;
        label: string;
        searchText: string;
      }> = [];

      (Object.keys(panelLabels) as Array<"left" | "right" | "top" | "bottom" | "back">).forEach((panel) => {
        const panelKey = panelKeyByType[panel];
        const panelIdFromBox = box.panelIds?.[panelKey];
        const pieceId =
          typeof panelIdFromBox === "string" && panelIdFromBox.trim().length > 0
            ? panelIdFromBox
            : `${box.id}:${panel}`;
        entries.push({
          id: pieceId,
          panel,
          boxId: box.id,
          boxName: box.nome,
          label: panelLabels[panel],
          searchText: `${box.nome} ${panelLabels[panel]} ${box.id}`.toLowerCase(),
        });
      });

      const shelfIds = box.panelIds?.prateleiras ?? [];
      const shelfCount = Math.max(shelfIds.length, Math.max(0, Math.floor(box.prateleiras ?? 0)));
      for (let i = 0; i < shelfCount; i++) {
        const configuredId = shelfIds[i];
        const pieceId = configuredId && configuredId.trim().length > 0 ? configuredId : `shelf:${box.id}:${i}`;
        const label = `Prateleira ${i + 1}`;
        entries.push({
          id: pieceId,
          boxId: box.id,
          boxName: box.nome,
          label,
          searchText: `${box.nome} ${label} ${box.id}`.toLowerCase(),
        });
      }

      const doorIds = new Set<string>(box.panelIds?.portas ?? []);
      for (const door of box.doorsLayer ?? []) {
        doorIds.add(`door:${door.id}`);
      }
      Array.from(doorIds)
        .filter((id) => id.trim().length > 0)
        .forEach((id, idx) => {
          const label = `Porta ${idx + 1}`;
          entries.push({
            id,
            boxId: box.id,
            boxName: box.nome,
            label,
            searchText: `${box.nome} ${label} ${box.id}`.toLowerCase(),
          });
        });

      for (const drawer of box.drawersLayer ?? []) {
        (Object.keys(drawerPartLabels) as Array<keyof typeof drawerPartLabels>).forEach((part) => {
          const pieceId = `drawer:${drawer.id}:${part}`;
          const label = drawerPartLabels[part];
          entries.push({
            id: pieceId,
            boxId: box.id,
            boxName: box.nome,
            label,
            searchText: `${box.nome} ${label} ${box.id}`.toLowerCase(),
          });
        });
      }

      return entries;
    });
  }, [workspaceBoxes]);

  const filteredPanelVisibilityEntries = useMemo(() => {
    const query = pieceSearch.trim().toLowerCase();
    if (!query) return panelVisibilityEntries;
    return panelVisibilityEntries.filter((entry) => entry.searchText.includes(query));
  }, [panelVisibilityEntries, pieceSearch]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!componentsGroupRef.current) return;
      if (componentsGroupRef.current.contains(event.target as Node)) return;
      setComponentsPopoverOpen(false);
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setComponentsPopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  useEffect(() => {
    const updateLayoutInsets = () => {
      const topToolbar = document.querySelector(".viewer-toolbar") as HTMLElement | null;
      const bottomToolbar = document.querySelector(".bottom-info-toolbar") as HTMLElement | null;

      const top = topToolbar ? Math.round(topToolbar.getBoundingClientRect().bottom) : 56;
      const bottom = bottomToolbar
        ? Math.max(0, Math.round(window.innerHeight - bottomToolbar.getBoundingClientRect().top))
        : 42;

      setLayoutInsets({ top, bottom });

      setComponentsPanelTop((prev) => {
        const maxTop = Math.max(0, window.innerHeight - bottom - 56);
        return Math.min(Math.max(prev, 0), maxTop);
      });
    };

    updateLayoutInsets();
    const rafUpdate = () => requestAnimationFrame(updateLayoutInsets);
    window.addEventListener("resize", rafUpdate);
    window.addEventListener("scroll", rafUpdate, true);
    return () => {
      window.removeEventListener("resize", rafUpdate);
      window.removeEventListener("scroll", rafUpdate, true);
    };
  }, []);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (!isResizingPanelRef.current) return;
      const delta = event.clientY - resizeStartYRef.current;
      const rawTop = resizeStartTopRef.current + delta;
      const minTop = 0;
      const maxTop = Math.max(minTop, window.innerHeight - layoutInsets.bottom - 56);
      const nextTop = Math.max(minTop, Math.min(maxTop, rawTop));
      setComponentsPanelTop(nextTop);
    };

    const onPointerUp = () => {
      if (!isResizingPanelRef.current) return;
      isResizingPanelRef.current = false;
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [layoutInsets.bottom]);

  const openPecasPaineisPanel = () => {
    setComponentsPopoverOpen(false);
    setComponentsPanelTop(layoutInsets.top);
    setComponentsPanelOpen(true);
  };

  const handlePanelResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!componentsPanelOpen) return;
    resizeStartYRef.current = event.clientY;
    resizeStartTopRef.current = componentsPanelTop;
    isResizingPanelRef.current = true;
    document.body.style.userSelect = "none";
  };

  const sidePanelListMaxHeight = Math.max(
    220,
    window.innerHeight - componentsPanelTop - layoutInsets.bottom - 180
  );

  const toggleHiddenPanel = (panel: "left" | "right" | "top" | "bottom" | "back") => {
    const current = project.viewerSettings.hiddenPanels;
    const next = current.includes(panel)
      ? current.filter((item) => item !== panel)
      : [...current, panel];
    actions.setViewerSettings({ hiddenPanels: next });
  };

  const toggleHiddenPiece = (pieceId: string) => {
    const current = project.viewerSettings.hiddenPanels;
    const next = current.includes(pieceId)
      ? current.filter((item) => item !== pieceId)
      : [...current, pieceId];
    actions.setViewerSettings({ hiddenPanels: next });
  };

  const isPieceHidden = (pieceId: string, panel?: "left" | "right" | "top" | "bottom" | "back") => {
    const hidden = project.viewerSettings.hiddenPanels;
    return hidden.includes(pieceId) || (panel != null && hidden.includes(panel));
  };

  const renderPecasPaineisList = (maxHeight: number) => (
    <div style={piecePanelContainerStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <button
          type="button"
          onClick={openPecasPaineisPanel}
          style={piecePanelHeaderButtonStyle}
          title="Abrir painel lateral"
          aria-label="Abrir painel lateral de peças e painéis"
        >
          peças / painéis
        </button>
        <button
          type="button"
          className="button button-ghost"
          style={{ fontSize: 11, padding: "4px 8px" }}
          onClick={() => actions.setViewerSettings({ hiddenPanels: [] })}
        >
          Mostrar tudo
        </button>
      </div>
      <input
        className="input input-sm"
        placeholder="Buscar peça (caixa ou painel)"
        value={pieceSearch}
        onChange={(event) => setPieceSearch(event.target.value)}
        style={{ marginBottom: 8 }}
      />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {(Object.keys(panelLabels) as Array<"left" | "right" | "top" | "bottom" | "back">).map((panel) => {
          const isHidden = project.viewerSettings.hiddenPanels.includes(panel);
          return (
            <button
              key={`bottom-panel-toggle-${panel}`}
              type="button"
              className="button button-ghost"
              style={{ fontSize: 11, padding: "4px 8px", opacity: isHidden ? 0.65 : 1 }}
              onClick={() => toggleHiddenPanel(panel)}
            >
              {isHidden ? "Mostrar" : "Esconder"} todas: {panelLabels[panel]}
            </button>
          );
        })}
      </div>
      <div style={{ ...piecePanelListStyle, maxHeight }}>
        {filteredPanelVisibilityEntries.length === 0 ? (
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Nenhuma peça encontrada.</div>
        ) : (
          filteredPanelVisibilityEntries.map((entry) => {
            const hiddenGlobally = entry.panel != null && project.viewerSettings.hiddenPanels.includes(entry.panel);
            const hidden = isPieceHidden(entry.id, entry.panel);
            return (
              <label
                key={`bottom-panel-piece-${entry.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  fontSize: 11,
                  opacity: hidden ? 0.65 : 1,
                }}
              >
                <span style={{ color: "var(--text-muted)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {entry.boxName} · {entry.label}
                </span>
                <input
                  type="checkbox"
                  checked={!hidden}
                  disabled={hiddenGlobally}
                  onChange={() => toggleHiddenPiece(entry.id)}
                  title={
                    hiddenGlobally
                      ? "Tipo de painel está escondido globalmente"
                      : hidden
                        ? "Mostrar peça"
                        : "Esconder peça"
                  }
                />
              </label>
            );
          })
        )}
      </div>
    </div>
  );

  const componentsSidePanel = (
    <aside
      aria-label="Painel lateral de peças e painéis"
      style={{
        ...componentsSidePanelStyle,
        top: componentsPanelTop,
        bottom: layoutInsets.bottom,
      }}
    >
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Redimensionar altura do painel"
        style={componentsSidePanelResizeHandleStyle}
        onPointerDown={handlePanelResizeStart}
      >
        <div style={componentsSidePanelResizeGripStyle} />
      </div>
      <div style={componentsSidePanelHeaderStyle}>
        <span>peças / painéis</span>
        <button
          type="button"
          aria-label="Fechar painel de componentes"
          onClick={() => setComponentsPanelOpen(false)}
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.05)",
            color: "var(--text-muted)",
            cursor: "pointer",
          }}
        >
          ×
        </button>
      </div>
      <div style={componentsSidePanelBodyStyle}>
        {renderPecasPaineisList(sidePanelListMaxHeight)}
      </div>
    </aside>
  );

  return (
    <>
      <div
        className="bottom-info-toolbar"
        role="toolbar"
        aria-label="Painéis de informação do projeto"
        style={toolbarStyle}
      >
        <div style={leftButtonsWrapStyle}>
          {PANELS.map(({ id, label }) => {
            const isActive = openPanel === id;
            return (
              <button
                key={id}
                type="button"
                title={isActive ? `Fechar ${label}` : `Abrir ${label}`}
                aria-label={isActive ? `Fechar ${label}` : `Abrir ${label}`}
                aria-pressed={isActive}
                onClick={() => togglePanel(id)}
                style={{
                  ...buttonBaseStyle,
                  background: isActive ? "rgba(59, 130, 246, 0.25)" : "transparent",
                  color: isActive ? "var(--text-main)" : "var(--text-muted)",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  else e.currentTarget.style.background = "rgba(59, 130, 246, 0.35)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isActive ? "rgba(59, 130, 246, 0.25)" : "transparent";
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div ref={componentsGroupRef} style={componentsGroupStyle}>
          <button
            type="button"
            title="Abrir menu de componentes"
            aria-label="Abrir menu de componentes"
            aria-haspopup="menu"
            aria-expanded={componentsPopoverOpen}
            onClick={() => setComponentsPopoverOpen((prev) => !prev)}
            style={{
              ...componentsButtonStyle,
              background: componentsPopoverOpen ? "rgba(59, 130, 246, 0.2)" : "transparent",
              color: componentsPopoverOpen ? "var(--text-main)" : "var(--text-muted)",
            }}
            onMouseEnter={(e) => {
              if (!componentsPopoverOpen) e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              else e.currentTarget.style.background = "rgba(59, 130, 246, 0.28)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = componentsPopoverOpen ? "rgba(59, 130, 246, 0.2)" : "transparent";
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
              <rect x="1" y="1" width="5" height="5" rx="1" fill="currentColor" opacity="0.9" />
              <rect x="8" y="1" width="5" height="5" rx="1" fill="currentColor" opacity="0.65" />
              <rect x="1" y="8" width="5" height="5" rx="1" fill="currentColor" opacity="0.65" />
              <rect x="8" y="8" width="5" height="5" rx="1" fill="currentColor" opacity="0.9" />
            </svg>
            componentes
          </button>

          {componentsPopoverOpen && (
            <div role="menu" aria-label="Menu componentes" style={componentsPopoverStyle}>
              {renderPecasPaineisList(180)}
            </div>
          )}
        </div>
      </div>

      {componentsPanelOpen ? createPortal(componentsSidePanel, document.body) : null}
    </>
  );
}
