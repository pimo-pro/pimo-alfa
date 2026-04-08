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
import { PendingWorkspaceMergeEffect } from "./context/PendingWorkspaceMergeEffect";
import { PendingSingleLoadEffect } from "./workspace/PendingSingleLoadEffect";
import { SettingsProvider } from "./context/SettingsContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Suspense, lazy, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { DEFAULT_VIEWER_OPTIONS, VIEWER_BACKGROUND } from "./constants/viewerOptions";
import { useUiStore } from "./stores/uiStore";
import PainelReferencia from "./pages/PainelReferencia";
import Ajuda from "./pages/Ajuda";
import UserProjectsPage from "./pages/UserProjectsPage";
import SettingsPage from "./pages/SettingsPage";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import MePage from "./pages/MePage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectsViewerPage from "./pages/ProjectsViewerPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ManageUsersPage from "./pages/admin/ManageUsersPage";
import ManageRolesPage from "./pages/admin/ManageRolesPage";
import ManagePermissionsPage from "./pages/admin/ManagePermissionsPage";
import { useAuth } from "./auth/useAuth";
import { IconGallery } from "@/components/icons";
import "./components/ui/ui.css";

const Documentacao = lazy(() => import("./pages/Documentacao"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const ProjectProgress = lazy(() => import("./pages/ProjectProgress"));
const V4Page = lazy(() => import("./pages/V4Page"));
const DevPimoTest = import.meta.env.DEV
  ? lazy(() => import("./__dev__/DevPimoTest"))
  : null;

function LegacyApp() {
  const [leftOpen, setLeftOpen] = useState(true);
  const leftPanelTab = useUiStore((state) => state.selectedTool);
  const setLeftPanelTab = useUiStore((state) => state.setSelectedTool);
  const clearSelection = useUiStore((state) => state.clearSelection);
  const photoModePanelOpen = useUiStore((state) => state.photoModePanelOpen);
  const setPhotoModePanelOpen = useUiStore((state) => state.setPhotoModePanelOpen);
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
    const syncRoute = () => {
      const pathname = window.location.pathname;
      const isSystemDocs = pathname === "/documentacao";
      const isAdmin = pathname === "/admin";
      const isProjectProgress = pathname === "/project-progress";
      if (!import.meta.env.DEV && pathname === "/dev-test") {
        window.history.replaceState({}, "", "/");
      }
      const isDevTest = import.meta.env.DEV && pathname === "/dev-test";
      const isPainelReferencia = pathname === "/painel-referencia";
      const isAjuda = pathname === "/ajuda";
      const isUserProjects = pathname === "/meus-projetos";
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
    <ProjectProvider>
      <SettingsProvider>
        <MaterialProvider>
          <ToastProvider>
            <PendingWorkspaceMergeEffect />
            <PendingSingleLoadEffect />
            <PimoViewerProvider>
            <div className="app-root">
        <Header />

        {/* MAIN AREA */}
        <div className="app-main">
          {showPainelReferencia || showSystemDocs || showAdmin || showProjectProgress || showDevTest || showAjuda || showUserProjects ? (
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
                            if (photoModePanelOpen) {
                              setPhotoModePanelOpen(false);
                            }
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
          onShowProjectProgress={navigateToProjectProgress}
          onShowPainelReferencia={navigateToPainelReferencia}
        />

        <WhatsAppButton />

            </div>
            </PimoViewerProvider>
          </ToastProvider>
        </MaterialProvider>
      </SettingsProvider>
    </ProjectProvider>
  );
}

function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <ToastProvider>
        <Navbar />
        <Outlet />
      </ToastProvider>
    </ProtectedRoute>
  );
}

function AppChromeLayout() {
  return (
    <div className="ui-app-frame">
      <Header />
      <main className="ui-app-frame__content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function AdminRoute({ children }: { children: ReactElement }) {
  const { user } = useAuth();
  const canAccess = user?.role === "admin" || user?.role === "ultra+";
  if (!canAccess) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route element={<AppChromeLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/definicoes"
            element={
              <ProjectProvider>
                <SettingsProvider>
                  <SettingsPage />
                </SettingsProvider>
              </ProjectProvider>
            }
          />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/me" element={<MePage />} />
            <Route
              path="/projects/viewer"
              element={
                <AdminRoute>
                  <ProjectsViewerPage />
                </AdminRoute>
              }
            />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route
              path="/admin/users"
              element={
                <AdminRoute>
                  <ManageUsersPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/roles"
              element={
                <AdminRoute>
                  <ManageRolesPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/permissions"
              element={
                <AdminRoute>
                  <ManagePermissionsPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/icons"
              element={
                <AdminRoute>
                  <IconGallery />
                </AdminRoute>
              }
            />
          </Route>
          <Route path="/v4" element={<V4Page />} /> {/* TEMPORARY — remove before production */}
        </Route>
        <Route path="/" element={<LegacyApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  );
}