/**
 * DrawersAdminHubPage
 *
 * Admin ? Produtos ? Gavetas
 * Hub unificado: toggle Modelo A, inventario, regras, mapa, catalogo Modelo B e Auto QA.
 */

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Panel from "../ui/Panel";
import { AdminPageHeader, adminPageShellStyle } from "./AdminUi";
import DrawerRulesAdminPage from "./DrawerRulesAdminPage";
import DrawerSystemUnifiedAdminPage from "./DrawerSystemUnifiedAdminPage";
import {
  isDrawerModeloAActive,
  setDrawerModeloADeactivated,
  subscribeDrawerModeloAFlags,
} from "../../core/drawers/drawerSystemFlags";
import {
  DRAWER_LEGACY_PIPELINE,
  DRAWER_OFFICIAL_PIPELINE,
  countDrawerReferenceStats,
} from "../../core/drawers/DrawerSystemReference";
import {
  ALL_SCENARIOS,
  buildQaSummary,
  downloadQaResultsJson,
  generateEuropeanDrawer,
  listEuropeanDrawerModels,
  runStressTests,
  buildEuropeanDXFFileContents,
  prepareEuropeanDXFFiles,
  buildDxfFileReport,
  prepareEuropeanCNCFiles,
  buildEuropeanCNCFileContents,
  buildCncFileReport,
  type DxfExportReport,
  type CncExportReport,
  type EuropeanCncFormat,
  type EuropeanDXFExport,
  type EuropeanIndustrialDocs,
  type EuropeanOverlay,
  type EuropeanQaScenarioResult,
  type EuropeanQaSummary,
  type EuropeanReleaseNotes,
  type EuropeanTechnicalDrawingMode,
  type IndustrialPricing,
} from "../../core/drawers/european";
import { buildKitchenLibrary, type KitchenLibrary } from "../../core/kitchen";

type HubSection = "visao" | "regras" | "mapa" | "modelo-b" | "kitchen";

const CNC_FORMAT_OPTIONS: EuropeanCncFormat[] = ["cnc", "xml", "mpr", "cix", "bpp"];

const MODELO_A_INVENTORY = [
  { area: "Dominio", path: "src/core/drawers/**", note: "Parametria, geracao, motion, drilling, catalogo" },
  { area: "UI projeto", path: "HomeLeftPanelSelected / BoxLayersPanel / DrawerConfigPanel", note: "Stepper, layers, config por gaveta" },
  { area: "Layers", path: "src/services/boxLayersService.ts", note: "Regenera drawersLayer" },
  { area: "Cutlist", path: "drawerCutlistAdapter + cutlistFromBoxes", note: "Pecas gaveta_* + furos corredica" },
  { area: "PDF", path: "pdfUnified / pdfEtiquetas / pdfFerragensTotais*", note: "Secoes e classificacao GAV_*" },
  { area: "Viewer", path: "useCalculadoraSync + DrawerController", note: "Meshes e open/close" },
  { area: "Admin legado", path: "Regras das Gavetas + Sistema Unificado", note: "Mantidos; tambem embutidos abaixo" },
] as const;

const tabBtn = (active: boolean): CSSProperties => ({
  fontSize: 12,
  fontWeight: active ? 700 : 500,
  padding: "8px 12px",
  borderRadius: 8,
  border: active ? "1px solid rgba(96,165,250,0.55)" : "1px solid rgba(255,255,255,0.1)",
  background: active ? "rgba(96,165,250,0.15)" : "transparent",
  color: active ? "#93c5fd" : "var(--text-muted)",
  cursor: "pointer",
});

