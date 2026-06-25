import type { BoxModule } from "../types";
import { resolveCostaAtivaForBox } from "../box/backPanelFlags";
import { resolveMaterial } from "../materials/materials.api";
import { getIndustrialMaterialKeyForBox, resolveIndustrialMaterialKey } from "../materials/service";
import {
  IndustrialError,
  buildIndustrialPieceId,
  buildIndustrialPieceIdFromPanel,
} from "./IndustrialError";
import type { CutListItem } from "../types";

export function resolveIndustrialBoxId(box: Pick<BoxModule, "id" | "nome">): string {
  const nome = box.nome?.trim();
  if (nome) return nome;
  return box.id?.trim() || "BOX";
}

export function assertIndustrialMaterial(
  box: Pick<BoxModule, "id" | "nome">,
  pieceKey: string,
  materialKey: string | undefined,
  opts?: { costaApplicable?: boolean }
): void {
  const boxId = resolveIndustrialBoxId(box);
  const pieceId = buildIndustrialPieceId(boxId, pieceKey);
  const key = materialKey?.trim();
  if (!key) {
    throw IndustrialError.materialNotFound({
      boxId,
      pieceId,
      materialKey: "(vazio)",
      costaApplicable: opts?.costaApplicable,
    });
  }
  const resolved = resolveIndustrialMaterialKey(key);
  if (!resolveMaterial(resolved)) {
    throw IndustrialError.materialNotFound({
      boxId,
      pieceId,
      materialKey: key,
      costaApplicable: opts?.costaApplicable,
    });
  }
}

/** Garante materialId industrial válido em cada peça da cutlist antes de persistir/exportar. */
export function assertCutlistIndustrialMaterials(
  box: Pick<BoxModule, "id" | "nome">,
  items: readonly Pick<CutListItem, "tipo" | "materialId">[],
  fallbackCanonicalId?: string
): void {
  const fallback = resolveIndustrialMaterialKey(undefined, fallbackCanonicalId);
  for (const item of items) {
    const pieceKey = (item.tipo ?? "PECA").toUpperCase().replace(/[^A-Z0-9_]+/g, "_");
    const resolved = resolveIndustrialMaterialKey(item.materialId, fallback);
    assertIndustrialMaterial(box, pieceKey, resolved);
  }
}

export function assertBoxModuleDimensions(box: BoxModule): void {
  const boxId = resolveIndustrialBoxId(box);
  const largura = Number(box.dimensoes?.largura) || 0;
  const altura = Number(box.dimensoes?.altura) || 0;
  const profundidade = Number(box.profundidadeExterna ?? box.dimensoes?.profundidade) || 0;
  const costaApplicable = resolveCostaAtivaForBox(box);

  if (largura <= 0 || altura <= 0 || profundidade <= 0) {
    throw IndustrialError.invalidMeasure({
      boxId,
      pieceId: buildIndustrialPieceId(boxId, "MODULO"),
      detail: `Dimensões externas inválidas (${largura}×${altura}×${profundidade} mm).`,
      costaApplicable,
    });
  }

  const bodyMaterialId = getIndustrialMaterialKeyForBox(box, undefined);
  if (bodyMaterialId) {
    assertIndustrialMaterial(box, "CORPO", bodyMaterialId);
  }
}

export function assertPanelDimensions(
  box: Pick<BoxModule, "id" | "nome" | "costaAtiva" | "noBackPanel">,
  panelId: string,
  tipo: string,
  largura_mm: number,
  altura_mm: number,
  espessura_mm?: number
): void {
  const boxId = resolveIndustrialBoxId(box);
  const pieceId = buildIndustrialPieceIdFromPanel(boxId, panelId, tipo);
  const costaApplicable = resolveCostaAtivaForBox(box);

  if (largura_mm <= 0 || altura_mm <= 0) {
    throw IndustrialError.invalidMeasure({
      boxId,
      pieceId,
      detail: `Medidas inválidas para ${tipo}: ${largura_mm}×${altura_mm} mm.`,
      costaApplicable,
    });
  }

  if (espessura_mm !== undefined && espessura_mm <= 0) {
    throw IndustrialError.invalidThickness({
      boxId,
      pieceId,
      thicknessMm: espessura_mm,
    });
  }
}

export function assertDrawerLayerDimensions(
  boxId: string,
  pieceTipo: string,
  widthMm: number,
  heightMm: number,
  depthMm?: number
): void {
  const pieceId = buildIndustrialPieceId(boxId, pieceTipo);
  if (widthMm <= 0 || heightMm <= 0 || (depthMm !== undefined && depthMm <= 0)) {
    throw IndustrialError.invalidMeasure({
      boxId,
      pieceId,
      detail: `Medidas inválidas na gaveta (${pieceTipo}): ${widthMm}×${heightMm}${depthMm != null ? `×${depthMm}` : ""} mm.`,
    });
  }
}

export function assertDoorDimensions(
  box: Pick<BoxModule, "id" | "nome">,
  doorIndex: number,
  largura_mm: number,
  altura_mm: number,
  espessura_mm: number
): void {
  const boxId = resolveIndustrialBoxId(box);
  const pieceId = buildIndustrialPieceId(boxId, `PORTA_${doorIndex + 1}`);
  if (largura_mm <= 0 || altura_mm <= 0) {
    throw IndustrialError.invalidMeasure({
      boxId,
      pieceId,
      detail: `Medidas inválidas na porta ${doorIndex + 1}: ${largura_mm}×${altura_mm} mm.`,
    });
  }
  if (espessura_mm <= 0) {
    throw IndustrialError.invalidThickness({
      boxId,
      pieceId,
      thicknessMm: espessura_mm,
    });
  }
}
