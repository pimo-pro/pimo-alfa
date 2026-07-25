import type { BoxModule, CutListItem, CutListItemComPreco } from "../types";
import { getMaterialByIdOrLabel } from "../materials/service";
import { getFallbackMaterial } from "../materials/materialLibraryV2";
import { calcularPrecoCutList } from "../pricing/pricing";
import { buildCutlistRotationMetadata } from "../manufacturing/cutlistRotationMetadata";
import type { ProjectRodape } from "./rodapeTypes";
import {
  buildRodapeIndustrialLabelsForRodapes,
  resolveRodapePieceDisplayName,
} from "./labels";

function buildBoxNameLookup(boxes: readonly BoxModule[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const box of boxes) {
    if (box?.id) out[box.id] = typeof box.nome === "string" ? box.nome : box.id;
  }
  return out;
}

/** Inclui só rodapés visíveis com dimensões reais (> 0). Não inventar 1×1 mm. */
function isRodapeIncludedInCutlist(rodape: ProjectRodape): boolean {
  if (rodape.visible === false) return false;
  const L = Number(rodape.dimensions?.widthMm ?? rodape.autoLengthMm) || 0;
  const A = Number(rodape.heightMm ?? rodape.dimensions?.heightMm) || 0;
  return L > 0 && A > 0;
}

function toCutDimensions(rodape: ProjectRodape): CutListItem["dimensoes"] {
  const largura = Number(rodape.dimensions?.widthMm ?? rodape.autoLengthMm) || 0;
  const altura = Number(rodape.heightMm ?? rodape.dimensions?.heightMm) || 0;
  const profundidade = Math.max(
    1,
    Number(rodape.thicknessMm ?? rodape.dimensions?.depthMm ?? 19)
  );
  return { largura, altura, profundidade };
}

export function buildRodapeCutlistItems(
  rodapes: readonly ProjectRodape[],
  boxes: readonly BoxModule[]
): CutListItemComPreco[] {
  const included = rodapes.filter(isRodapeIncludedInCutlist);
  const boxNameById = buildBoxNameLookup(boxes);
  const industrialLabels = buildRodapeIndustrialLabelsForRodapes(included, boxNameById);

  const items: CutListItem[] = included.map((rodape) => {
    const material = getMaterialByIdOrLabel(rodape.materialId);
    const materialLabel = material?.label ?? rodape.materialId;
    const boxId = rodape.parentBoxId ?? "";
    const dims = toCutDimensions(rodape);
    const industrialLabel = industrialLabels.get(rodape.id) ?? rodape.name;
    const nome = resolveRodapePieceDisplayName(rodape, industrialLabel);
    const materialId = material?.id ?? rodape.materialId;
    const rotationMeta = buildCutlistRotationMetadata({
      allowPieceRotation: rodape.allowPieceRotation,
      lockWoodGrain: rodape.lockWoodGrain,
      materialId,
    });

    return {
      id: rodape.id,
      nome,
      quantidade: 1,
      dimensoes: dims,
      espessura: dims.profundidade,
      material: materialLabel,
      tipo: "rodape",
      sourceType: "parametric",
      boxId,
      materialId,
      visualMaterial: getFallbackMaterial(),
      drillHoles: [],
      metadata: {
        panelId: rodape.id,
        rodapeId: rodape.id,
        rodapeKind: rodape.kind,
        partIndex: rodape.partIndex,
        parentGroupId: rodape.parentGroupId,
        industrialLabel,
        rodapeIndustrialLabel: "RODA_PE",
        ...rotationMeta,
      },
    };
  });

  return calcularPrecoCutList(items);
}
