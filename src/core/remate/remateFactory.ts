import type { WorkspaceBox } from "../types";
import type { CreateRemateInput, ProjectRemate, RematePosition } from "./remateTypes";

const AVISTA_DEFAULT_MM = 100;
const RODAPE_DEFAULT_MM = 150;

const POSITION_SUFFIX: Record<RematePosition, string> = {
  dir: "DIR",
  esq: "ESQ",
  cima: "CIMA",
  baixo: "BAIXO",
  rodape: "RODAPE",
};

function normalizeBoxCode(box: WorkspaceBox): string {
  return (box.nome || box.id).trim().replace(/\s+/g, "_").toUpperCase();
}

function getDefaultDimensions(box: WorkspaceBox, input: CreateRemateInput, thicknessMm: number) {
  const largura = Math.max(1, box.dimensoes?.largura ?? 1);
  const altura = Math.max(1, box.dimensoes?.altura ?? 1);
  const profundidade = Math.max(1, box.dimensoes?.profundidade ?? 1);

  if (input.position === "rodape") {
    return {
      widthMm: largura,
      heightMm: Math.min(RODAPE_DEFAULT_MM, altura),
      depthMm: thicknessMm,
    };
  }

  if (input.position === "dir" || input.position === "esq") {
    return input.type === "completo"
      ? { widthMm: thicknessMm, heightMm: altura, depthMm: profundidade }
      : { widthMm: thicknessMm, heightMm: altura, depthMm: AVISTA_DEFAULT_MM };
  }

  return input.type === "completo"
    ? { widthMm: largura, heightMm: thicknessMm, depthMm: profundidade }
    : { widthMm: largura, heightMm: thicknessMm, depthMm: AVISTA_DEFAULT_MM };
}

export function createRematesForBox(params: {
  box: WorkspaceBox;
  input: CreateRemateInput;
  materialId: string;
  thicknessMm: number;
  existingCount: number;
}): ProjectRemate[] {
  const { box, input, materialId, thicknessMm, existingCount } = params;
  const code = normalizeBoxCode(box);
  const dimensions = getDefaultDimensions(box, input, thicknessMm);

  if (input.type === "L") {
    return [1, 2].map((part) => ({
      id: `${box.id}-remate-L${part}-${existingCount + part}`,
      parentBoxId: box.id,
      type: "L",
      position: input.position,
      materialId,
      materialMode: input.materialMode,
      thicknessMm,
      dimensions,
      name: `${code}_REM_L${part}`,
    }));
  }

  const suffix = input.position === "rodape" ? "RODAPE" : `REM_${POSITION_SUFFIX[input.position]}`;
  return [
    {
      id: `${box.id}-remate-${input.position}-${existingCount + 1}`,
      parentBoxId: box.id,
      type: input.type,
      position: input.position,
      materialId,
      materialMode: input.materialMode,
      thicknessMm,
      dimensions,
      name: `${code}_${suffix}`,
    },
  ];
}
