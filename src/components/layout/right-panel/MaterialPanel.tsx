import { useState } from "react";
import Panel from "../../ui/Panel";
import { useProject } from "../../../context/useProject";
import { useMaterial } from "../../../context/useMaterial";
import { usePimoViewerContext } from "../../../hooks/usePimoViewerContext";
import {
  getPresetsForUI,
  getPreset,
  invalidatePresetRegistry,
} from "../../../3d/viewer-engine/materials";
import { updatePreset } from "../../../core/materials/presetService";
import { materialCategoryOptions } from "../../../context/materialUtils";

export default function MaterialPanel() {
  const { actions, project } = useProject();
  const { state, setCategoryOverrides, setCategoryPreset } = useMaterial();
  const { viewerApi } = usePimoViewerContext();
  const [activeCategory] = useState(materialCategoryOptions[0].id);
  const currentConfig = state.categories[activeCategory];
  const presets = getPresetsForUI();
  const activePresetDef = currentConfig.presetId
    ? getPreset(currentConfig.presetId)
    : null;
  const selectedBoxId = project.selectedWorkspaceBoxId ?? null;

  const applyMaterialToViewer = (presetId: string) => {
    if (selectedBoxId && viewerApi?.updateBoxMaterial) {
      viewerApi.updateBoxMaterial(selectedBoxId, presetId);
    }
  };

  const handlePresetChange = (presetId: string) => {
    setCategoryPreset(activeCategory, presetId);
    actions.logChangelog(`Preset aplicado: ${presetId}`);
    if (selectedBoxId) {
      actions.setWorkspaceBoxMaterial(selectedBoxId, presetId);
    }
    applyMaterialToViewer(presetId);
  };

  const handleOverride = (
    overrides: { roughness?: number; metalness?: number; envMapIntensity?: number; color?: string }
  ) => {
    setCategoryOverrides(activeCategory, overrides);
    if (currentConfig.presetId) {
      updatePreset(currentConfig.presetId, overrides);
      invalidatePresetRegistry();
      applyMaterialToViewer(currentConfig.presetId);
    }
  };

  return (
    <Panel title="Materiais">
      <div className="stack">
        <div className="form-grid">
          <label className="stack-tight">
            <span className="muted-text">Tipo de material</span>
            <select value={activeCategory} className="select" disabled>
              {materialCategoryOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="stack-tight">
            <span className="muted-text">Preset</span>
            <select
              value={currentConfig.presetId}
              onChange={(event) => handlePresetChange(event.target.value)}
              className="select"
            >
              {presets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="texture-preview">
          <div
            className="texture-preview-image"
            style={{
              backgroundColor: activePresetDef?.baseColor ?? "#f2f0eb",
              ...(activePresetDef?.textureUrl
                ? { backgroundImage: `url(${activePresetDef.textureUrl})` }
                : {}),
            }}
          />
          <div className="muted-text-xs">Preview (cor ou textura)</div>
        </div>

        <div className="form-grid">
          <label className="stack-tight">
            <span className="muted-text">Roughness</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={currentConfig.roughness}
              onChange={(event) =>
                handleOverride({ roughness: Number(event.target.value) })
              }
            />
          </label>
          <label className="stack-tight">
            <span className="muted-text">Metalness</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={currentConfig.metalness}
              onChange={(event) =>
                handleOverride({ metalness: Number(event.target.value) })
              }
            />
          </label>
        </div>

        <div className="form-grid">
          <label className="stack-tight">
            <span className="muted-text">Intensidade</span>
            <input
              type="range"
              min="0"
              max="2"
              step="0.01"
              value={currentConfig.envMapIntensity}
              onChange={(event) =>
                handleOverride({
                  envMapIntensity: Number(event.target.value),
                })
              }
            />
          </label>
          <label className="stack-tight">
            <span className="muted-text">Cor</span>
            <input
              type="color"
              value={currentConfig.color}
              onChange={(event) =>
                handleOverride({ color: event.target.value })
              }
            />
          </label>
        </div>

        {selectedBoxId && (
          <div className="muted-text-xs">
            Material aplicado à caixa selecionada em tempo real.
          </div>
        )}
      </div>
    </Panel>
  );
}
