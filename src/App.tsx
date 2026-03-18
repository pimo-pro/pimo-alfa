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
import Ajuda from "./pages/Ajuda";
import UserProjectsPage from "./pages/UserProjectsPage";
import { usePiLoader, PT } from "@/components/PiLoader.jsx";

const Documentacao = lazy(() => import("./pages/Documentacao"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const ProjectProgress = lazy(() => import("./pages/ProjectProgress"));
const DevPimoTest = import.meta.env.DEV
  ? lazy(() => import("./__dev__/DevPimoTest"))
  : null;

export default function App() {
  const { LoaderUI, show, hide } = usePiLoader();
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
  const [showSystemDocs, setShowSystemDocs] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showProjectProgress, setShowProjectProgress] = useState(false);
  const [showDevTest, setShowDevTest] = useState(false);
  const [showAjuda, setShowAjuda] = useState(false);
  const [showUserProjects, setShowUserProjects] = useState(false);
  const viewerOptions = useMemo(() => DEFAULT_VIEWER_OPTIONS, []);

  useEffect(() => {
    let activeOperations = 0;
    const beginOperation = (text: string) => {
      activeOperations += 1;
      show(text);
    };
    const finishOperation = () => {
      activeOperations = Math.max(0, activeOperations - 1);
      if (activeOperations === 0) {
        hide();
      }
    };

    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);
    const originalFetch = window.fetch.bind(window);

    window.history.pushState = ((data, unused, url) => {
      beginOperation(PT.navegar);
      originalPushState(data, unused, url);
      requestAnimationFrame(() => requestAnimationFrame(finishOperation));
    }) as History["pushState"];

    window.history.replaceState = ((data, unused, url) => {
      beginOperation(PT.navegar);
      originalReplaceState(data, unused, url);
      requestAnimationFrame(() => requestAnimationFrame(finishOperation));
    }) as History["replaceState"];

    const onSubmit = () => {
      beginOperation(PT.guardar);
      setTimeout(finishOperation, 600);
    };

    window.fetch = (async (...args: Parameters<typeof fetch>) => {
      beginOperation(PT.processar);
      try {
        return await originalFetch(...args);
      } finally {
        finishOperation();
      }
    }) as typeof fetch;

    document.addEventListener("submit", onSubmit, true);

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.fetch = originalFetch;
      document.removeEventListener("submit", onSubmit, true);
      activeOperations = 0;
      hide();
    };
  }, [hide, show]);

  useEffect(() => {
    const syncRoute = () => {
      const isSystemDocs = window.location.pathname === "/documentacao";
      const isAdmin = window.location.pathname === "/admin";
      const isProjectProgress = window.location.pathname === "/project-progress";
      if (!import.meta.env.DEV && window.location.pathname === "/dev-test") {
        window.history.replaceState({}, "", "/");
      }
      const isDevTest = import.meta.env.DEV && window.location.pathname === "/dev-test";
      const isPainelReferencia = window.location.pathname === "/painel-referencia";
      const isAjuda = window.location.pathname === "/ajuda";
      const isUserProjects = window.location.pathname === "/meus-projetos";
      setShowSystemDocs(isSystemDocs);
      setShowAdmin(isAdmin);
      setShowProjectProgress(isProjectProgress);
      setShowDevTest(isDevTest);
      setShowPainelReferencia(isPainelReferencia);
      setShowAjuda(isAjuda);
      setShowUserProjects(isUserProjects);
    };
    syncRoute();
    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  const navigateToSystemDocs = () => {
    window.history.pushState({}, "", "/documentacao");
    setShowSystemDocs(true);
    setShowAdmin(false);
    setShowProjectProgress(false);
    setShowPainelReferencia(false);
    setShowAjuda(false);
    setShowDevTest(false);
    setShowUserProjects(false);
  };

  const navigateToAdmin = () => {
    window.history.pushState({}, "", "/admin");
    setShowAdmin(true);
    setShowSystemDocs(false);
    setShowProjectProgress(false);
    setShowPainelReferencia(false);
    setShowAjuda(false);
    setShowDevTest(false);
    setShowUserProjects(false);
  };

  const navigateToProjectProgress = () => {
    window.history.pushState({}, "", "/project-progress");
    setShowProjectProgress(true);
    setShowSystemDocs(false);
    setShowAdmin(false);
    setShowPainelReferencia(false);
    setShowAjuda(false);
    setShowDevTest(false);
    setShowUserProjects(false);
  };

  const navigateToAjuda = () => {
    window.history.pushState({}, "", "/ajuda");
    setShowAjuda(true);
    setShowSystemDocs(false);
    setShowAdmin(false);
    setShowProjectProgress(false);
    setShowDevTest(false);
    setShowPainelReferencia(false);
    setShowUserProjects(false);
  };

  const navigateToPainelReferencia = () => {
    window.history.pushState({}, "", "/painel-referencia");
    setShowPainelReferencia(true);
    setShowSystemDocs(false);
    setShowAdmin(false);
    setShowProjectProgress(false);
    setShowAjuda(false);
    setShowDevTest(false);
    setShowUserProjects(false);
  };

  const navigateToApp = () => {
    window.history.pushState({}, "", "/");
    setShowSystemDocs(false);
    setShowAdmin(false);
    setShowProjectProgress(false);
    setShowDevTest(false);
    setShowPainelReferencia(false);
    setShowAjuda(false);
    setShowUserProjects(false);
  };

  const navigateToUserProjects = () => {
    window.history.pushState({}, "", "/meus-projetos");
    setShowUserProjects(true);
    setShowAjuda(false);
    setShowSystemDocs(false);
    setShowAdmin(false);
    setShowProjectProgress(false);
    setShowDevTest(false);
    setShowPainelReferencia(false);
  };

  return (
    <ThemeProvider>
    <LoaderUI />
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
          {showPainelReferencia || showSystemDocs || showAdmin || showProjectProgress || showDevTest || showAjuda || showUserProjects ? (
            <Suspense fallback={null}>
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
              ) : showAjuda ? (
                <Ajuda />
              ) : showUserProjects ? (
                <UserProjectsPage />
              ) : (
                <Documentacao />
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
          onShowSystemDocs={navigateToSystemDocs}
          onShowAdmin={navigateToAdmin}
          onShowAjuda={navigateToAjuda}
          onShowUserProjects={navigateToUserProjects}
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