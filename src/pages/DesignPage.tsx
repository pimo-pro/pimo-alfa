import { Suspense, lazy, useMemo, useRef, useState } from "react";
import LeftToolbar from "../components/layout/left-toolbar/LeftToolbar";
import LeftPanel from "../components/layout/left-panel/LeftPanel";
import RightPanel from "../components/layout/right-panel/RightPanel";
import RightToolsBar from "../components/layout/right-tools/RightToolsBar";
import BottomPanel from "../components/layout/bottom-panel/BottomPanel";
import Workspace from "../components/layout/workspace/Workspace";
import FileManager from "../components/admin/FileManager";
import DeployAdminPage from "../components/admin/DeployAdminPage";
import { DEFAULT_VIEWER_OPTIONS, VIEWER_BACKGROUND } from "../constants/viewerOptions";
import { useUiStore } from "../stores/uiStore";
import { ToolbarModalProvider } from "../context/ToolbarModalContext";

const ProjectProgress = lazy(() => import("./ProjectProgress"));
const PainelReferencia = lazy(() => import("./PainelReferencia"));

type AuxPanel = "projectProgress" | "painelReferencia" | "fileManager" | "deployExperimental" | null;

export default function DesignPage() {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen] = useState(true);
  const [leftWidth, setLeftWidth] = useState(260);
  const [showBottom] = useState(true);
  const [auxPanel, setAuxPanel] = useState<AuxPanel>(null);
  const leftPanelTab = useUiStore((state) => state.selectedTool);
  const setLeftPanelTab = useUiStore((state) => state.setSelectedTool);
  const clearSelection = useUiStore((state) => state.clearSelection);
  const resizeState = useRef({
    active: false,
    startX: 0,
    startWidth: 260,
  });

  const viewerOptions = useMemo(() => DEFAULT_VIEWER_OPTIONS, []);
  const clampLeftWidth = (value: number) => Math.min(420, Math.max(220, value));

  const handleResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!leftOpen) return;
    resizeState.current = {
      active: true,
      startX: event.clientX,
      startWidth: leftWidth,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleResizeMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeState.current.active) return;
    const delta = event.clientX - resizeState.current.startX;
    setLeftWidth(clampLeftWidth(resizeState.current.startWidth + delta));
  };

  const handleResizeEnd = () => {
    resizeState.current.active = false;
  };

  const toggleAuxPanel = (panel: AuxPanel) => {
    setAuxPanel((current) => (current === panel ? null : panel));
  };

  return (
    <main style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(2,6,23,0.85)",
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <button type="button" className="button button-ghost" onClick={() => toggleAuxPanel("projectProgress")}>
          Project Progress
        </button>
        <button type="button" className="button button-ghost" onClick={() => toggleAuxPanel("painelReferencia")}>
          Painel Referência
        </button>
        <button type="button" className="button button-ghost" onClick={() => toggleAuxPanel("fileManager")}>
          File Manager
        </button>
        <button type="button" className="button button-ghost" onClick={() => toggleAuxPanel("deployExperimental")}>
          Deploy (Experimental)
        </button>
      </div>

      {auxPanel ? (
        <div
          style={{
            padding: 14,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(15,23,42,0.7)",
            maxHeight: "38vh",
            overflowY: "auto",
          }}
        >
          <Suspense fallback={<div style={{ padding: 10, color: "var(--text-muted)", fontSize: 12 }}>Carregando…</div>}>
            {auxPanel === "projectProgress" ? (
              <ProjectProgress />
            ) : auxPanel === "painelReferencia" ? (
              <PainelReferencia />
            ) : auxPanel === "fileManager" ? (
              <FileManager />
            ) : (
              <DeployAdminPage />
            )}
          </Suspense>
        </div>
      ) : null}

      <ToolbarModalProvider>
        <div className="app-panels" style={{ minHeight: 0 }}>
          <div style={{ position: "relative", zIndex: 1 }}>
            <LeftToolbar
              selectedId={leftPanelTab}
              onSelect={(id) => {
                setLeftPanelTab(id);
                clearSelection();
                if (!leftOpen) setLeftOpen(true);
              }}
            />
          </div>

          <div
            className="panel panel-shell panel-shell--side left-panel panel-shell-left"
            style={{
              width: leftOpen ? leftWidth : 0,
              minWidth: leftOpen ? leftWidth : 0,
              maxWidth: leftOpen ? leftWidth : 0,
              overflow: "hidden",
              transition: "width 0.2s ease",
              position: "relative",
              zIndex: 1,
            }}
          >
            <LeftPanel activeTab={leftPanelTab} />
            {leftOpen && (
              <div
                className="panel-resizer"
                onPointerDown={handleResizeStart}
                onPointerMove={handleResizeMove}
                onPointerUp={handleResizeEnd}
                onPointerCancel={handleResizeEnd}
              />
            )}
          </div>

          <Workspace
            viewerBackground={VIEWER_BACKGROUND}
            viewerHeight="100%"
            viewerOptions={viewerOptions}
          />

          <div
            className="panel panel-shell panel-shell--side right-panel panel-shell-right"
            style={{
              width: rightOpen ? 260 : 0,
              minWidth: rightOpen ? 260 : 0,
              overflow: "hidden",
              transition: "width 0.2s ease",
              position: "relative",
              zIndex: 1,
            }}
          >
            <div className="right-panel-stack" data-material-panel>
              <RightPanel />
              <RightToolsBar />
            </div>
          </div>
        </div>
      </ToolbarModalProvider>

      <div
        className={
          showBottom
            ? "panel panel-shell panel-shell--bottom bottom-panel-shell"
            : "panel panel-shell panel-shell--bottom bottom-panel-shell bottom-panel-hidden"
        }
      >
        <BottomPanel />
      </div>
    </main>
  );
}
