import Header from "./components/layout/header/Header";
import LeftToolbar from "./components/layout/left-toolbar/LeftToolbar";
import LeftPanel from "./components/layout/left-panel/LeftPanel";
import ToolbarModals from "./components/layout/ToolbarModals";
import Workspace from "./components/layout/workspace/Workspace";
import Footer from "./components/layout/footer/Footer";
import BottomInfoToolbar from "./components/layout/bottom-info-toolbar/BottomInfoToolbar";
import BottomInfoPanelsOverlay from "./components/layout/bottom-info-toolbar/BottomInfoPanelsOverlay";
import { BottomInfoProvider } from "./context/BottomInfoContext";
import WhatsAppButton from "./components/layout/WhatsAppButton";
import { PimoViewerProvider } from "./context/PimoViewerContext";
import { ProjectProvider } from "./context/ProjectProvider";
import { MaterialProvider } from "./context/materialContext";
import { ToolbarModalProvider } from "./context/ToolbarModalContext";
import { ToastProvider } from "./context/ToastContext";
import { SettingsProvider } from "./context/SettingsContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_VIEWER_OPTIONS, VIEWER_BACKGROUND } from "./constants/viewerOptions";
import { useUiStore } from "./stores/uiStore";
import PainelReferencia from "./pages/PainelReferencia";

const SobreNos = lazy(() => import("./pages/SobreNos"));
const Documentacao = lazy(() => import("./pages/Documentacao"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const ProjectProgress = lazy(() => import("./pages/ProjectProgress"));
const DevPimoTest = import.meta.env.DEV
  ? lazy(() => import("./__dev__/DevPimoTest"))
  : null;

export default function App() {
  const [leftOpen, setLeftOpen] = useState(true);
  const leftPanelTab = useUiStore((state) => state.selectedTool);
  const setLeftPanelTab = useUiStore((state) => state.setSelectedTool);
  const clearSelection = useUiStore((state) => state.clearSelection);
  const [leftWidth, setLeftWidth] = useState(260);
  const resizeState = useRef({
    active: false,
    startX: 0,
    startWidth: 260,
  });

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
  const [showPainelReferencia, setShowPainelReferencia] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showSystemDocs, setShowSystemDocs] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showProjectProgress, setShowProjectProgress] = useState(false);
  const [showDevTest, setShowDevTest] = useState(false);
  const viewerOptions = useMemo(() => DEFAULT_VIEWER_OPTIONS, []);

  useEffect(() => {
    const syncRoute = () => {
      const isAbout = window.location.pathname === "/sobre-nos";
      const isSystemDocs = window.location.pathname === "/documentacao";
      const isAdmin = window.location.pathname === "/admin";
      const isProjectProgress = window.location.pathname === "/project-progress";
      if (!import.meta.env.DEV && window.location.pathname === "/dev-test") {
        window.history.replaceState({}, "", "/");
      }
      const isDevTest = import.meta.env.DEV && window.location.pathname === "/dev-test";
      const isPainelReferencia = window.location.pathname === "/painel-referencia";
      setShowAbout(isAbout);
      setShowSystemDocs(isSystemDocs);
      setShowAdmin(isAdmin);
      setShowProjectProgress(isProjectProgress);
      setShowDevTest(isDevTest);
      setShowPainelReferencia(isPainelReferencia);
    };
    syncRoute();
    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  const navigateToAbout = () => {
    window.history.pushState({}, "", "/sobre-nos");
    setShowAbout(true);
    setShowSystemDocs(false);
  };

  const navigateToSystemDocs = () => {
    window.history.pushState({}, "", "/documentacao");
    setShowSystemDocs(true);
    setShowAbout(false);
    setShowAdmin(false);
  };

  const navigateToAdmin = () => {
    window.history.pushState({}, "", "/admin");
    setShowAdmin(true);
    setShowAbout(false);
    setShowSystemDocs(false);
    setShowProjectProgress(false);
  };

  const navigateToProjectProgress = () => {
    window.history.pushState({}, "", "/project-progress");
    setShowProjectProgress(true);
    setShowAbout(false);
    setShowSystemDocs(false);
    setShowAdmin(false);
  };

  const navigateToPainelReferencia = () => {
    window.history.pushState({}, "", "/painel-referencia");
    setShowPainelReferencia(true);
    setShowAbout(false);
    setShowSystemDocs(false);
    setShowAdmin(false);
    setShowProjectProgress(false);
  };

  const navigateToApp = () => {
    window.history.pushState({}, "", "/");
    setShowAbout(false);
    setShowSystemDocs(false);
    setShowAdmin(false);
    setShowProjectProgress(false);
    setShowDevTest(false);
    setShowPainelReferencia(false);
  };

  return (
    <ThemeProvider>
    <ProjectProvider>
      <SettingsProvider>
        <MaterialProvider>
          <ToastProvider>
            <PimoViewerProvider>
            <div className="app-root">
        <Header
          onTogglePainelReferencia={() => {
            if (showPainelReferencia) {
              navigateToApp();
            } else {
              navigateToPainelReferencia();
            }
          }}
          painelReferenciaOpen={showPainelReferencia}
          onToggleProjectProgress={() => {
            if (showProjectProgress) {
              navigateToApp();
            } else {
              navigateToProjectProgress();
            }
          }}
          projectProgressOpen={showProjectProgress}
        />

        {/* MAIN AREA */}
        <div className="app-main">
          {showPainelReferencia || showSystemDocs || showAdmin || showProjectProgress || showDevTest || showAbout ? (
            <Suspense fallback={<div style={{ padding: 20, color: "var(--text-muted)" }}>Carregando…</div>}>
              {showPainelReferencia ? (
                <PainelReferencia />
              ) : showSystemDocs ? (
                <Documentacao />
              ) : showAdmin ? (
                <AdminPanel />
              ) : showProjectProgress ? (
                <ProjectProgress />
              ) : showDevTest && DevPimoTest ? (
                <DevPimoTest />
              ) : (
                <SobreNos />
              )}
            </Suspense>
          ) : (
            <BottomInfoProvider>
              <ToolbarModalProvider>
                <div
                  className="app-main-content-fixed"
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      flex: 1,
                      minHeight: 0,
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div className="app-panels" style={{ flex: 1, minHeight: 0 }}>
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
                      <ToolbarModals />
                    </div>
                    <BottomInfoPanelsOverlay />
                  </div>
                  <BottomInfoToolbar />
                </div>
              </ToolbarModalProvider>
            </BottomInfoProvider>
          )}
        </div>

        <Footer
          onShowAbout={navigateToAbout}
          onShowSystemDocs={navigateToSystemDocs}
          onShowAdmin={navigateToAdmin}
        />

        <WhatsAppButton />

            </div>
            </PimoViewerProvider>
          </ToastProvider>
        </MaterialProvider>
      </SettingsProvider>
    </ProjectProvider>
    </ThemeProvider>
  );
}