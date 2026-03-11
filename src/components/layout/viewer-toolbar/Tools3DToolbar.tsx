/**
 * Toolbar de ferramentas 3D (segunda linha).
 * Select, Move, Rotate ligados ao viewerApiAdapter (setTool → setTransformMode).
 * activeTool controlado pelo estado global (project.activeViewerTool).
 */

import { useState, useRef, useEffect } from "react";
import { TOOLS_3D_ITEMS } from "../../../constants/toolbarConfig";
import type { Tool3DId } from "../../../constants/toolbarConfig";
 
import { useProject } from "../../../context/useProject";
import { usePimoViewerContext } from "../../../hooks/usePimoViewerContext";
import CameraViewMenu from "./CameraViewMenu";

export type Tools3DToolbarProps = {
  /** Ferramenta ativa (controlado pelo estado global). */
  activeTool?: Tool3DId;
  /** Chamado ao clicar numa ferramenta; aplica ao viewer via actions.setActiveTool. */
  onToolSelect?: (_toolId: Tool3DId, _eventKey: string) => void;
  /** Lock (colisão): impede caixas de se sobrepor quando ON. */
  lockEnabled?: boolean;
  /** Alternar Lock. */
  onToggleLock?: () => void;
};

const toolbarButtonStyle = {
  width: 28,
  height: 28,
  display: "flex" as const,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  border: "none" as const,
  borderRadius: 4,
  color: "var(--text-main)",
  fontSize: 12,
  cursor: "pointer" as const,
  marginLeft: 4,
};

