import { useCallback, useEffect, useState } from "react";
import Panel from "../ui/Panel";
import {
  AdminPageHeader,
  AdminStickyActionBar,
  adminLabelStyle,
  adminPageShellStyle,
} from "./AdminUi";
import { useAdminFeedback } from "../../hooks/useAdminFeedback";
import { useProject } from "../../context/useProject";
import {
  defaultMcDimensionsConfig,
  loadMcDimensionsConfig,
  saveMcDimensionsConfig,
  type McDimensionsConfig,
  type McDimensionsFormat,
} from "../../config/mcDimensionsConfig";
import { captureMcDimensionsFromViewer } from "../../core/industrial/mcDimensions/mcDimensionsCapture";
import { previewMcSvg } from "../../core/industrial/mcDimensions/mcDimensionsGenerator";

const FORMAT_LABELS: Record<McDimensionsFormat, string> = {
  pdf: "PDF (desenho técnico)",
  svg: "SVG (vetorial)",
  png: "PNG (alta resolução)",
  json: "JSON (dados completos)",
};

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={adminLabelStyle}>{label}</span>
      <input
        className="input"
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={adminLabelStyle}>{label}</span>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
        <input className="input" type="text" value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </label>
  );
}

export default function McDimensionsAdminPage() {
  const feedback = useAdminFeedback();
  const { viewerSync } = useProject();
  const [config, setConfig] = useState<McDimensionsConfig>(() => loadMcDimensionsConfig());
  const [previewSvg, setPreviewSvg] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    setConfig(loadMcDimensionsConfig());
  }, []);

  const updateConfig = useCallback((patch: Partial<McDimensionsConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const toggleFormat = useCallback((format: McDimensionsFormat) => {
    setConfig((prev) => ({
      ...prev,
      formats: { ...prev.formats, [format]: !prev.formats[format] },
    }));
  }, []);

  const handleSave = useCallback(() => {
    saveMcDimensionsConfig(config);
    feedback.success("Configuração MC guardada.");
  }, [config, feedback]);

  const handleReset = useCallback(() => {
    const next = {
      ...defaultMcDimensionsConfig,
      formats: { ...defaultMcDimensionsConfig.formats },
    };
    setConfig(next);
    saveMcDimensionsConfig(next);
    feedback.success("Configuração MC reposta para os valores padrão.");
  }, [feedback]);

  const handlePreview = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const data = await captureMcDimensionsFromViewer({
        getPrintReadyDimensions: () =>
          viewerSync.getPrintReadyDimensions?.() ?? { entries: [], generatedAt: Date.now() },
        setDimensionsOverlayVisible: viewerSync.setDimensionsOverlayVisible,
        getDimensionsOverlayVisible: viewerSync.getDimensionsOverlayVisible,
        renderScene: (opts) =>
          viewerSync.renderScene(opts as unknown as Parameters<typeof viewerSync.renderScene>[0]),
      });
      const svg = previewMcSvg(data, config);
      setPreviewSvg(svg);
      if (!svg) {
        feedback.warning("Sem medidas MC no viewer. Abra um projeto com caixas e tente novamente.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      feedback.error(`Pré-visualização falhou: ${msg}`);
    } finally {
      setPreviewLoading(false);
    }
  }, [config, feedback, viewerSync]);

  return (
    <div style={adminPageShellStyle}>
      <AdminPageHeader
        title="Dimensões Técnicas (MC Overlay)"
        subtitle="Pipeline industrial independente — consome dados de viewerApi.getPrintReadyDimensions() e gera ficheiros no «Gerar arquivo completo»."
      />

      <Panel title="Geração">
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => updateConfig({ enabled: e.target.checked })}
          />
          <span>Ativar geração MC industrial no export completo</span>
        </label>

        <div style={{ display: "grid", gap: 8 }}>
          <span style={adminLabelStyle}>Formatos a gerar</span>
          {(Object.keys(FORMAT_LABELS) as McDimensionsFormat[]).map((fmt) => (
            <label key={fmt} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={config.formats[fmt]} onChange={() => toggleFormat(fmt)} />
              <span>{FORMAT_LABELS[fmt]}</span>
            </label>
          ))}
        </div>
      </Panel>

      <Panel title="Estilo do desenho técnico">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 12,
          }}
        >
          <NumberField
            label="Tamanho do texto (pt)"
            value={config.textSizePt}
            min={6}
            max={24}
            onChange={(v) => updateConfig({ textSizePt: v })}
          />
          <NumberField
            label="Espessura das linhas (px)"
            value={config.lineWidthPx}
            min={0.25}
            max={6}
            step={0.25}
            onChange={(v) => updateConfig({ lineWidthPx: v })}
          />
          <NumberField
            label="Margens do desenho (mm)"
            value={config.marginMm}
            min={4}
            max={80}
            onChange={(v) => updateConfig({ marginMm: v })}
          />
          <NumberField
            label="Escala base (0 = auto)"
            value={config.baseScale}
            min={0}
            max={10}
            step={0.1}
            onChange={(v) => updateConfig({ baseScale: v })}
          />
          <ColorField label="Cor das linhas" value={config.lineColor} onChange={(v) => updateConfig({ lineColor: v })} />
          <ColorField
            label="Cor do fundo"
            value={config.backgroundColor}
            onChange={(v) => updateConfig({ backgroundColor: v })}
          />
        </div>
      </Panel>

      <Panel title="Pré-visualização">
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 0 }}>
          Usa o viewer atual para capturar medidas MC e renderizar o SVG com as opções acima.
        </p>
        <button type="button" className="btn btn-outline" disabled={previewLoading} onClick={() => void handlePreview()}>
          {previewLoading ? "A gerar…" : "Atualizar pré-visualização"}
        </button>
        {previewSvg ? (
          <div
            style={{
              marginTop: 12,
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              padding: 8,
              background: config.backgroundColor,
              overflow: "auto",
              maxHeight: 420,
            }}
            dangerouslySetInnerHTML={{ __html: previewSvg }}
          />
        ) : null}
      </Panel>

      <AdminStickyActionBar>
        <button type="button" className="btn btn-primary" onClick={handleSave}>
          Guardar
        </button>
        <button type="button" className="btn btn-outline" onClick={handleReset}>
          Repor padrões
        </button>
      </AdminStickyActionBar>
    </div>
  );
}