export default function DrawersAdminHubPage() {
  const [modeloAActive, setModeloAActive] = useState(() => isDrawerModeloAActive());
  /** Com Modelo B activo (default de produto), abre directamente no cat·logo europeu. */
  const [section, setSection] = useState<HubSection>(() =>
    isDrawerModeloAActive() ? "visao" : "modelo-b"
  );
  const stats = useMemo(() => countDrawerReferenceStats(), []);
  const europeanModels = useMemo(() => listEuropeanDrawerModels(), []);

  const [qaRunning, setQaRunning] = useState(false);
  const [qaProgress, setQaProgress] = useState<{ index: number; total: number } | null>(null);
  const [qaResults, setQaResults] = useState<EuropeanQaScenarioResult[] | null>(null);
  const [qaSummary, setQaSummary] = useState<EuropeanQaSummary | null>(null);
  const [qaError, setQaError] = useState<string | null>(null);
  const [docsPreview, setDocsPreview] = useState<"ficha" | "pdf" | null>(null);
  const [docsSample, setDocsSample] = useState<EuropeanIndustrialDocs | null>(null);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [dxfPreview, setDxfPreview] = useState<"technical" | "dxf" | null>(null);
  const [dxfSample, setDxfSample] = useState<EuropeanDXFExport | null>(null);
  const [technicalSample, setTechnicalSample] = useState<EuropeanTechnicalDrawingMode | null>(null);
  const [dxfError, setDxfError] = useState<string | null>(null);
  const [dxfFileReport, setDxfFileReport] = useState<DxfExportReport | null>(null);
  const [dxfFileBusy, setDxfFileBusy] = useState(false);
  const [cncFormat, setCncFormat] = useState<EuropeanCncFormat>("cnc");
  const [cncFileReport, setCncFileReport] = useState<CncExportReport | null>(null);
  const [cncFileBusy, setCncFileBusy] = useState(false);
  const [cncError, setCncError] = useState<string | null>(null);
  const [overlaySample, setOverlaySample] = useState<EuropeanOverlay | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlayError, setOverlayError] = useState<string | null>(null);
  const [releaseSample, setReleaseSample] = useState<EuropeanReleaseNotes | null>(null);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [kitchenLib, setKitchenLib] = useState<KitchenLibrary | null>(null);
  const [kitchenError, setKitchenError] = useState<string | null>(null);
  const [kitchenOpen, setKitchenOpen] = useState(false);
  const [pricingSample, setPricingSample] = useState<IndustrialPricing | null>(null);
  const [pricingError, setPricingError] = useState<string | null>(null);

  useEffect(() => subscribeDrawerModeloAFlags(setModeloAActive), []);

  const deactivated = !modeloAActive;

  const runAutoQa = async () => {
    if (modeloAActive) {
      setQaError("Desactive o Modelo A para executar o Auto QA do Modelo B.");
      return;
    }
    setQaError(null);
    setQaRunning(true);
    setQaProgress({ index: 0, total: ALL_SCENARIOS.length });
    setQaResults(null);
    setQaSummary(null);
    try {
      const results = await runStressTests({
        onProgress: (p) => setQaProgress({ index: p.index, total: p.total }),
        yieldEvery: 4,
      });
      const summary = buildQaSummary(results);
      setQaResults(results);
      setQaSummary(summary);
    } catch (err) {
      setQaError(err instanceof Error ? err.message : String(err));
    } finally {
      setQaRunning(false);
    }
  };

  const ensureDocsSample = () => {
    if (docsSample) return docsSample;
    if (modeloAActive) {
      setDocsError("Desactive o Modelo A para gerar a documentaùùo de amostra do Modelo B.");
      return null;
    }
    setDocsError(null);
    const result = generateEuropeanDrawer(
      "hettich-innotech-atira",
      {
        id: "admin-docs-sample",
        nome: "Amostra Admin",
        dimensoes: { largura: 538, altura: 720, profundidade: 560 },
        espessura: 19,
        gavetas: 2,
        material: "mdf_branco",
        profundidadeInternaUtilMm: 500,
      },
      {
        systemId: "hettich-innotech-atira",
        heightMm: 144,
        depthMm: 450,
        softClose: true,
        pushOpen: false,
        count: 2,
      }
    );
    if (!result.docs) {
      setDocsError("generateEuropeanDrawer nùo devolveu docs.");
      return null;
    }
    setDocsSample(result.docs);
    return result.docs;
  };

  const showFicha = () => {
    const docs = ensureDocsSample();
    if (docs) setDocsPreview("ficha");
  };

  const showMultiPdf = () => {
    const docs = ensureDocsSample();
    if (docs) setDocsPreview("pdf");
  };

  const ensureDxfSample = () => {
    if (dxfSample && technicalSample) return { dxf: dxfSample, technical: technicalSample };
    if (modeloAActive) {
      setDxfError("Desactive o Modelo A para gerar DXF / desenho tecnico do Modelo B.");
      return null;
    }
    setDxfError(null);
    const result = generateEuropeanDrawer(
      "hettich-innotech-atira",
      {
        id: "admin-dxf-sample",
        nome: "Amostra DXF",
        dimensoes: { largura: 538, altura: 720, profundidade: 560 },
        espessura: 19,
        gavetas: 1,
        material: "mdf_branco",
        profundidadeInternaUtilMm: 500,
      },
      {
        systemId: "hettich-innotech-atira",
        heightMm: 144,
        depthMm: 450,
        softClose: true,
        pushOpen: false,
        count: 1,
      }
    );
    if (!result.dxf || !result.technical) {
      setDxfError("generateEuropeanDrawer nao devolveu dxf/technical.");
      return null;
    }
    setDxfSample(result.dxf);
    setTechnicalSample(result.technical);
    if (result.docs) setDocsSample(result.docs);
    return { dxf: result.dxf, technical: result.technical };
  };

  const showTechnicalViews = () => {
    const sample = ensureDxfSample();
    if (sample) setDxfPreview("technical");
  };

  const showDxfStructure = () => {
    const sample = ensureDxfSample();
    if (sample) setDxfPreview("dxf");
  };

  const generatePhysicalDxfFiles = () => {
    if (modeloAActive) {
      setDxfError("Desactive o Modelo A para gerar DXF fisicos do Modelo B.");
      return;
    }
    setDxfFileBusy(true);
    setDxfError(null);
    try {
      const result = generateEuropeanDrawer(
        "hettich-innotech-atira",
        {
          id: "admin-dxf-file-sample",
          nome: "Amostra DXF File",
          dimensoes: { largura: 538, altura: 720, profundidade: 560 },
          espessura: 19,
          gavetas: 1,
          material: "mdf_branco",
          profundidadeInternaUtilMm: 500,
        },
        {
          systemId: "hettich-innotech-atira",
          heightMm: 144,
          depthMm: 450,
          softClose: true,
          pushOpen: false,
          count: 1,
        }
      );
      if (result.dxf) setDxfSample(result.dxf);
      if (result.technical) setTechnicalSample(result.technical);

      const prepared = prepareEuropeanDXFFiles(result, { prefix: "ADMIN_" });
      const report = buildDxfFileReport({
        outputDir: prepared.outputDir,
        files: prepared.files.map((f) => ({
          fileName: f.fileName,
          pieceCode: f.pieceCode,
          relativePath: `${prepared.outputDir}/${f.fileName}`,
          byteLength: new TextEncoder().encode(f.content).length,
          entityCount: f.entityCount,
          written: false,
        })),
        warnings: prepared.warnings,
        errors: prepared.errors,
      });
      setDxfFileReport(report);

      const contents = buildEuropeanDXFFileContents(result, { prefix: "ADMIN_" });
      for (const file of contents) {
        const blob = new Blob([file.content], { type: "application/dxf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setDxfError(err instanceof Error ? err.message : String(err));
    } finally {
      setDxfFileBusy(false);
    }
  };

  const generatePhysicalCncFiles = () => {
    if (modeloAActive) {
      setCncError("Desactive o Modelo A para gerar CNC do Modelo B.");
      return;
    }
    setCncFileBusy(true);
    setCncError(null);
    try {
      const result = generateEuropeanDrawer(
        "hettich-innotech-atira",
        {
          id: "admin-cnc-file-sample",
          nome: "Amostra CNC File",
          dimensoes: { largura: 538, altura: 720, profundidade: 560 },
          espessura: 19,
          gavetas: 1,
          material: "mdf_branco",
          profundidadeInternaUtilMm: 500,
        },
        {
          systemId: "hettich-innotech-atira",
          heightMm: 144,
          depthMm: 450,
          softClose: true,
          pushOpen: false,
          count: 1,
        }
      );

      const prepared = prepareEuropeanCNCFiles(result, {
        prefix: "ADMIN_",
        format: cncFormat,
      });
      const report = buildCncFileReport({
        outputDir: prepared.outputDir,
        format: prepared.format,
        files: prepared.files.map((f) => ({
          fileName: f.fileName,
          pieceCode: f.pieceCode,
          format: f.format,
          relativePath: `${prepared.outputDir}/${f.fileName}`,
          byteLength: new TextEncoder().encode(f.content).length,
          cutCount: f.cutCount,
          drillCount: f.drillCount,
          pocketCount: f.pocketCount,
          written: false,
        })),
        warnings: prepared.warnings,
        errors: prepared.errors,
        industrialIntegrityOk: prepared.industrialIntegrityOk,
      });
      setCncFileReport(report);

      const contents = buildEuropeanCNCFileContents(result, {
        prefix: "ADMIN_",
        format: cncFormat,
      });
      for (const file of contents) {
        const blob = new Blob([file.content], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setCncError(err instanceof Error ? err.message : String(err));
    } finally {
      setCncFileBusy(false);
    }
  };

  const ensureOverlaySample = () => {
    if (overlaySample) return overlaySample;
    if (modeloAActive) {
      setOverlayError("Desactive o Modelo A para gerar o MC Overlay do Modelo B.");
      return null;
    }
    setOverlayError(null);
    const result = generateEuropeanDrawer(
      "hettich-innotech-atira",
      {
        id: "admin-overlay-sample",
        nome: "Amostra Overlay",
        dimensoes: { largura: 538, altura: 720, profundidade: 560 },
        espessura: 19,
        gavetas: 2,
        material: "mdf_branco",
        profundidadeInternaUtilMm: 500,
      },
      {
        systemId: "hettich-innotech-atira",
        heightMm: 144,
        depthMm: 450,
        softClose: true,
        pushOpen: false,
        count: 2,
      }
    );
    if (!result.overlay) {
      setOverlayError("generateEuropeanDrawer nao devolveu overlay.");
      return null;
    }
    setOverlaySample(result.overlay);
    if (result.docs) setDocsSample(result.docs);
    if (result.dxf) setDxfSample(result.dxf);
    if (result.technical) setTechnicalSample(result.technical);
    return result.overlay;
  };

  const showOverlay = () => {
    const sample = ensureOverlaySample();
    if (sample) setOverlayOpen(true);
  };

  const ensureReleaseSample = () => {
    if (releaseSample) return releaseSample;
    if (modeloAActive) {
      setReleaseError("Desactive o Modelo A para gerar Release Notes do Modelo B.");
      return null;
    }
    setReleaseError(null);
    const result = generateEuropeanDrawer(
      "hettich-innotech-atira",
      {
        id: "admin-release-sample",
        nome: "Amostra Release",
        dimensoes: { largura: 538, altura: 720, profundidade: 560 },
        espessura: 19,
        gavetas: 1,
        material: "mdf_branco",
        profundidadeInternaUtilMm: 500,
      },
      {
        systemId: "hettich-innotech-atira",
        heightMm: 144,
        depthMm: 450,
        softClose: true,
        pushOpen: false,
        count: 1,
      }
    );
    if (!result.releaseNotes) {
      setReleaseError("generateEuropeanDrawer nao devolveu releaseNotes.");
      return null;
    }
    setReleaseSample(result.releaseNotes);
    if (result.docs) setDocsSample(result.docs);
    if (result.dxf) setDxfSample(result.dxf);
    if (result.technical) setTechnicalSample(result.technical);
    if (result.overlay) setOverlaySample(result.overlay);
    return result.releaseNotes;
  };

  const showReleaseNotes = () => {
    const sample = ensureReleaseSample();
    if (sample) setReleaseOpen(true);
  };

  const showIndustrialPricing = () => {
    if (modeloAActive) {
      setPricingError("Desactive o Modelo A para calcular o custo industrial do Modelo B.");
      return;
    }
    setPricingError(null);
    try {
      const result = generateEuropeanDrawer(
        "hettich-innotech-atira",
        {
          id: "admin-pricing-sample",
          nome: "Amostra Pricing",
          dimensoes: { largura: 538, altura: 720, profundidade: 560 },
          espessura: 19,
          gavetas: 1,
          material: "mdf_branco",
          profundidadeInternaUtilMm: 500,
        },
        {
          systemId: "hettich-innotech-atira",
          heightMm: 144,
          depthMm: 450,
          softClose: true,
          pushOpen: false,
          count: 1,
        }
      );
      if (!result.pricing) {
        setPricingError("generateEuropeanDrawer nao devolveu pricing.");
        return;
      }
      setPricingSample(result.pricing);
    } catch (err) {
      setPricingError(err instanceof Error ? err.message : String(err));
    }
  };

  const loadKitchenLibrary = () => {
    if (modeloAActive) {
      setKitchenError("Desactive o Modelo A para carregar a Kitchen Library com amostra Modelo B.");
      return;
    }
    setKitchenError(null);
    try {
      const lib = buildKitchenLibrary();
      setKitchenLib(lib);
      setKitchenOpen(true);
    } catch (err) {
      setKitchenError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div style={{ ...adminPageShellStyle, maxWidth: 1200 }}>
      <AdminPageHeader
        title="Gavetas ù Sistema Unificado"
        subtitle="Centro Admin: Modelo A (toggle), inventario, regras e catalogo europeu Modelo B."
      />

      <Panel
        title="Desativar Sistema Atual de Gavetas (Modelo A)"
        description="Quando activo, o Modelo A fica inactivo e o Modelo B (Sistema Europeu) assume UI/cutlist/PDF/viewer."
      >
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            padding: "12px 14px",
            borderRadius: 10,
            border: deactivated
              ? "1px solid rgba(248,113,113,0.45)"
              : "1px solid rgba(52,211,153,0.35)",
            background: deactivated ? "rgba(248,113,113,0.08)" : "rgba(52,211,153,0.08)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={deactivated}
            onChange={(event) => setDrawerModeloADeactivated(event.target.checked)}
            style={{ marginTop: 3 }}
          />
          <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <strong style={{ fontSize: 13 }}>
              Desativar Sistema Atual de Gavetas (Modelo A)
            </strong>
            <span style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.45 }}>
              Estado:{" "}
              <strong style={{ color: deactivated ? "#f87171" : "#34d399" }}>
                {deactivated ? "Modelo A OFF ? Modelo B activo" : "Modelo A ATIVO"}
              </strong>
            </span>
          </span>
        </label>
      </Panel>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {(
          [
            ["visao", "Visao geral"],
            ["regras", "Regras (Modelo A)"],
            ["mapa", "Mapa unificado"],
            ["modelo-b", "Modelo B (Europeu)"],
            ["kitchen", "Kitchen Library"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" style={tabBtn(section === id)} onClick={() => setSection(id)}>
            {label}
          </button>
        ))}
      </div>

      {section === "visao" ? (
        <>
          <Panel title="Resumo do mapeamento (Modelo A)" description="Estatisticas de DrawerSystemReference.ts">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {[
                { label: "Dominios", value: stats.domains },
                { label: "Regras", value: stats.rules },
                { label: "Oficiais", value: stats.official },
                { label: "Legado", value: stats.legacy },
                { label: "Inconsistencias", value: stats.inconsistencies },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.1)",
                    minWidth: 100,
                  }}
                >
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{item.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{item.value}</div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Inventario ù Modelo A" description="Referencia; nada e apagado ao desativar.">
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Area</th>
                    <th style={thStyle}>Local</th>
                    <th style={thStyle}>Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {MODELO_A_INVENTORY.map((row) => (
                    <tr key={row.area}>
                      <td style={tdStyle}>
                        <strong>{row.area}</strong>
                      </td>
                      <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 11 }}>{row.path}</td>
                      <td style={tdStyle}>{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Pipelines" description="Oficial vs legado (referencia)">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
              <ol style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6, flex: "1 1 280px" }}>
                <div style={{ fontWeight: 700, color: "#34d399", marginBottom: 6 }}>Pipeline oficial</div>
                {DRAWER_OFFICIAL_PIPELINE.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <ol style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6, flex: "1 1 280px" }}>
                <div style={{ fontWeight: 700, color: "#f87171", marginBottom: 6 }}>Pipeline legado</div>
                {DRAWER_LEGACY_PIPELINE.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          </Panel>
        </>
      ) : null}

      {section === "regras" ? <DrawerRulesAdminPage /> : null}
      {section === "mapa" ? <DrawerSystemUnifiedAdminPage /> : null}

      {section === "modelo-b" ? (
        <>
          <Panel
            title="Sistema Europeu de Gavetas ù Modelo B"
            description="Catalogo oficial implementado. Activo no projeto quando o Modelo A esta desactivado."
          >
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 0, lineHeight: 1.5 }}>
              API: <code>generateEuropeanDrawer(systemId, box)</code> ù measures, geometry, drilling, cutlist, PDF e
              viewer.
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Sistema</th>
                    <th style={thStyle}>Alturas</th>
                    <th style={thStyle}>Profundidades</th>
                    <th style={thStyle}>Folga</th>
                    <th style={thStyle}>Furos</th>
                  </tr>
                </thead>
                <tbody>
                  {europeanModels.map((m) => (
                    <tr key={m.id}>
                      <td style={tdStyle}>
                        <strong>{m.displayName}</strong>
                      </td>
                      <td style={tdStyle}>{m.heights.map((h) => h.label).join(", ")}</td>
                      <td style={tdStyle}>
                        {m.depthProfile.minMm}ù{m.depthProfile.maxMm} mm
                      </td>
                      <td style={tdStyle}>2ù{m.side.clearanceMm} mm</td>
                      <td style={tdStyle}>
                        {m.holePattern.setbackFrontMm} / {m.holePattern.bottomGapMm} / {m.holePattern.systemPitchMm}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel
            title="Documentaùùo Industrial (Modelo B)"
            description="Camada adicional Fase 11 ù ficha tùcnica + PDF multi-pùginas (estrutura). Nùo substitui o PDF industrial existente."
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <button type="button" className="button" disabled={modeloAActive} onClick={showFicha}>
                Ver ficha tùcnica
              </button>
              <button
                type="button"
                className="button button-ghost"
                disabled={modeloAActive}
                onClick={showMultiPdf}
              >
                Ver PDF multi-pùginas (estrutura)
              </button>
              {docsSample?.report ? (
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {docsSample.report.status} ù {docsSample.report.piecesDocumented} peùas ù{" "}
                  {docsSample.report.holesDocumented} furos ù {docsSample.report.logicalPages} pùgs
                </span>
              ) : null}
            </div>
            {docsError ? (
              <div style={{ marginTop: 10, fontSize: 12, color: "#fca5a5" }}>{docsError}</div>
            ) : null}
            {docsPreview && docsSample ? (
              <pre
                style={{
                  marginTop: 12,
                  maxHeight: 360,
                  overflow: "auto",
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(0,0,0,0.25)",
                  fontSize: 11,
                  lineHeight: 1.4,
                }}
              >
                {JSON.stringify(
                  docsPreview === "ficha" ? docsSample.fichaTecnica : docsSample.multiPagePdf,
                  null,
                  2
                )}
              </pre>
            ) : null}
          </Panel>

          <Panel
            title="Desenho Tecnico & DXF"
            description="Camada adicional Fase 12 ù vistas industriais + estrutura DXF em memoria. Nao altera viewer 3D nem PDF industrial."
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <button type="button" className="button" disabled={modeloAActive} onClick={showTechnicalViews}>
                Ver vistas tecnicas
              </button>
              <button
                type="button"
                className="button button-ghost"
                disabled={modeloAActive}
                onClick={showDxfStructure}
              >
                Ver estrutura DXF
              </button>
              {dxfSample?.report ? (
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {dxfSample.report.status} ù {dxfSample.report.contourCount} contornos ù{" "}
                  {dxfSample.report.holeEntityCount} furos ù {dxfSample.report.viewCount} vistas
                </span>
              ) : null}
            </div>
            {dxfError ? (
              <div style={{ marginTop: 10, fontSize: 12, color: "#fca5a5" }}>{dxfError}</div>
            ) : null}
            {dxfPreview && dxfSample && technicalSample ? (
              <pre
                style={{
                  marginTop: 12,
                  maxHeight: 360,
                  overflow: "auto",
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(0,0,0,0.25)",
                  fontSize: 11,
                  lineHeight: 1.4,
                }}
              >
                {JSON.stringify(
                  dxfPreview === "technical"
                    ? {
                        title: technicalSample.title,
                        viewIds: technicalSample.viewIds,
                        views: technicalSample.views.map((v) => ({
                          id: v.id,
                          title: v.title,
                          widthMm: v.widthMm,
                          heightMm: v.heightMm,
                          measures: v.measures,
                          industrialCodes: v.industrialCodes,
                          entityCount: v.entities.length,
                        })),
                      }
                    : {
                        title: dxfSample.title,
                        report: dxfSample.report,
                        metadata: dxfSample.metadata,
                        layers: dxfSample.document.layers,
                        contourCount: dxfSample.document.contourCount,
                        holeEntityCount: dxfSample.document.holeEntityCount,
                        entityCount: dxfSample.document.entities.length,
                        entityTypes: {
                          LINE: dxfSample.document.entities.filter((e) => e.type === "LINE").length,
                          CIRCLE: dxfSample.document.entities.filter((e) => e.type === "CIRCLE").length,
                          TEXT: dxfSample.document.entities.filter((e) => e.type === "TEXT").length,
                        },
                      },
                  null,
                  2
                )}
              </pre>
            ) : null}
          </Panel>

          <Panel
            title="Exportacao DXF fisica"
            description="Fase 16 ù gera ficheiros .dxf reais a partir de result.dxf (em memoria). No browser faz download; em Node escreve em exports/dxf/european/."
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <button
                type="button"
                className="button"
                disabled={modeloAActive || dxfFileBusy}
                onClick={generatePhysicalDxfFiles}
              >
                {dxfFileBusy ? "A gerarù" : "Gerar DXF (ficheiros)"}
              </button>
              {dxfFileReport ? (
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {dxfFileReport.status} ù {dxfFileReport.files.length} ficheiros ù{" "}
                  {dxfFileReport.totalBytes} bytes ù {dxfFileReport.outputDir}
                </span>
              ) : null}
            </div>
            {dxfFileReport ? (
              <ul style={{ marginTop: 10, paddingLeft: 18, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.45 }}>
                {dxfFileReport.files.map((f) => (
                  <li key={f.fileName}>
                    {f.fileName} ù {f.relativePath} ({f.byteLength} B, {f.pieceCode})
                  </li>
                ))}
              </ul>
            ) : null}
          </Panel>

          <Panel
            title="Exportacao CNC (Modelo B)"
            description="Fase 17 ù gera ficheiros CNC fùsicos a partir de geometry + holes + dxf. Formatos: cnc/xml/mpr/cix/bpp. No browser faz download; em Node escreve em exports/cnc/european/."
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <label style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Formato{" "}
                <select
                  value={cncFormat}
                  disabled={modeloAActive || cncFileBusy}
                  onChange={(e) => setCncFormat(e.target.value as EuropeanCncFormat)}
                  style={{ marginLeft: 6, fontSize: 12 }}
                >
                  {CNC_FORMAT_OPTIONS.map((fmt) => (
                    <option key={fmt} value={fmt}>
                      .{fmt}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="button"
                disabled={modeloAActive || cncFileBusy}
                onClick={generatePhysicalCncFiles}
              >
                {cncFileBusy ? "A gerarù" : "Gerar ficheiros CNC"}
              </button>
              {cncFileReport ? (
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {cncFileReport.status} ù {cncFileReport.files.length} ficheiros ù CUT{" "}
                  {cncFileReport.totalCutOps} / DRILL {cncFileReport.totalDrillOps} ù{" "}
                  {cncFileReport.outputDir}
                </span>
              ) : null}
            </div>
            {cncError ? (
              <p style={{ marginTop: 8, fontSize: 11, color: "#f87171" }}>{cncError}</p>
            ) : null}
            {cncFileReport ? (
              <ul style={{ marginTop: 10, paddingLeft: 18, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.45 }}>
                {cncFileReport.files.map((f) => (
                  <li key={f.fileName}>
                    {f.fileName} ù {f.relativePath} (CUT {f.cutCount}, DRILL {f.drillCount}, {f.byteLength} B)
                  </li>
                ))}
              </ul>
            ) : null}
          </Panel>

          <Panel
            title="MC Overlay Avancado"
            description="Camada adicional Fase 13 ù medidas internas, aberturas, gaps, remates e roda-pe. Integrado com DXF e vistas tecnicas."
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <button type="button" className="button" disabled={modeloAActive} onClick={showOverlay}>
                Ver MC Overlay
              </button>
              {overlaySample?.report ? (
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {overlaySample.report.status} ù {overlaySample.report.aberturaCount} aberturas ù{" "}
                  {overlaySample.report.gapCount} gaps ù {overlaySample.report.remateCount} remates
                </span>
              ) : null}
            </div>
            {overlayError ? (
              <div style={{ marginTop: 10, fontSize: 12, color: "#fca5a5" }}>{overlayError}</div>
            ) : null}
            {overlayOpen && overlaySample ? (
              <pre
                style={{
                  marginTop: 12,
                  maxHeight: 360,
                  overflow: "auto",
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(0,0,0,0.25)",
                  fontSize: 11,
                  lineHeight: 1.4,
                }}
              >
                {JSON.stringify(
                  {
                    report: overlaySample.report,
                    measures: overlaySample.measures,
                    aberturas: overlaySample.aberturas,
                    gaps: {
                      betweenDrawersMm: overlaySample.gaps.betweenDrawersMm,
                      frontToBodyMm: overlaySample.gaps.frontToBodyMm,
                      lateralLeftMm: overlaySample.gaps.lateralLeftMm,
                      lateralRightMm: overlaySample.gaps.lateralRightMm,
                      industrialMinimumMm: overlaySample.gaps.industrialMinimumMm,
                      superiorMm: overlaySample.gaps.superiorMm,
                      inferiorMm: overlaySample.gaps.inferiorMm,
                      items: overlaySample.gaps.items,
                    },
                    remates: overlaySample.remates,
                    rodape: overlaySample.rodape,
                    dxfIntegration: overlaySample.dxfIntegration,
                    technicalIntegration: overlaySample.technicalIntegration,
                  },
                  null,
                  2
                )}
              </pre>
            ) : null}
          </Panel>

          <Panel
            title="Release Notes (Modelo B)"
            description="Camada adicional Fase 14 ù geracao automatica de notes industriais (B.v3.14). Nao altera pipeline industrial."
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <button type="button" className="button" disabled={modeloAActive} onClick={showReleaseNotes}>
                Ver Release Notes
              </button>
              {releaseSample ? (
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {releaseSample.version} ù {releaseSample.report.status} ù{" "}
                  {releaseSample.eventsCollected} eventos ù {releaseSample.author}
                </span>
              ) : null}
            </div>
            {releaseError ? (
              <div style={{ marginTop: 10, fontSize: 12, color: "#fca5a5" }}>{releaseError}</div>
            ) : null}
            {releaseOpen && releaseSample ? (
              <pre
                style={{
                  marginTop: 12,
                  maxHeight: 360,
                  overflow: "auto",
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(0,0,0,0.25)",
                  fontSize: 11,
                  lineHeight: 1.4,
                  whiteSpace: "pre-wrap",
                }}
              >
                {releaseSample.text}
              </pre>
            ) : null}
          </Panel>

          <Panel
            title="Custo Industrial (Modelo B / Kitchen Library)"
            description="Fase 18 ù motor de custo industrial (materiais, ops, CNC, montagem, mùo de obra, overhead, margem). Camada somente-leitura."
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <button
                type="button"
                className="button"
                disabled={modeloAActive}
                onClick={showIndustrialPricing}
              >
                Calcular custo industrial
              </button>
              {pricingSample ? (
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {pricingSample.report.status} ù custo {pricingSample.totals.costIndustrial}{" "}
                  {pricingSample.currency} ù preùo {pricingSample.totals.priceFinal}{" "}
                  {pricingSample.currency} ù margem{" "}
                  {Math.round(pricingSample.margin.marginPercent * 100)}%
                </span>
              ) : null}
            </div>
            {pricingError ? (
              <p style={{ marginTop: 8, fontSize: 11, color: "#f87171" }}>{pricingError}</p>
            ) : null}
            {pricingSample ? (
              <ul style={{ marginTop: 10, paddingLeft: 18, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.45 }}>
                <li>
                  Custo por gaveta: {pricingSample.totals.costPerDrawer} {pricingSample.currency}
                </li>
                <li>
                  Custo por mùdulo: {pricingSample.totals.costPerModule} {pricingSample.currency}
                </li>
                <li>
                  Custo total: {pricingSample.totals.costIndustrial} {pricingSample.currency}
                </li>
                <li>
                  Materiais {pricingSample.materials.totalWoodCost} ù Ops{" "}
                  {pricingSample.operations.totalCost} ù CNC {pricingSample.cnc.totalCost} ù Montagem{" "}
                  {pricingSample.assembly.totalCost} ù Labor {pricingSample.labor.totalCost} ù Overhead{" "}
                  {pricingSample.overhead.totalCost}
                </li>
                <li>
                  Preùo final: {pricingSample.totals.priceFinal} {pricingSample.currency} (gaveta{" "}
                  {pricingSample.totals.pricePerDrawer} / mùdulo {pricingSample.totals.pricePerModule})
                </li>
              </ul>
            ) : null}
          </Panel>

          <Panel
            title="Auto QA ù Stress Testing (Modelo B)"
            description={`${ALL_SCENARIOS.length} cenarios industriais. Simulacao pura: sem CNC, sem industrial/**, sem alterar o projeto.`}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <button
                type="button"
                className="button"
                disabled={qaRunning || modeloAActive}
                onClick={() => void runAutoQa()}
              >
                {qaRunning ? "A executarù" : "Executar testes automùticos"}
              </button>
              {qaResults && qaSummary ? (
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => downloadQaResultsJson(qaResults, qaSummary)}
                >
                  Descarregar qa-results.json
                </button>
              ) : null}
              {modeloAActive ? (
                <span style={{ fontSize: 11, color: "#f87171" }}>
                  Requisito: desactivar Modelo A para correr o QA.
                </span>
              ) : null}
            </div>

            {qaProgress ? (
              <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-muted)" }}>
                Progresso: {qaProgress.index}/{qaProgress.total}
                {qaRunning ? "ù" : " (concluùdo)"}
              </div>
            ) : null}

            {qaError ? (
              <div style={{ marginTop: 10, fontSize: 12, color: "#fca5a5" }}>{qaError}</div>
            ) : null}

            {qaSummary ? (
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {[
                    { label: "Vùlidos", value: `${qaSummary.pctValid}%`, color: "#34d399" },
                    { label: "Invùlidos", value: `${qaSummary.pctInvalid}%`, color: "#f87171" },
                    { label: "AutoFix", value: `${qaSummary.pctAutoFixed}%`, color: "#93c5fd" },
                    { label: "Ran / Skip", value: `${qaSummary.ran}/${qaSummary.skipped}`, color: "var(--text)" },
                  ].map((card) => (
                    <div
                      key={card.label}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "1px solid rgba(255,255,255,0.1)",
                        minWidth: 110,
                      }}
                    >
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{card.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: card.color }}>{card.value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <strong style={{ fontSize: 12 }}>Top 10 erros</strong>
                    <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.45 }}>
                      {qaSummary.topErrors.length === 0 ? <li>Nenhum</li> : null}
                      {qaSummary.topErrors.map((e) => (
                        <li key={e.message}>
                          [{e.count}] {e.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <strong style={{ fontSize: 12 }}>Top 10 avisos</strong>
                    <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.45 }}>
                      {qaSummary.topWarnings.length === 0 ? <li>Nenhum</li> : null}
                      {qaSummary.topWarnings.map((w) => (
                        <li key={w.message}>
                          [{w.count}] {w.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, fontSize: 11 }}>
                  <div>
                    <strong>Modelos c/ falhas</strong>
                    <ul style={{ margin: "6px 0 0", paddingLeft: 18, color: "var(--text-muted)" }}>
                      {qaSummary.failuresByModel.slice(0, 6).map((m) => (
                        <li key={m.modelId}>
                          {m.modelId}: {m.failures}/{m.total}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <strong>Profundidades c/ falhas</strong>
                    <ul style={{ margin: "6px 0 0", paddingLeft: 18, color: "var(--text-muted)" }}>
                      {qaSummary.failuresByDepth.slice(0, 6).map((d) => (
                        <li key={d.profundidadeInternaMm}>
                          {d.profundidadeInternaMm} mm: {d.failures}/{d.total}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <strong>Larguras c/ falhas</strong>
                    <ul style={{ margin: "6px 0 0", paddingLeft: 18, color: "var(--text-muted)" }}>
                      {qaSummary.failuresByWidth.slice(0, 6).map((w) => (
                        <li key={w.larguraInternaMm}>
                          {w.larguraInternaMm} mm: {w.failures}/{w.total}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : null}
          </Panel>
        </>
      ) : null}

      {section === "kitchen" ? (
        <Panel
          title="Kitchen Library (Industrial)"
          description="Fase 15 / PIMO.PRO-V5 Fase 10 ù biblioteca documental de mùdulos, frentes, portas, gavetas Modelo B, remates e roda-pù."
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <button type="button" className="button" disabled={modeloAActive} onClick={loadKitchenLibrary}>
              Carregar Kitchen Library
            </button>
            {kitchenLib ? (
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {kitchenLib.version} ù {kitchenLib.report.status} ù {kitchenLib.report.moduleCount} mùdulos ù{" "}
                {kitchenLib.report.frontCount} frentes ù {kitchenLib.report.doorCount} portas
              </span>
            ) : null}
          </div>
          {kitchenError ? (
            <div style={{ marginTop: 10, fontSize: 12, color: "#fca5a5" }}>{kitchenError}</div>
          ) : null}
          {kitchenOpen && kitchenLib ? (
            <pre
              style={{
                marginTop: 12,
                maxHeight: 420,
                overflow: "auto",
                padding: 12,
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(0,0,0,0.25)",
                fontSize: 11,
                lineHeight: 1.4,
              }}
            >
              {JSON.stringify(
                {
                  report: kitchenLib.report,
                  version: kitchenLib.version,
                  modules: {
                    base: kitchenLib.modules.base.length,
                    tall: kitchenLib.modules.tall.length,
                    upper: kitchenLib.modules.upper.length,
                    corner: kitchenLib.modules.corner.length,
                    ids: kitchenLib.modules.all.map((m) => m.id),
                  },
                  fronts: kitchenLib.fronts.map((f) => f.id),
                  doors: kitchenLib.doors.map((d) => d.id),
                  remates: kitchenLib.remates,
                  rodape: kitchenLib.rodape,
                  drawers: kitchenLib.drawers.modeloB,
                  integrations: kitchenLib.integrations,
                  rules: kitchenLib.rules,
                },
                null,
                2
              )}
            </pre>
          ) : null}
        </Panel>
      ) : null}
    </div>
  );
}

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  borderBottom: "1px solid rgba(255,255,255,0.12)",
  color: "var(--text-muted)",
  fontWeight: 600,
  fontSize: 11,
};

const tdStyle: CSSProperties = {
  padding: "8px 10px",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  verticalAlign: "top",
};
