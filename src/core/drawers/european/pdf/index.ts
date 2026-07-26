/**
 * pdf/  Seco PDF do Sistema Europeu (Modelo B).
 */

import type {
  DrawerCutlistItem,
  DrawerGeometry,
  DrawerPDFSection,
  EuropeanDrawerHole,
  DrawerEuropeanModel,
  EuropeanDrawerBoxConfig,
} from "../types";
import { EUROPEAN_SIDE_CLEARANCE_EACH_MM } from "../measures";
import { memo } from "../perf/memo";

function buildEuropeanDrawerPdfSectionCore(params: {
  model: DrawerEuropeanModel;
  config: EuropeanDrawerBoxConfig;
  geometry: DrawerGeometry;
  cutlist: DrawerCutlistItem[];
  holes: EuropeanDrawerHole[];
  boxName?: string;
}): DrawerPDFSection {
  const { model, config, geometry, cutlist, holes, boxName } = params;

  return {
    title: `Gavetas Europeias  ${model.displayName}${boxName ? ` (${boxName})` : ""}`,
    measureRows: [
      { label: "Sistema", value: model.displayName },
      {
        label: "Altura sistema",
        value: `${config.heightMm} mm${config.heightCode ? ` (${config.heightCode})` : ""}`,
      },
      { label: "Corredia Hettich", value: `${geometry.runnerDepthMm} mm` },
      { label: "Profundidade corpo (sem frente)", value: `${geometry.bodyDepthMm} mm` },
      { label: "Largura externa gaveta", value: `${geometry.externalWidthMm.toFixed(1)} mm` },
      { label: "Largura interna corpo", value: `${geometry.internalWidthMm.toFixed(1)} mm` },
      {
        label: "Folga lateral (cada lado)",
        value: `${EUROPEAN_SIDE_CLEARANCE_EACH_MM} mm`,
      },
      {
        label: "Frente",
        value: `${geometry.front.widthMm.toFixed(1)}  ${geometry.front.heightMm.toFixed(1)}  ${geometry.front.thicknessMm} mm`,
      },
      {
        label: "Fundo",
        value: `${geometry.bottom.widthMm.toFixed(1)}  ${geometry.bottom.depthMm.toFixed(1)}  ${geometry.bottom.thicknessMm} mm`,
      },
      { label: "Soft-Close", value: config.softClose ? "Sim" : "No" },
      { label: "Push-Open", value: config.pushOpen ? "Sim" : "No" },
      { label: "Frente dupla", value: config.dualFront ? "Sim (gav_fre_int)" : "No" },
    ],
    pieceRows: cutlist.map((p) => ({
      nome: p.codigo ? `${p.nome} [${p.codigo}]` : p.nome,
      qty: String(p.quantidade),
      dims: `${p.larguraMm.toFixed(0)}  ${p.alturaMm.toFixed(0)}  ${p.espessuraMm.toFixed(0)}`,
      material: p.material,
    })),
    holeRows: holes.map((h) => ({
      peca: h.pieceRef,
      x: h.x.toFixed(1),
      y: h.y.toFixed(1),
      d: h.diameter.toFixed(1),
      depth: h.depth.toFixed(1),
      tipo: h.holeType,
    })),
    notes: [
      "Corredias Hettich: 300600 mm (passo 50); sempre < profundidade til interna.",
      "Largura externa = interna caixa ? 14 mm; corpo = corredia ? 10 mm.",
      "Drill laterais/costa: pipeline Modelo A (DrawerDrillingRules).",
      ...model.assembly.warnings,
      ...model.assembly.order,
    ],
    explodedViewNotes: [
      "1. Frente externa (gav_fren)  material independente, fora da caixa",
      "2. Frente int opcional (gav_fre_int)",
      "3. Laterais (gav_lat_esq / gav_lat_dir) 16 mm",
      "4. Costa (gav_costa) 16 mm",
      "5. Fundo (gav_fun) 10 mm",
      "6. Corredias Hettich nas laterais do mdulo",
    ],
  };
}

/** PDF section memoizado (tabelas/medidas/furos). */
export const buildEuropeanDrawerPdfSection = memo(buildEuropeanDrawerPdfSectionCore, {
  namespace: "eu.pdf",
  maxSize: 128,
});

/**
 * Desenha a seco no jsPDF (API mnima).
 */
export function appendEuropeanDrawerPdfSection(
  doc: {
    addPage: (_format?: string, _orientation?: string) => void;
    setFontSize: (_n: number) => void;
    setFont: (_name: string, _style: string) => void;
    text: (_t: string, _x: number, _y: number) => void;
  },
  section: DrawerPDFSection,
  margin = 14
): void {
  doc.addPage("a4", "portrait");
  let y = margin;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(section.title, margin, y);
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  doc.setFont("helvetica", "bold");
  doc.text("Medidas", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  for (const row of section.measureRows) {
    doc.text(`${row.label}: ${row.value}`, margin, y);
    y += 5;
    if (y > 280) {
      doc.addPage("a4", "portrait");
      y = margin;
    }
  }

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.text("Peas", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  for (const row of section.pieceRows) {
    doc.text(`${row.qty}x ${row.nome}  ${row.dims}  ${row.material}`, margin, y);
    y += 5;
    if (y > 280) {
      doc.addPage("a4", "portrait");
      y = margin;
    }
  }

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.text("Furos", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  for (const row of section.holeRows) {
    doc.text(`${row.peca}: X=${row.x} Y=${row.y} D=${row.d} Prof=${row.depth} (${row.tipo})`, margin, y);
    y += 5;
    if (y > 280) {
      doc.addPage("a4", "portrait");
      y = margin;
    }
  }

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.text("Notas / Vista explodida", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  for (const note of [...section.explodedViewNotes, ...section.notes]) {
    const line = note.length > 95 ? `${note.slice(0, 92)}...` : note;
    doc.text(line, margin, y);
    y += 5;
    if (y > 280) {
      doc.addPage("a4", "portrait");
      y = margin;
    }
  }
}
