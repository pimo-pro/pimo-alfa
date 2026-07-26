/**
 * fichaTecnicaBuilder.ts — Ficha Técnica Industrial (estrutura de dados JSON).
 */

import type { EuropeanDrawerResult } from "../types";
import {
  buildEuropeanIndustrialMetadata,
  type EuropeanIndustrialMetadata,
} from "./industrialMetadata";
import {
  fmtM2,
  fmtMm,
  keyValueBlock,
  sectionHeader,
  tableBlock,
  textBlock,
  type DocsSection,
} from "./technicalSections";
import type { EuropeanDrawerBoxInput } from "../types";

export type EuropeanFichaTecnica = {
  title: string;
  generatedAt: string;
  metadata: EuropeanIndustrialMetadata;
  sections: DocsSection[];
};

/**
 * Constrói ficha técnica industrial somente a partir do resultado (leitura).
 */
export function buildFichaTecnica(
  result: EuropeanDrawerResult,
  box?: EuropeanDrawerBoxInput
): EuropeanFichaTecnica {
  const metadata = buildEuropeanIndustrialMetadata(result, box);
  const geo = result.geometry;

  const identification = sectionHeader("identificacao", "1. Identificação do produto", [
    keyValueBlock([
      { label: "Sistema", value: "Modelo B — Gaveta europeia" },
      { label: "Modelo", value: metadata.modelDisplayName },
      { label: "Marca", value: metadata.brand },
      { label: "Corrediça", value: metadata.runnerFamily },
      { label: "Nº gavetas", value: String(metadata.drawerCount) },
      {
        label: "Altura utilizada",
        value: `${fmtMm(metadata.heightUsedMm)}${metadata.heightCode ? ` (${metadata.heightCode})` : ""}`,
      },
      {
        label: "Alturas catálogo",
        value: metadata.catalogHeightsMm.map((h) => `${h} mm`).join(", "),
      },
    ]),
  ]);

  const materials = sectionHeader("materiais", "2. Composição de materiais", [
    tableBlock(
      ["Nome", "Código", "Material", "Espessura", "Função", "Qty"],
      metadata.pieces.map((p) => [
        p.nome,
        p.codigo || "—",
        p.material,
        fmtMm(p.espessuraMm),
        p.funcao,
        String(p.quantidade),
      ])
    ),
  ]);

  const measuresRows = [
    { label: "Largura externa corpo", value: fmtMm(geo.externalWidthMm) },
    { label: "Largura interna corpo", value: fmtMm(geo.internalWidthMm) },
    { label: "Altura útil sistema", value: fmtMm(geo.usefulHeightMm) },
    { label: "Profundidade runner", value: fmtMm(geo.runnerDepthMm) },
    { label: "Profundidade corpo", value: fmtMm(geo.bodyDepthMm) },
    { label: "Frente W×H×T", value: `${fmtMm(geo.front.widthMm)} × ${fmtMm(geo.front.heightMm)} × ${fmtMm(geo.front.thicknessMm)}` },
    { label: "Fundo W×D×T", value: `${fmtMm(geo.bottom.widthMm)} × ${fmtMm(geo.bottom.depthMm)} × ${fmtMm(geo.bottom.thicknessMm)}` },
  ];
  if (metadata.box) {
    measuresRows.unshift(
      { label: "Caixa W×H×D", value: `${fmtMm(metadata.box.widthMm)} × ${fmtMm(metadata.box.heightMm)} × ${fmtMm(metadata.box.depthMm)}` },
      { label: "Largura interna caixa", value: fmtMm(metadata.box.internalWidthMm) },
      { label: "Profundidade útil interna", value: fmtMm(metadata.box.usefulInternalDepthMm) }
    );
  }

  const measures = sectionHeader("medidas", "3. Medidas principais", [
    keyValueBlock(measuresRows),
  ]);

  const frontCfg = sectionHeader("frente", "4. Configuração de frente", [
    keyValueBlock([
      { label: "Frente externa", value: metadata.flags.frontExternal ? "Sim" : "Não" },
      { label: "Frente interna", value: metadata.flags.frontInternal ? "Sim" : "Não" },
      { label: "Dual-front", value: metadata.flags.dualFront ? "Activo" : "Inactivo" },
      { label: "Material frente", value: metadata.materials.front },
      { label: "Espessura frente", value: fmtMm(metadata.thicknessesMm.front) },
    ]),
  ]);

  const runners = sectionHeader("corredicas", "5. Corrediças", [
    keyValueBlock([
      { label: "Modelo", value: metadata.runnerFamily },
      { label: "Comprimento", value: fmtMm(metadata.runnerLengthMm) },
      { label: "Soft-close", value: metadata.flags.softClose ? "Sim" : "Não" },
      { label: "Push-open", value: metadata.flags.pushOpen ? "Sim" : "Não" },
    ]),
    textBlock(result.assembly.warnings ?? [], "Observações industriais (assembly)"),
  ]);

  const obsLines: string[] = [];
  if (result.safetyReport?.warnings?.length) {
    for (const w of result.safetyReport.warnings) {
      obsLines.push(`[safety/${w.gate}/${w.code}] ${w.message}${w.piece ? ` (${w.piece})` : ""}`);
    }
  }
  if (result.safetyReport?.errors?.length) {
    for (const e of result.safetyReport.errors) {
      obsLines.push(`[safety-error/${e.gate}/${e.code}] ${e.message}`);
    }
  }
  for (const w of result.warnings ?? []) obsLines.push(w);
  if (result.model.notes) obsLines.push(result.model.notes);
  obsLines.push(
    `Consumo material aprox.: ${fmtM2(metadata.materialConsumptionM2ApproxTotal)} total · ${fmtM2(metadata.materialConsumptionM2ApproxPerDrawer)} / gaveta`
  );

  const observacoes = sectionHeader("observacoes", "6. Observações industriais", [
    textBlock(obsLines.length ? obsLines : ["Sem observações."]),
  ]);

  return {
    title: `Ficha Técnica Industrial — ${metadata.modelDisplayName}`,
    generatedAt: new Date().toISOString(),
    metadata,
    sections: [identification, materials, measures, frontCfg, runners, observacoes],
  };
}
