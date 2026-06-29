/**
 * Converte ponto de intersecção 3D (mesh do painel) em coordenadas de furo (mm).
 * Alinhado com o sistema de coordenadas de ViewerPanelVisibility.
 */

export type PanelMeshMeta = {
  panelType?: string;
  width?: number;
  height?: number;
  thickness?: number;
};

export type PanelHitCoords = {
  xMm: number;
  yMm: number;
  /** True quando o clique foi na face larga (não na espessura). */
  isFaceHit: boolean;
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Converte ponto local do mesh (metros, centrado na origem) em (xMm, yMm) do painel.
 * Convenção: xMm = 0 na borda esquerda, yMm = 0 na borda inferior do painel 2D.
 */
export function meshLocalPointToHoleMm(
  localX: number,
  localY: number,
  localZ: number,
  meta: PanelMeshMeta
): PanelHitCoords | null {
  const panelType = meta.panelType;
  const widthM = Number(meta.width) || 0;
  const heightM = Number(meta.height) || 0;

  if (!panelType || widthM <= 0 || heightM <= 0) return null;

  const halfW = widthM / 2;
  const halfH = heightM / 2;

  const absX = Math.abs(localX);
  const absY = Math.abs(localY);
  const absZ = Math.abs(localZ);

  if (panelType === "top" || panelType === "bottom") {
    const isFaceHit = absY >= Math.max(absX, absZ) - 1e-6;
    const xMm = clamp((localX + halfW) * 1000, 0, widthM * 1000);
    const yMm = clamp((halfH - localZ) * 1000, 0, heightM * 1000);
    return { xMm, yMm, isFaceHit };
  }

  if (panelType === "left" || panelType === "right") {
    const isFaceHit = absX >= Math.max(absY, absZ) - 1e-6;
    const xMm = clamp((localZ + halfW) * 1000, 0, widthM * 1000);
    const yMm = clamp((halfH - localY) * 1000, 0, heightM * 1000);
    return { xMm, yMm, isFaceHit };
  }

  if (panelType === "back" || panelType === "front") {
    const isFaceHit = absZ >= Math.max(absX, absY) - 1e-6;
    const xMm = clamp((localX + halfW) * 1000, 0, widthM * 1000);
    const yMm = clamp((halfH - localY) * 1000, 0, heightM * 1000);
    return { xMm, yMm, isFaceHit };
  }

  // Prateleiras / divisórias / portas: tratamos como painel horizontal (top).
  const xMm = clamp((localX + halfW) * 1000, 0, widthM * 1000);
  const yMm = clamp((halfH - localZ) * 1000, 0, heightM * 1000);
  const isFaceHit = absY >= Math.max(absX, absZ) - 1e-6;
  return { xMm, yMm, isFaceHit };
}

/** Resolve face de furo (espessura vs face) a partir do tipo de clique e do catálogo. */
export function resolveHoleFaceFromHit(
  isFaceHit: boolean,
  preferredFace: "espessura" | "face"
): "espessura" | "face" {
  if (preferredFace === "espessura" && !isFaceHit) return "espessura";
  if (preferredFace === "face" && isFaceHit) return "face";
  return isFaceHit ? "face" : "espessura";
}
