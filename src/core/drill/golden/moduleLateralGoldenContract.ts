/**
 * Contrato industrial — laterais de M×DULO (`lateral_esquerda` / `lateral_direita`).
 *
 * Escopo: apenas caixa/módulo. Laterais de gaveta (`gaveta_lat_*`, `cx_gav_lat_*`)
 * estão FORA — SSOT transversal congelado; não alterar geração/export de gaveta.
 *
 * Fluxo:
 * 1) Colocar o XML KDT golden em `module_lateral_esq.xml` (e/ou `_dir.xml`).
 * 2) `parseModuleLateralGoldenXml` extrai L/W/T + TypeNo2 —10–30.
 * 3) Testes + correção do ramo `isLateralPanel` alinhados a este contrato.
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const MODULE_LATERAL_GOLDEN_DIR = dirname(fileURLToPath(import.meta.url));

export const MODULE_LATERAL_GOLDEN_ESQ_PATH = join(
  MODULE_LATERAL_GOLDEN_DIR,
  "module_lateral_esq.xml"
);
export const MODULE_LATERAL_GOLDEN_DIR_PATH = join(
  MODULE_LATERAL_GOLDEN_DIR,
  "module_lateral_dir.xml"
);

/** Tipos de peça afectados pelo golden de módulo. */
export const MODULE_LATERAL_TIPOS = ["lateral_esquerda", "lateral_direita"] as const;

/** Tipos PROIBIDOS neste fluxo (não alterar geração/export). */
export const PROTECTED_DRAWER_LATERAL_TIPOS = [
  "gaveta_lat_esq",
  "gaveta_lat_dir",
  "gav_lat_esq",
  "gav_lat_dir",
  "cx_gav_lat_esq",
  "cx_gav_lat_dir",
  "cx_gav_lat_esquerda",
  "cx_gav_lat_direita",
] as const;

export type ModuleLateralGoldenHole = {
  typeNo: 2;
  x: number;
  y: number;
  z: number;
  quadrant: number;
  depth: number;
  diameter: number;
};

export type ModuleLateralGoldenContract = {
  panelLength: number;
  panelWidth: number;
  panelThickness: number;
  /** Cavilhas horizontais —10 (esperado Depth=30, X?{0,L}). */
  edgeCavilhas: ModuleLateralGoldenHole[];
};

const NUM = (s: string | undefined) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

function tagValue(xml: string, tag: string): number {
  const m = xml.match(new RegExp(`<${tag}>([^<]+)</${tag}>`));
  return NUM(m?.[1]);
}

/**
 * Extrai o contrato industrial de um XML KDTPanelFormat de lateral de módulo.
 */
export function parseModuleLateralGoldenXml(xml: string): ModuleLateralGoldenContract {
  const panelLength = tagValue(xml, "PanelLength");
  const panelWidth = tagValue(xml, "PanelWidth");
  const panelThickness = tagValue(xml, "PanelThickness");
  if (!(panelLength > 0) || !(panelWidth > 0) || !(panelThickness > 0)) {
    throw new Error(
      "XML golden inválido: PanelLength/PanelWidth/PanelThickness em falta ou ?0"
    );
  }

  const cadBlocks = xml.match(/<CAD>[\s\S]*?<\/CAD>/g) ?? [];
  const edgeCavilhas: ModuleLateralGoldenHole[] = [];

  for (const block of cadBlocks) {
    const typeNo = tagValue(block, "TypeNo");
    const diameter = tagValue(block, "Diameter");
    if (typeNo !== 2) continue;
    if (!(Math.abs(diameter - 10) < 0.05)) continue;

    edgeCavilhas.push({
      typeNo: 2,
      x: tagValue(block, "X1"),
      y: tagValue(block, "Y1"),
      z: tagValue(block, "Z1"),
      quadrant: tagValue(block, "Quadrant"),
      depth: tagValue(block, "Depth"),
      diameter,
    });
  }

  return { panelLength, panelWidth, panelThickness, edgeCavilhas };
}

export function loadModuleLateralGoldenFile(
  path: string = MODULE_LATERAL_GOLDEN_ESQ_PATH
): ModuleLateralGoldenContract | null {
  if (!existsSync(path)) return null;
  return parseModuleLateralGoldenXml(readFileSync(path, "utf8"));
}

export function moduleLateralGoldenFileReady(
  path: string = MODULE_LATERAL_GOLDEN_ESQ_PATH
): boolean {
  return existsSync(path);
}

/**
 * Valida o contrato industrial esperado (pré-correção / pós-golden).
 * Não aplica correções — só reporta conformidade.
 */
export function assertModuleLateralGoldenContractShape(
  contract: ModuleLateralGoldenContract,
  opts?: { expectDepthMm?: number; expectCavilhaCount?: number }
): {
  ok: boolean;
  issues: string[];
  xOnEdges: boolean;
  allDepth30: boolean;
} {
  const expectDepth = opts?.expectDepthMm ?? 30;
  const expectCount = opts?.expectCavilhaCount ?? 4;
  const issues: string[] = [];
  const L = contract.panelLength;
  const eps = 0.51;

  if (contract.edgeCavilhas.length !== expectCount) {
    issues.push(
      `esperadas ${expectCount} cavilhas TypeNo2 —10; obtidas ${contract.edgeCavilhas.length}`
    );
  }

  let xOnEdges = true;
  let allDepth30 = true;
  for (const h of contract.edgeCavilhas) {
    const onEdge = Math.abs(h.x) <= eps || Math.abs(h.x - L) <= eps;
    if (!onEdge) {
      xOnEdges = false;
      issues.push(`X=${h.x} fora de {0, L=${L}} (não — furo de aresta longitudinal)`);
    }
    if (!(Math.abs(h.depth - expectDepth) < 0.05)) {
      allDepth30 = false;
      issues.push(`Depth=${h.depth} (esperado ${expectDepth}) em X=${h.x} Y=${h.y}`);
    }
    if (!(h.y > 0 && h.y < contract.panelWidth)) {
      issues.push(`Y=${h.y} fora de (0, W=${contract.panelWidth})`);
    }
  }

  return { ok: issues.length === 0, issues, xOnEdges, allDepth30 };
}

/** Chave estável para comparar conjuntos de furos (ordem-independente). */
export function goldenHoleKey(h: Pick<ModuleLateralGoldenHole, "x" | "y" | "depth" | "diameter">): string {
  return `${h.x.toFixed(2)}_${h.y.toFixed(2)}_${h.depth.toFixed(2)}_${h.diameter.toFixed(2)}`;
}
