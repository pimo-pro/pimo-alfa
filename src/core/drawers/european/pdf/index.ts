/**
 * pdf/ — Secao PDF do Sistema Europeu (Modelo B).
 * Modulo proprio — nao altera o pipeline PDF do Modelo A.
 */

import type {
  DrawerCutlistItem,
  DrawerGeometry,
  DrawerPDFSection,
  EuropeanDrawerHole,
  DrawerEuropeanModel,
  EuropeanDrawerBoxConfig,
} from "../types";

export function buildEuropeanDrawerPdfSection(params: {
  model: DrawerEuropeanModel;
  config: EuropeanDrawerBoxConfig;
  geometry: DrawerGeometry;
  cutlist: DrawerCutlistItem[];
  holes: EuropeanDrawerHole[];
  boxName?: string;
}): DrawerPDFSection {
  const { model, config, geometry, cutlist, holes, boxName } = params;

  return {
    title: `Gavetas Europeias — ${model.displayName}${boxName ? ` (${boxName})` : ""}`,
    measureRows: [
      { label: "Sistema", value: model.displayName },
      { label: "Altura sistema", value: `${config.heightMm} mm${config.heightCode ? ` (${config.heightCode})` : ""}` },
      { label: "Profundidade runner", value: `${geometry.runnerDepthMm} mm` },
      { label: "Largura interna corpo", value: `${geometry.internalWidthMm.toFixed(1)} mm` },
      { label: "Folga lateral (cada lado)", value: `${model.side.clearanceMm} mm` },
      { label: "Frente", value: `${geometry.front.widthMm.toFixed(1)} x ${geometry.front.heightMm.toFixed(1)} x ${geometry.front.thicknessMm} mm` },
      { label: "Fundo", value: `${geometry.bottom.widthMm.toFixed(1)} x ${geometry.bottom.depthMm.toFixed(1)} x ${geometry.bottom.thicknessMm} mm` },
      { label: "Soft-Close", value: config.softClose ? "Sim" : "Nao" },
      { label: "Push-Open", value: config.pushOpen ? "Sim" : "Nao" },
    ],
    pieceRows: cutlist.map((p) => ({
      nome: p.nome,
      qty: String(p.quantidade),
      dims: `${p.larguraMm.toFixed(0)} x ${p.alturaMm.toFixed(0)} x ${p.espessuraMm.toFixed(0)}`,
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
      ...model.assembly.warnings,
      `Setback frontal ${model.holePattern.setbackFrontMm} mm; bottom gap ${model.holePattern.bottomGapMm} mm; sistema ${model.holePattern.systemPitchMm} mm`,
      ...model.assembly.order,
    ],
    explodedViewNotes: [
      "1. Frente (exterior) — Z+",
      "2. Caixa metalica / laterais do sistema",
      "3. Fundo encaixado",
      "4. Corredicas nas laterais do modulo (X = setback + 32 mm)",
      "Vista explodida: coordenadas locais em mm (ver tabela de furos).",
    ],
  };
}

/**
 * Desenha a secao no jsPDF (API minima, sem depender do Modelo A).
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
  doc.text("Pecas", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  for (const row of section.pieceRows) {
    doc.text(`${row.qty}x ${row.nome} — ${row.dims} — ${row.material}`, margin, y);
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
