import Header from "./components/layout/header/Header";
import Footer from "./components/layout/footer/Footer";
import WhatsAppButton from "./components/layout/WhatsAppButton";
import { PimoViewerProvider } from "./context/PimoViewerContext";
import { ProjectProvider } from "./context/ProjectProvider";
import { MaterialProvider } from "./context/materialContext";
import { ToastProvider } from "./context/ToastContext";
import { SettingsProvider } from "./context/SettingsContext";
import { Suspense, lazy, useEffect, useState } from "react";

const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const DesignPage = lazy(() => import("./pages/DesignPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

function resolveNormalizedPath(pathname: string): string {
  if (pathname === "/" || pathname === "/projects") return "/projects";
  if (pathname.startsWith("/design/")) return pathname;
  if (pathname === "/settings") return "/settings";
  if (
    pathname === "/admin" ||
    pathname === "/painel-referencia" ||
    pathname === "/project-progress" ||
    pathname === "/documentacao" ||
    pathname === "/sobre-nos" ||
    pathname === "/dev-test"
  ) {
    return "/settings";
  }
  return "/projects";
}

function getProjectIdFromPath(pathname: string): string {
  if (!pathname.startsWith("/design/")) return "active";
  const parts = pathname.split("/");
  return decodeURIComponent(parts[2] || "active");
}

export default function App() {
  const [path, setPath] = useState(() => resolveNormalizedPath(window.location.pathname));

  useEffect(() => {
    const normalized = resolveNormalizedPath(window.location.pathname);
    if (normalized !== window.location.pathname) {
      window.history.replaceState({}, "", normalized);
    }
    setPath(normalized);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const normalized = resolveNormalizedPath(window.location.pathname);
      if (normalized !== window.location.pathname) {
        window.history.replaceState({}, "", normalized);
      }
      setPath(normalized);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigateTo = (nextPath: string) => {
    const normalized = resolveNormalizedPath(nextPath);
    window.history.pushState({}, "", normalized);
    setPath(normalized);
  };

  const handleOpenDesign = (projectId: string) => {
    navigateTo(`/design/${encodeURIComponent(projectId)}`);
  };

  const routeTitle =
    path === "/projects"
      ? "Projetos"
      : path === "/settings"
        ? "Configurações"
        : "Design";

  const activeProjectId = getProjectIdFromPath(path);

  const goToProjects = () => navigateTo("/projects");
  const goToSettings = () => navigateTo("/settings");
  const goToDesign = () => navigateTo(`/design/${encodeURIComponent(activeProjectId || "active")}`);

  const isDesignRoute = path.startsWith("/design/");

  const onTogglePainelReferencia = () => {
    if (isDesignRoute) {
      goToSettings();
    } else {
      goToDesign();
    }
  };

  const onToggleProjectProgress = () => {
    if (isDesignRoute) {
      goToProjects();
    } else {
      goToDesign();
    }
  };

  return (
    <ProjectProvider>
      <SettingsProvider>
        <MaterialProvider>
          <ToastProvider>
            <PimoViewerProvider>
            <div className="app-root">
        <Header
          onTogglePainelReferencia={onTogglePainelReferencia}
          painelReferenciaOpen={path === "/settings"}
          onToggleProjectProgress={onToggleProjectProgress}
          projectProgressOpen={path === "/projects"}
          routeTitle={routeTitle}
        />

        {/* MAIN AREA */}
        <div className="app-main">
          <Suspense fallback={<div style={{ padding: 20, color: "var(--text-muted)" }}>Carregando…</div>}>
            {path === "/projects" ? (
              <ProjectsPage onOpenDesign={handleOpenDesign} />
            ) : path === "/settings" ? (
              <SettingsPage />
            ) : (
              <DesignPage />
            )}
          </Suspense>
        </div>

        <Footer
          onShowAbout={goToProjects}
          onShowSystemDocs={goToSettings}
          onShowAdmin={goToSettings}
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