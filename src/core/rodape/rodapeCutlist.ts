import type { BoxModule, CutListItem, CutListItemComPreco } from "../types";
import { getMaterialByIdOrLabel } from "../materials/service";
import { getFallbackMaterial } from "../materials/materialLibraryV2";
import { calcularPrecoCutList } from "../pricing/pricing";
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

function toCutDimensions(rodape: ProjectRodape): CutListItem["dimensoes"] {
  const largura = Math.max(
    1,
    Number(rodape.dimensions?.widthMm ?? rodape.autoLengthMm ?? 0)
  );
  const altura = Math.max(
    1,
    Number(rodape.heightMm ?? rodape.dimensions?.heightMm ?? 0)
  );
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
  const visible = rodapes.filter((r) => r.visible !== false);
  const boxNameById = buildBoxNameLookup(boxes);
  const industrialLabels = buildRodapeIndustrialLabelsForRodapes(visible, boxNameById);

  const items: CutListItem[] = visible.map((rodape) => {
    const material = getMaterialByIdOrLabel(rodape.materialId);
    const materialLabel = material?.label ?? rodape.materialId;
    const boxId = rodape.parentBoxId ?? "";
    const dims = toCutDimensions(rodape);
    const industrialLabel = industrialLabels.get(rodape.id) ?? rodape.name;
    const nome = resolveRodapePieceDisplayName(rodape, industrialLabel);

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
      materialId: material?.id ?? rodape.materialId,
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
      },
    };
  });

  return calcularPrecoCutList(items);
}
