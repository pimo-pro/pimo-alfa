import { useState } from "react";
import { useProject } from "../../../context/useProject";
import { useToolbarModal } from "../../../context/ToolbarModalContext";
import { useToast } from "../../../context/ToastContext";
import { useSettings } from "../../../context/SettingsContext";
import {
  cutlistComPrecoFromBoxes,
} from "../../../core/manufacturing/cutlistFromBoxes";
import { buildTechnicalPdf } from "../../../core/pdf/pdfTechnical";
import { buildCutlistPdf } from "../../../core/pdf/pdfCutlist";
import { buildUnifiedPdf } from "../../../core/pdf/pdfUnified";
import { buildEtiquetasPdf } from "../../../core/pdf/pdfEtiquetas";
import { runCutLayout, cutlistToPieces } from "../../../core/cutlayout/cutLayoutEngine";
import { buildCncFromCutlistItems, getSheetDefinitionFromSettings } from "../../../core/cnc/cncPipeline";
import type { GerarArquivoConteudo } from "./GerarArquivoModal";
import GerarArquivoModal from "./GerarArquivoModal";
import BoxLayersPanel from "./BoxLayersPanel";

export default function RightPanel() {
  const { project, actions } = useProject();
  useSettings();
  const { openModal } = useToolbarModal();
  const { showToast } = useToast();
  const boxes = project.boxes ?? [];
  const hasBoxes = boxes.length > 0;
  const slug = (project.projectName || "projeto").replace(/[^\p{L}\p{N}\s_-]/gu, "").replace(/\s+/g, "_") || "projeto";
  const [showGerarArquivoModal, setShowGerarArquivoModal] = useState(false);

  const handleGerarArquivoConfirm = (opcoes: { conteudo: GerarArquivoConteudo; download: boolean }) => {
  if (!opcoes.download || !hasBoxes) return;

  if (opcoes.conteudo === "cutlist") {
    actions.exportarPDF();
    return;
  }

  if (opcoes.conteudo === "tecnico") {
    actions.exportarPdfTecnico();
    return;
  }

  if (opcoes.conteudo === "ambos") {
    actions.exportarPDF();
    actions.exportarPdfTecnico();
    actions.exportarPdfUnificado();
  }
};

  const pdfProject = () => ({
    projectName: project.projectName ?? "Projeto",
    boxes,
    rules: project.rules,
    materialId: project.materialId,
    extractedPartsByBoxId: project.extractedPartsByBoxId ?? {},
  });

  const onPdfTecnico = () => {
    if (!hasBoxes) {
      showToast("Nenhuma caixa no projeto. Gere o design primeiro.", "warning");
      return;
    }
    const doc = buildTechnicalPdf(pdfProject());
    doc.save(`${slug}_tecnico.pdf`);
  };

  const onCutlist = () => {
    if (!hasBoxes) {
      showToast("Nenhuma caixa no projeto. Gere o design primeiro.", "warning");
      return;
    }
    const doc = buildCutlistPdf(pdfProject());
    doc.save(`${slug}_cutlist.pdf`);
  };

  const onAmbos = () => {
    if (!hasBoxes) {
      showToast("Nenhuma caixa no projeto. Gere o design primeiro.", "warning");
      return;
    }
    const doc = buildUnifiedPdf(pdfProject());
    doc.save(`${slug}_completo.pdf`);
  };

  const onEtiquetas = () => {
    if (!hasBoxes) {
      showToast("Nenhuma caixa no projeto. Gere o design primeiro.", "warning");
      return;
    }
    const doc = buildEtiquetasPdf(pdfProject());
    doc.save(`${slug}_etiquetas.pdf`);
  };


  const onLayoutCorte = async () => {
    if (!hasBoxes) {
      showToast("Nenhuma caixa no projeto. Gere o design primeiro.", "warning");
      return;
    }
    const parametric = cutlistComPrecoFromBoxes(
      boxes,
      project.rules,
      project.materialId,
      project.projectName
    );
    const extracted = boxes.flatMap((b) =>
      Object.values(project.extractedPartsByBoxId?.[b.id] ?? {}).flat()
    );
    const allItems = [...parametric, ...extracted].map((p) => ({ ...p, boxId: p.boxId ?? "" }));
    const pieces = cutlistToPieces(allItems);
    if (pieces.length === 0) {
      showToast("Nenhuma peça na cutlist para o layout de corte.", "warning");
      return;
    }
    const result = runCutLayout(pieces, getSheetDefinitionFromSettings(), {
      rotationPreferenceMode: "aggressive",
      rotationWeight: 0.8,
      rotationPenalty: 0.45,
    });
    const { buildCutLayoutPdf } = await import("../../../core/cutlayout/cutLayoutPdf");
const doc = buildCutLayoutPdf(result);
    doc.save(`${slug}_layout_corte.pdf`);
  };

  const onExportarCnc = async () => {
    if (!hasBoxes) {
      showToast("Nenhuma caixa no projeto. Gere o design primeiro.", "warning");
      return;
    }
    const parametric = cutlistComPrecoFromBoxes(
      boxes,
      project.rules,
      project.materialId,
      project.projectName
    );
    const extracted = boxes.flatMap((b) =>
      Object.values(project.extractedPartsByBoxId?.[b.id] ?? {}).flat()
    );
    const allItems = [...parametric, ...extracted].map((p) => ({ ...p, boxId: p.boxId ?? "" }));
    const cncBundle = buildCncFromCutlistItems(project, allItems);
    if (!cncBundle) {
      showToast("Nenhuma peça na cutlist para exportar CNC.", "warning");
      return;
    }
    const cnc = cncBundle.cnc;
    const urls: string[] = [];
    for (const file of cnc.files) {
      const base = file.filenameBase || `${slug}_panel_${file.panelIndex}`;
      const tcnBlob = new Blob([file.tcn], { type: "text/plain" });
      const kdtBlob = new Blob([file.kdt], { type: "text/xml" });
      const tcnUrl = URL.createObjectURL(tcnBlob);
      const kdtUrl = URL.createObjectURL(kdtBlob);
      urls.push(tcnUrl, kdtUrl);
      const link1 = document.createElement("a");
      link1.href = tcnUrl;
      link1.download = `${base}.tcn`;
      link1.click();
      const link2 = document.createElement("a");
      link2.href = kdtUrl;
      link2.download = `${base}.kdt`;
      link2.click();
    }
    setTimeout(() => urls.forEach((u) => URL.revokeObjectURL(u)), 500);
  };

  return (
    <aside className="panel-content panel-content--side">
      <div className="design-panel-header">
        <div className="section-title">Ações</div>
        <p className="design-panel-subtitle">Exportação e operações do projeto atual.</p>
      </div>

      <div className="stack-tight">
        {/* Gerar Design 3D */}
        <button
          onClick={() => actions.gerarDesign()}
          disabled={project.estaCarregando}
          className="button button-primary"
          style={{
            background: project.estaCarregando
              ? "rgba(59, 130, 246, 0.5)"
              : "var(--blue-light)",
            cursor: project.estaCarregando ? "not-allowed" : "pointer",
          }}
        >
          {project.estaCarregando ? "A Calcular..." : "Gerar Design 3D"}
        </button>

        <button
          type="button"
          className="button button-ghost"
          style={{ width: "100%", marginBottom: 8 }}
          onClick={() => openModal("image")}
        >
          Abrir Photo Mode
        </button>

        <button
          onClick={() => setShowGerarArquivoModal(true)}
          className="button button-primary"
          style={{
            width: "100%",
            background: "linear-gradient(90deg, #22c55e, #38bdf8)",
          }}
        >
          Gerar Arquivo
        </button>

        {showGerarArquivoModal && (
          <GerarArquivoModal
            onClose={() => setShowGerarArquivoModal(false)}
            onConfirm={handleGerarArquivoConfirm}
            hasBoxes={hasBoxes}
            onPdfTecnico={onPdfTecnico}
            onCutlist={onCutlist}
            onAmbos={onAmbos}
            onLayoutCorte={onLayoutCorte}
            onEtiquetas={onEtiquetas}
            onExportarCnc={onExportarCnc}
          />
        )}

        <BoxLayersPanel />

      </div>
    </aside>
  );
}