export default function Tools3DToolbar({
  activeTool = "select",
  onToolSelect,
  lockEnabled = true,
  onToggleLock,
}: Tools3DToolbarProps) {
  const { project, actions } = useProject();
  const { viewerApi } = usePimoViewerContext() ?? {};
  
  const enabledTools: Tool3DId[] = ["select", "move", "rotate"];
  const selectedBoxId = project.selectedWorkspaceBoxId;
  const [showCameraMenu, setShowCameraMenu] = useState(false);
  const [showExplodedMenu, setShowExplodedMenu] = useState(false);
  const [showRotationPopup, setShowRotationPopup] = useState(false);
  
  const cameraMenuRef = useRef<HTMLDivElement>(null);
  const explodedMenuRef = useRef<HTMLDivElement>(null);
  const rotationPopupRef = useRef<HTMLDivElement>(null);
  const rotationInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showCameraMenu && !showExplodedMenu) return;
    const close = (e: MouseEvent) => {
      if (cameraMenuRef.current && !cameraMenuRef.current.contains(e.target as Node)) setShowCameraMenu(false);
      if (explodedMenuRef.current && !explodedMenuRef.current.contains(e.target as Node)) setShowExplodedMenu(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [showCameraMenu, showExplodedMenu]);

  useEffect(() => {
    if (!showRotationPopup) return;
    const close = (e: MouseEvent) => {
      if (rotationPopupRef.current && !rotationPopupRef.current.contains(e.target as Node)) setShowRotationPopup(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [showRotationPopup]);

  useEffect(() => {
    if (showRotationPopup) rotationInputRef.current?.focus();
  }, [showRotationPopup]);

  

  const handleToolSelect = (id: Tool3DId, eventKey: string) => {
    onToolSelect?.(id, eventKey);
  };

  return (
    <div
      className="tools-3d-toolbar"
      role="toolbar"
      aria-label="Ferramentas 3D"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "6px 10px",
      }}
    >
      {TOOLS_3D_ITEMS.map((item) => {
        const isActive = activeTool === item.id;
        const isEnabled = enabledTools.includes(item.id);
        return (
          <button
            key={item.id}
            type="button"
            title={item.tooltip}
            aria-label={item.tooltip}
            aria-pressed={isActive}
            disabled={!isEnabled}
            onClick={() => isEnabled && handleToolSelect(item.id, item.eventKey)}
            style={{
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              borderRadius: 4,
              background: isActive ? "var(--toolbar-pressed-bg)" : "transparent",
              color: isEnabled ? "var(--text-main)" : "var(--text-muted)",
              fontSize: 12,
              cursor: isEnabled ? "pointer" : "default",
              opacity: isEnabled ? 1 : 0.5,
            }}
            onMouseEnter={(e) => {
              if (isEnabled) e.currentTarget.style.background = isActive ? "var(--toolbar-pressed-bg)" : "var(--viewer-toolbar-hover-bg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isActive ? "var(--toolbar-pressed-bg)" : "transparent";
            }}
          >
            {item.icon}
          </button>
        );
      })}
      {onToggleLock != null && (
        <button
          type="button"
          title={lockEnabled ? "Desbloquear (permitir sobreposição e atravessar paredes/chão)" : "Bloquear (impedir colisão entre caixas, paredes e chão)"}
          aria-label={lockEnabled ? "Desbloquear" : "Bloquear"}
          aria-pressed={lockEnabled}
          onClick={onToggleLock}
          style={{
            ...toolbarButtonStyle,
            background: lockEnabled ? "var(--toolbar-pressed-bg)" : "transparent",
          }}
        >
          🔒
        </button>
      )}
      
      <div ref={cameraMenuRef} style={{ position: "relative", display: "inline-flex", marginLeft: 2 }}>
        <button
          type="button"
          title="Selecionar vista da câmera"
          aria-label="Selecionar vista da câmera"
          aria-expanded={showCameraMenu}
          onClick={() => {
            setShowExplodedMenu(false);
            setShowCameraMenu(true);
          }}
          style={{
            ...toolbarButtonStyle,
            background: showCameraMenu ? "var(--toolbar-pressed-bg)" : "transparent",
          }}
          onMouseEnter={(e) => {
            if (!showCameraMenu) e.currentTarget.style.background = "var(--viewer-toolbar-hover-bg)";
          }}
          onMouseLeave={(e) => {
            if (!showCameraMenu) e.currentTarget.style.background = "transparent";
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
        {showCameraMenu && (
          <CameraViewMenu
            onSelect={(preset: "bottom" | "left" | "right" | "top" | "front" | "back" | "isometric") => {
              viewerApi?.setCameraView?.(preset);
              setShowCameraMenu(false);
            }}
            onClose={() => setShowCameraMenu(false)}
          />
        )}
      </div>
      <div ref={explodedMenuRef} style={{ position: "relative", display: "inline-flex", marginLeft: 2 }}>
        <button
          type="button"
          title="Exploded View"
          aria-label="Exploded View"
          aria-expanded={showExplodedMenu}
          onClick={() => {
            setShowCameraMenu(false);
            setShowExplodedMenu((prev) => !prev);
          }}
          style={{
            ...toolbarButtonStyle,
            background: showExplodedMenu ? "var(--toolbar-pressed-bg)" : "transparent",
          }}
          onMouseEnter={(e) => {
            if (!showExplodedMenu) e.currentTarget.style.background = "var(--viewer-toolbar-hover-bg)";
          }}
          onMouseLeave={(e) => {
            if (!showExplodedMenu) e.currentTarget.style.background = "transparent";
          }}
        >
          🧩
        </button>
        {showExplodedMenu && (
          <div
            role="dialog"
            aria-label="Exploded View"
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              marginTop: 4,
              minWidth: 240,
              padding: 10,
              background: "var(--popover-bg)",
              border: "1px solid var(--popover-border)",
              borderRadius: 8,
              boxShadow: "var(--popover-shadow)",
              zIndex: 1000,
            }}
          >
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={project.viewerSettings.explodedViewEnabled}
                onChange={(e) => actions.setViewerSettings({ explodedViewEnabled: e.target.checked })}
              />
              Exploded View
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
              Intensidade Exploded ({Math.round(project.viewerSettings.explodedViewIntensity * 100)}%)
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={project.viewerSettings.explodedViewIntensity}
                disabled={!project.viewerSettings.explodedViewEnabled}
                onChange={(e) =>
                  actions.setViewerSettings({
                    explodedViewIntensity: Math.max(0, Math.min(1, Number.parseFloat(e.target.value) || 0)),
                  })
                }
              />
            </label>
          </div>
        )}
      </div>

      <button
        type="button"
        className="viewer-action-icon"
        title={project.viewerSettings.highlightEnabled ? "Highlight ON (clique para desativar)" : "Highlight OFF (clique para ativar)"}
        aria-label={project.viewerSettings.highlightEnabled ? "Desativar highlight" : "Ativar highlight"}
        aria-pressed={project.viewerSettings.highlightEnabled}
        onClick={() => actions.toggleHighlight()}
        style={{
          ...toolbarButtonStyle,
          background: project.viewerSettings.highlightEnabled ? "rgba(77, 163, 255, 0.25)" : "transparent",
        }}
        onMouseEnter={(e) => {
          if (!project.viewerSettings.highlightEnabled) e.currentTarget.style.background = "rgba(255,255,255,0.06)";
        }}
        onMouseLeave={(e) => {
          if (!project.viewerSettings.highlightEnabled) e.currentTarget.style.background = "transparent";
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 3l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1z" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      </button>

      <button
        type="button"
        className="viewer-action-icon"
        title={project.viewerSettings.rulerEnabled ? "Régua ON (clique para desativar)" : "Régua OFF (clique para ativar)"}
        aria-label={project.viewerSettings.rulerEnabled ? "Desativar régua" : "Ativar régua"}
        aria-pressed={project.viewerSettings.rulerEnabled}
        onClick={() => actions.toggleRuler()}
        style={{
          ...toolbarButtonStyle,
          background: project.viewerSettings.rulerEnabled ? "rgba(77, 163, 255, 0.25)" : "transparent",
        }}
        onMouseEnter={(e) => {
          if (!project.viewerSettings.rulerEnabled) e.currentTarget.style.background = "rgba(255,255,255,0.06)";
        }}
        onMouseLeave={(e) => {
          if (!project.viewerSettings.rulerEnabled) e.currentTarget.style.background = "transparent";
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 12h16" />
          <path d="M5 14v-4M8 14v-4M11 14v-2M14 14v-4M17 14v-4M20 14v-4" />
        </svg>
      </button>
      
      {selectedBoxId && (
        <>
          <button
            type="button"
            title="Rotar 90° à direita"
            aria-label="Rotar 90° à direita"
            onClick={() => {
              const box = project.workspaceBoxes.find((b) => b.id === selectedBoxId);
              const currentRad = box?.rotacaoY ?? 0;
              actions.updateWorkspaceBoxTransform(selectedBoxId, {
                rotacaoY_rad: currentRad + Math.PI / 2,
                manualPosition: true,
              });
            }}
            style={{ ...toolbarButtonStyle, background: "transparent" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--viewer-toolbar-hover-bg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            ⟳
          </button>
          <div ref={rotationPopupRef} style={{ position: "relative", display: "inline-flex", marginLeft: 2 }}>
            <button
              type="button"
              title="Definir rotação (graus)"
              aria-label="Definir rotação em graus"
              aria-expanded={showRotationPopup}
              onClick={() => setShowRotationPopup((v) => !v)}
              style={{
                ...toolbarButtonStyle,
                background: showRotationPopup ? "var(--toolbar-pressed-bg)" : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!showRotationPopup) e.currentTarget.style.background = "var(--viewer-toolbar-hover-bg)";
              }}
              onMouseLeave={(e) => {
                if (!showRotationPopup) e.currentTarget.style.background = "transparent";
              }}
            >
              ∠
            </button>
            {showRotationPopup && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  marginTop: 4,
                  padding: 8,
                  background: "rgba(15, 23, 42, 0.98)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 6,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  minWidth: 120,
                  zIndex: 1000,
                }}
              >
                <label style={{ fontSize: 11, color: "var(--text-muted)" }}>Rotação (°)</label>
                <input
                  ref={rotationInputRef}
                  type="number"
                  min={-360}
                  max={360}
                  step={1}
                  defaultValue={
                    Math.round(
                      ((project.workspaceBoxes.find((b) => b.id === selectedBoxId)?.rotacaoY ?? 0) * 180) / Math.PI
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const v = Number((e.target as HTMLInputElement).value);
                      if (Number.isFinite(v)) {
                        actions.updateWorkspaceBoxTransform(selectedBoxId, {
                          rotacaoY_rad: (v * Math.PI) / 180,
                          manualPosition: true,
                        });
                        setShowRotationPopup(false);
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v)) {
                      actions.updateWorkspaceBoxTransform(selectedBoxId, {
                        rotacaoY_rad: (v * Math.PI) / 180,
                        manualPosition: true,
                      });
                    }
                    setShowRotationPopup(false);
                  }}
                  style={{
                    width: "100%",
                    padding: "4px 6px",
                    fontSize: 12,
                    color: "var(--text-main)",
                    background: "var(--input-bg)",
                    border: "1px solid var(--input-border)",
                    borderRadius: 4,
                    boxSizing: "border-box",
                  }}
                />
              </div>
            )}
          </div>
        </>
      )}

      <button
        type="button"
        className="button button-primary viewer-action-button"
        style={{ marginLeft: "auto" }}
        onClick={() => window.dispatchEvent(new Event("pimo:open-gerar-arquivo-modal"))}
      >
        Gerar Arquivo
      </button>
    </div>
  );
}
