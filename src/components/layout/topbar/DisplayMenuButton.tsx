import { useEffect, useRef, useState, type CSSProperties } from "react";
import type {
  UltraPerformanceInternalMode,
  ViewerBackgroundMode,
  ViewerMaterialQuality,
} from "../../../context/projectTypes";
import { useProject } from "../../../context/useProject";
import { usePimoViewerContext } from "../../../hooks/usePimoViewerContext";
import { Icon } from "@/components/icons";

const BACKGROUND_OPTIONS: Array<{ value: ViewerBackgroundMode; label: string; description: string }> = [
  { value: "studio", label: "Studio", description: "Equilibrado para trabalho diário." },
  { value: "white", label: "Branco Neutro", description: "Fundo claro para leitura de detalhes." },
  { value: "dark", label: "Dark Contraste", description: "Contraste alto para materiais claros." },
  { value: "woodFloor", label: "Piso Madeira", description: "Ambiente com piso quente e realista." },
];

const UNIQUE_BACKGROUND_OPTIONS = Array.from(
  new Map(BACKGROUND_OPTIONS.map((option) => [option.value, option])).values()
);

export type DisplayMenuButtonProps = {
  triggerStyle?: CSSProperties;
};

export default function DisplayMenuButton({ triggerStyle }: DisplayMenuButtonProps) {
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

  const enableUltraQualityMode = () => {
    const nextUltraOptions = {
      ...project.viewerSettings.ultraPerformanceModeOptions,
      enabled: true,
    };

    actions.setViewerSettings({
      ultraPerformanceModeOptions: nextUltraOptions,
      enableReflections: true,
      materialQuality: "premium",
    });

    viewerApi?.setUltraPerformanceModeOptions?.(nextUltraOptions);
    viewerApi?.setUltraPerformanceMode?.(true);
    viewerApi?.setMaterialQuality?.("premium");
    viewerApi?.setReflectionsEnabled?.(true);
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
      globalLightIntensity: 1,
      shadowIntensity: 1,
      glossIntensity: 1,
      matteMode: false,
    });
    viewerApi?.setBackgroundMode?.("studio");
    viewerApi?.setMaterialQuality?.("standard");
    viewerApi?.setReflectionsEnabled?.(false);
    viewerApi?.setUltraPerformanceModeOptions?.({
      enabled: false,
      mode: "balanced",
    });
    viewerApi?.setUltraPerformanceMode?.(false);
    viewerApi?.setGlobalLightIntensity?.(1);
    viewerApi?.setShadowIntensity?.(1);
    viewerApi?.setGlossIntensity?.(1);
    viewerApi?.setMatteMode?.(false);
    setMenuOpen(false);
  };

  return (
    <div ref={menuRef} className="viewer-toolbar-popover-anchor">
      <button
        type="button"
        title="Configurações de Qualidade de Exibição"
        aria-label="Configurações de Qualidade de Exibição"
        aria-haspopup="dialog"
        aria-expanded={menuOpen}
        aria-pressed={menuOpen}
        onClick={() => setMenuOpen((prev) => !prev)}
        style={
          triggerStyle
            ? {
                ...triggerStyle,
                background: menuOpen ? "var(--toolbar-pressed-bg)" : "transparent",
              }
            : { fontSize: 12 }
        }
        onMouseEnter={
          triggerStyle
            ? (e) => {
                if (!menuOpen) e.currentTarget.style.background = "var(--viewer-toolbar-hover-bg)";
              }
            : undefined
        }
        onMouseLeave={
          triggerStyle
            ? (e) => {
                e.currentTarget.style.background = menuOpen ? "var(--toolbar-pressed-bg)" : "transparent";
              }
            : undefined
        }
      >
        {triggerStyle ? (
          <Icon name="displayMenu" size={24} aria-hidden />
        ) : (
          <span className="viewer-toolbar-icon" aria-hidden>
            <Icon name="displayMenu" size={24} aria-hidden />
          </span>
        )}
      </button>

      {menuOpen && (
        <div
          className="viewer-toolbar-popover-panel display-quality-panel"
          role="dialog"
          aria-label="Configurações de Qualidade de Exibição"
        >
          <div className="display-quality-container">
            <div className="display-quality-title">Configurações de Qualidade de Exibição</div>

            <section className="display-quality-section" aria-label="Presets">
              <div className="display-quality-section-title">Presets</div>
              <button
                type="button"
                title="Apply standard quality preset."
                className={`button viewer-display-mode-button ${ultraModeEnabled ? "" : "button-ghost"}`}
                style={{ fontSize: 12, padding: "8px 10px", width: "100%" }}
                onClick={enableUltraQualityMode}
                disabled={project.estaCarregando}
                aria-pressed={ultraModeEnabled}
              >
                Quality
              </button>
              <label className="display-quality-toggle-row">
                <span title="Highest visual quality preset available.">Ultra Quality (highest quality)</span>
                <input
                  type="checkbox"
                  checked={ultraModeEnabled}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    const nextUltraOptions = {
                      ...project.viewerSettings.ultraPerformanceModeOptions,
                      enabled,
                    };
                    actions.setViewerSettings({ ultraPerformanceModeOptions: nextUltraOptions });
                    viewerApi?.setUltraPerformanceModeOptions?.(nextUltraOptions);
                    viewerApi?.setUltraPerformanceMode?.(enabled);
                  }}
                />
              </label>
              <label className="display-quality-field">
                Perfil Ultra
                <select
                  value={project.viewerSettings.ultraPerformanceModeOptions.mode}
                  onChange={(e) => {
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
                  title="Select the internal Ultra Quality profile."
                >
                  <option value="balanced">Balanced</option>
                  <option value="flat2">Flat 2.0</option>
                  <option value="aggressive">Aggressive</option>
                </select>
              </label>
              <label className="display-quality-field">
                Material Quality
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
            </section>

            <section className="display-quality-section" aria-label="Background">
              <div className="display-quality-section-title">Background</div>
              <label className="display-quality-field">
                Ambiente
                <select
                  value={project.viewerSettings.backgroundMode}
                  onChange={(e) => {
                    const value = e.target.value as ViewerBackgroundMode;
                    actions.setViewerSettings({ backgroundMode: value });
                    viewerApi?.setBackgroundMode?.(value);
                  }}
                  className="input input-sm"
                  title="Set scene background and ambience."
                >
                  {UNIQUE_BACKGROUND_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} title={option.description}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            <section className="display-quality-section" aria-label="Iluminação">
              <div className="display-quality-section-title">Iluminação</div>
              <label className="display-quality-field">
                Light Intensity ({Math.round(project.viewerSettings.globalLightIntensity * 100)}%)
                <input
                  type="range"
                  min={0.6}
                  max={1.4}
                  step={0.01}
                  value={project.viewerSettings.globalLightIntensity}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    actions.setViewerSettings({ globalLightIntensity: value });
                    viewerApi?.setGlobalLightIntensity?.(value);
                  }}
                  title="Adjust main light intensity in real time."
                />
              </label>
            </section>

            <section className="display-quality-section" aria-label="Shadow Intensity">
              <div className="display-quality-section-title">Shadow Intensity</div>
              <label className="display-quality-field">
                Shadow Intensity ({Math.round(project.viewerSettings.shadowIntensity * 100)}%)
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={project.viewerSettings.shadowIntensity}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    actions.setViewerSettings({ shadowIntensity: value });
                    viewerApi?.setShadowIntensity?.(value);
                  }}
                  title="Ajusta a intensidade das sombras projetadas no ambiente 3D."
                />
              </label>
            </section>

            <section className="display-quality-section" aria-label="Brilho">
              <div className="display-quality-section-title">Brilho</div>
              <label className="display-quality-toggle-row">
                <span title="Remove todo o brilho e reflexos dos materiais.">
                  Modo Mate
                </span>
                <input
                  type="checkbox"
                  checked={project.viewerSettings.matteMode}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    actions.setViewerSettings({ matteMode: enabled });
                    viewerApi?.setMatteMode?.(enabled);
                  }}
                />
              </label>
              <label
                className="display-quality-field"
                style={{ opacity: project.viewerSettings.matteMode ? 0.4 : 1 }}
              >
                Gloss ({Math.round(project.viewerSettings.glossIntensity * 100)}%)
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={project.viewerSettings.glossIntensity}
                  disabled={project.viewerSettings.matteMode}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    actions.setViewerSettings({ glossIntensity: value });
                    viewerApi?.setGlossIntensity?.(value);
                  }}
                  title="Reduz ou remove o brilho dos materiais (1 = original, 0 = totalmente fosco)."
                />
              </label>
            </section>

            <section className="display-quality-section" aria-label="Transformações">
              <div className="display-quality-section-title">Transformações</div>
              <label className="display-quality-field">
                Modo de escala padrão
                <select
                  className="input"
                  value={project.viewerSettings.defaultScalingMode ?? "additive"}
                  onChange={(e) => {
                    const value = e.target.value === "ratio" ? "ratio" : "additive";
                    actions.setViewerSettings({ defaultScalingMode: value });
                  }}
                >
                  <option value="additive">Additive</option>
                  <option value="ratio">Ratio</option>
                </select>
              </label>
            </section>

            <button
              type="button"
              className="button button-ghost viewer-display-reset-button"
              style={{ fontSize: 12, padding: "6px 10px", width: "100%" }}
              onClick={restoreDefaultVisualMode}
              title="Restaura as configurações padrão de exibição."
            >
              Restaurar visual padrão
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
