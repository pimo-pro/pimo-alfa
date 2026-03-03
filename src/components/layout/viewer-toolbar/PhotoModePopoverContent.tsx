import { useState } from "react";
import { useToast } from "../../../context/ToastContext";
import { usePimoViewerContext } from "../../../hooks/usePimoViewerContext";
import type {
  ViewerCameraPreset,
  ViewerRenderBackground,
  ViewerRenderFormat,
  ViewerRenderMode,
  ViewerRenderResult,
  ViewerRenderSize,
} from "../../../context/projectTypes";

type Props = {
  onClose: () => void;
};

export default function PhotoModePopoverContent({ onClose }: Props) {
  const { viewerApi } = usePimoViewerContext();
  const { startLoading, stopLoading, showToast } = useToast();
  const [renderSize, setRenderSize] = useState<ViewerRenderSize>("medium");
  const [renderPreset, setRenderPreset] = useState<ViewerCameraPreset>("current");
  const [renderBackground, setRenderBackground] = useState<ViewerRenderBackground>("white");
  const [renderMode, setRenderMode] = useState<ViewerRenderMode>("pbr");
  const [renderWatermark, setRenderWatermark] = useState<boolean>(false);
  const [renderShadowIntensity, setRenderShadowIntensity] = useState<number>(1);
  const [renderFormat, setRenderFormat] = useState<ViewerRenderFormat>("png");
  const [renderQuality, setRenderQuality] = useState<number>(0.92);
  const [advancedRealism, setAdvancedRealism] = useState<boolean>(false);
  const [renderLoading, setRenderLoading] = useState(false);
  const [renderResult, setRenderResult] = useState<ViewerRenderResult | null>(null);

  const handleRenderImage = async () => {
    if (!viewerApi?.renderScene) {
      showToast("Viewer indisponível para renderização.", "warning");
      return;
    }

    const loadingId = startLoading("A gerar imagem do Viewer...");
    setRenderLoading(true);
    setRenderResult(null);
    try {
      const result = await viewerApi.renderScene({
        size: renderSize,
        preset: renderPreset,
        background: renderBackground,
        mode: renderMode,
        watermark: renderWatermark,
        shadowIntensity: renderShadowIntensity,
        format: renderFormat,
        quality: renderQuality,
        advancedRealism,
      });

      if (!result) {
        showToast("Não foi possível gerar a imagem.", "error");
        return;
      }
      setRenderResult(result);
      showToast("Imagem gerada com sucesso.", "info", 1400);
    } catch {
      showToast("Erro ao gerar imagem do Viewer.", "error");
    } finally {
      setRenderLoading(false);
      stopLoading(loadingId);
    }
  };

  const downloadDataUrl = (dataUrl: string, width?: number, height?: number) => {
    const extension = dataUrl.startsWith("data:image/jpeg") ? "jpg" : "png";
    const suffix = width && height ? `-${width}x${height}` : "";
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `pimo-photo${suffix}.${extension}`;
    link.click();
  };

  return (
    <div className="modal-list photo-mode-popover-list">
      <div className="modal-list-item">
        <div className="modal-list-info">
          <div className="modal-list-title">Tamanho da imagem</div>
          <div className="modal-list-meta">Defina a resolução final da captura</div>
        </div>
        <select
          className="select select-xs"
          value={renderSize}
          onChange={(event) => setRenderSize(event.target.value as ViewerRenderSize)}
        >
          <option value="small">Pequeno (1280×720)</option>
          <option value="medium">Médio (1600×900)</option>
          <option value="large">Grande (1920×1080)</option>
          <option value="4k">4K (3840×2160)</option>
        </select>
      </div>

      <div className="modal-list-item">
        <div className="modal-list-info">
          <div className="modal-list-title">Ângulo</div>
          <div className="modal-list-meta">Utilize presets rápidos ou mantenha a câmera atual</div>
        </div>
        <select
          className="select select-xs"
          value={renderPreset}
          onChange={(event) => setRenderPreset(event.target.value as ViewerCameraPreset)}
        >
          <option value="current">Usar câmera atual</option>
          <option value="front">Frontal</option>
          <option value="top">Topo</option>
          <option value="iso1">Isométrico 1</option>
          <option value="iso2">Isométrico 2</option>
        </select>
      </div>

      <div className="modal-list-item">
        <div className="modal-list-info">
          <div className="modal-list-title">Fundo</div>
          <div className="modal-list-meta">Escolha fundo normal ou exportação recortada do projeto</div>
        </div>
        <select
          className="select select-xs"
          value={renderBackground}
          onChange={(event) => setRenderBackground(event.target.value as ViewerRenderBackground)}
        >
          <option value="white">Branco</option>
          <option value="transparent">Transparente</option>
          <option value="project-transparent">Exportar Projeto (sem chão e sem fundo)</option>
        </select>
      </div>

      <button
        type="button"
        className={`button ${renderWatermark ? "" : "button-ghost"} photo-mode-option-button`}
        aria-pressed={renderWatermark}
        onClick={() => setRenderWatermark((prev) => !prev)}
      >
        <span className="photo-mode-option-main">
          <span className="modal-list-title">Marca d’água</span>
          <span className="modal-list-meta">Adicionar selo “PIMO” no canto inferior direito</span>
        </span>
        <span className="photo-mode-option-state">{renderWatermark ? "ON" : "OFF"}</span>
      </button>

      <div className="modal-list-item">
        <div className="modal-list-info">
          <div className="modal-list-title">Iluminação (sombras)</div>
          <div className="modal-list-meta">Ajuste a intensidade das sombras antes do render</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={renderShadowIntensity}
            onChange={(event) => setRenderShadowIntensity(parseFloat(event.target.value))}
            style={{ flex: 1 }}
          />
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{Math.round(renderShadowIntensity * 100)}%</span>
        </div>
      </div>

      <button
        type="button"
        className={`button ${advancedRealism ? "" : "button-ghost"} photo-mode-option-button`}
        aria-pressed={advancedRealism}
        onClick={() => setAdvancedRealism((prev) => !prev)}
      >
        <span className="photo-mode-option-main">
          <span className="modal-list-title">Realismo Avançado</span>
          <span className="modal-list-meta">ON/OFF com iluminação refinada, AO e AA no modo PBR</span>
        </span>
        <span className="photo-mode-option-state">{advancedRealism ? "ON" : "OFF"}</span>
      </button>

      <div className="modal-list-item">
        <div className="modal-list-info">
          <div className="modal-list-title">Modo de renderização</div>
          <div className="modal-list-meta">Escolha entre visual realista ou linhas técnicas</div>
        </div>
        <div className="photo-mode-mode-buttons">
          {[
            ["pbr", "Realista (PBR)"],
            ["lines", "Linhas (outline)"],
          ].map(([mode, label]) => {
            const active = renderMode === mode;
            return (
              <button
                key={mode}
                type="button"
                className={`button ${active ? "" : "button-ghost"} photo-mode-mode-button`}
                aria-pressed={active}
                onClick={() => setRenderMode(mode as ViewerRenderMode)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="modal-list-item">
        <div className="modal-list-info">
          <div className="modal-list-title">Formato</div>
          <div className="modal-list-meta">Escolha entre PNG (transparência) ou JPG (mais leve)</div>
        </div>
        <select
          className="select select-xs"
          value={renderFormat}
          onChange={(event) => setRenderFormat(event.target.value as ViewerRenderFormat)}
        >
          <option value="png">PNG (sem perdas)</option>
          <option value="jpg">JPG (compressão)</option>
        </select>
      </div>

      {renderFormat === "jpg" && (
        <div className="modal-list-item">
          <div className="modal-list-info">
            <div className="modal-list-title">Qualidade do JPG</div>
            <div className="modal-list-meta">100% = melhor qualidade, arquivos maiores</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={renderQuality}
              onChange={(event) => setRenderQuality(parseFloat(event.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{Math.round(renderQuality * 100)}%</span>
          </div>
        </div>
      )}

      <div className="photo-mode-action-buttons">
        <button type="button" className="button photo-mode-action-button" disabled={renderLoading} onClick={handleRenderImage}>
          {renderLoading ? "Gerando..." : "Gerar imagem"}
        </button>
        <button type="button" className="button button-ghost photo-mode-action-button" onClick={onClose}>
          Fechar
        </button>
      </div>

      {renderResult && (
        <div className="modal-placeholder">
          <img src={renderResult.dataUrl} alt="Pré-visualização do render" style={{ maxWidth: "100%", borderRadius: 8 }} />
          <div className="modal-list-meta" style={{ marginTop: 8 }}>
            {renderResult.width}×{renderResult.height}px
          </div>
          <button
            type="button"
            className="button photo-mode-action-button"
            onClick={() => downloadDataUrl(renderResult.dataUrl, renderResult.width, renderResult.height)}
          >
            Baixar render
          </button>
        </div>
      )}

    </div>
  );
}