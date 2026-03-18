import { useEffect, useRef, useState } from "react";
import type {
  UltraPerformanceInternalMode,
  ViewerBackgroundMode,
  ViewerMaterialQuality,
} from "../../../context/projectTypes";
import { useProject } from "../../../context/useProject";
import { usePimoViewerContext } from "../../../hooks/usePimoViewerContext";

export default function DisplayMenuButton() {
  const { actions, project } = useProject();
  const { viewerApi } = usePimoViewerContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const ultraModeEnabled = project.viewerSettings.ultraPerformanceModeOptions.enabled;

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const applyDisplayMode = (mode: "performance" | "quality") => {
    const enablePerformance = mode === "performance";
    const nextUltraOptions = {
      ...project.viewerSettings.ultraPerformanceModeOptions,
      enabled: enablePerformance,
    };

    actions.setViewerSettings({
      ultraPerformanceModeOptions: nextUltraOptions,
      // Performance força reflexos OFF para ganho real; qualidade preserva estado atual.
      ...(enablePerformance ? { enableReflections: false } : {}),
    });

    viewerApi?.setUltraPerformanceModeOptions?.(nextUltraOptions);
    viewerApi?.setUltraPerformanceMode?.(enablePerformance);
    if (enablePerformance) {
      viewerApi?.setReflectionsEnabled?.(false);
    }
  };

  const toggleUltraPerformance = () => {
    applyDisplayMode(ultraModeEnabled ? "quality" : "performance");
  };

  const restoreDefaultVisualMode = () => {
    actions.setViewerSettings({
      backgroundMode: "studio",
      materialQuality: "standard",
      enableReflections: false,
      ultraPerformanceModeOptions: {
        enabled: false,
        mode: "balanced",
      },
    });
    viewerApi?.setBackgroundMode?.("studio");
    viewerApi?.setMaterialQuality?.("standard");
    viewerApi?.setReflectionsEnabled?.(false);
    viewerApi?.setUltraPerformanceModeOptions?.({
      enabled: false,
      mode: "balanced",
    });
    viewerApi?.setUltraPerformanceMode?.(false);
    setMenuOpen(false);
  };

  return (
    <div ref={menuRef} className="viewer-toolbar-popover-anchor">
      <button
        type="button"
        title="Opções de exibição"
        aria-label="Opções de exibição"
        aria-haspopup="dialog"
        aria-expanded={menuOpen}
        aria-pressed={menuOpen}
        onClick={() => setMenuOpen((prev) => !prev)}
        style={{ fontSize: 12 }}
      >
        <span className="viewer-toolbar-icon" aria-hidden>
          ⚡
        </span>
      </button>

      {menuOpen && (
        <div className="viewer-toolbar-popover-panel" role="dialog" aria-label="Opções de exibição">
          <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 240 }}>
            <button
              type="button"
              className="button button-ghost"
              style={{ fontSize: 12, padding: "6px 10px", width: "100%" }}
              onClick={toggleUltraPerformance}
            >
              {ultraModeEnabled ? "Modo de exibição: Qualidade" : "Modo de exibição: Performance"}
            </button>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: 12 }}>
              <span>Ultra Performance</span>
              <input
                type="checkbox"
                checked={ultraModeEnabled}
                onChange={toggleUltraPerformance}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
              Background
              <select
                value={project.viewerSettings.backgroundMode}
                onChange={(e) => {
                  const value = e.target.value as ViewerBackgroundMode;
                  actions.setViewerSettings({ backgroundMode: value });
                  viewerApi?.setBackgroundMode?.(value);
                }}
                className="input input-sm"
              >
                <option value="studio">Studio</option>
                <option value="white">White</option>
                <option value="dark">Dark</option>
                <option value="woodFloor">Wood Floor</option>
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
              Qualidade de Material
              <select
                value={project.viewerSettings.materialQuality}
                onChange={(e) => {
                  const value = e.target.value as ViewerMaterialQuality;
                  actions.setViewerSettings({ materialQuality: value });
                  viewerApi?.setMaterialQuality?.(value);
                }}
                className="input input-sm"
              >
                <option value="standard">Standard</option>
                <option value="premium">Premium (PBR)</option>
                <option value="lacquered">Lacado</option>
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
              Modo Ultra
              <select
                value={project.viewerSettings.ultraPerformanceModeOptions.mode}
                onChange={(e) =>
                {
                  const mode = e.target.value as UltraPerformanceInternalMode;
                  actions.setViewerSettings({
                    ultraPerformanceModeOptions: {
                      enabled: true,
                      mode,
                    },
                  });
                  viewerApi?.setUltraPerformanceModeOptions?.({
                    enabled: true,
                    mode,
                  });
                  viewerApi?.setUltraPerformanceMode?.(true);
                }}
                className="input input-sm"
              >
                <option value="balanced">Balanced</option>
                <option value="flat2">Flat 2.0</option>
                <option value="aggressive">Aggressive</option>
              </select>
            </label>

            <button
              type="button"
              className="button button-ghost"
              style={{ fontSize: 12, padding: "6px 10px", width: "100%" }}
              onClick={restoreDefaultVisualMode}
            >
              Restaurar visual padrão
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
