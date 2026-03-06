/**
 * Joints de cavilha alinhados ao TCN: mesmas regras de posição (distância frente/fundo
 * da config global). Cima → borda superior do lateral; fundo → borda inferior.
 * Posição ao longo da aresta = distFrente (ex.: 60) e latLargura - distFundo (ex.: PanelWidth - 60).
 */

import type { PanelDrillHole } from "../types";
import type { CutListItemComPreco } from "../types";
import { getDrillingConfig } from "../settings/settingsService";
import { DOWEL_DIAMETER_MM, DRILL_LATERAL_DEPTH_MM } from "./dowelTypes";

const DEFAULT_DIST_FRENTE_MM = 60;
const DEFAULT_DIST_FUNDO_MM = 60;

/**
 * Posição ao longo da aresta da lateral: mesma regra do TCN (distância da frente e do fundo).
 * hostY < metade da face = furo da frente → distFrente; senão → latLargura - distFundo.
 */
function positionAlongLateralEdge(
  hostY: number,
  faceAltura: number,
  latLargura: number,
  distFrente: number,
  distFundo: number
): number {
  const isFront = hostY < faceAltura / 2;
  const raw = isFront ? distFrente : latLargura - distFundo;
  const radius = DOWEL_DIAMETER_MM / 2;
  return Math.max(radius, Math.min(latLargura - radius, raw));
}

/**
 * Adiciona um mate na lateral. edge 'top' = ligação ao cima (y = latAltura), 'bottom' = ao fundo (y = 0).
 */
function addMateToLateral(
  result: (CutListItemComPreco)[],
  lateralItem: CutListItemComPreco,
  hostY: number,
  faceAltura: number,
  edge: "top" | "bottom",
  latLargura: number,
  latAltura: number,
  distFrente: number,
  distFundo: number
): void {
  const idx = result.findIndex((r) => r.id === lateralItem.id);
  if (idx < 0) return;
  const lat = result[idx];
  const positionAlongEdge = positionAlongLateralEdge(hostY, faceAltura, latLargura, distFrente, distFundo);
  const yOnPanel = edge === "top" ? latAltura : 0;
  const hole: PanelDrillHole = {
    x: positionAlongEdge,
    y: yOnPanel,
    diameter: DOWEL_DIAMETER_MM,
    depth: DRILL_LATERAL_DEPTH_MM,
    holeType: "cavilha",
    topDrillable: false,
  };
  result[idx] = {
    ...lat,
    drillHoles: [...(lat.drillHoles ?? []), hole],
  };
}

/**
 * Para cada furo host em cima e fundo (mesmas regras do TCN), adiciona o mate
 * na lateral correspondente. Posições ao longo da aresta = distFrente e latLargura - distFundo.
 */
export function addMateDowelHolesToBoxItems(
  items: CutListItemComPreco[]
): CutListItemComPreco[] {
  const cfg = getDrillingConfig()?.cavilha;
  const distFrente = Number(cfg?.frontDistance) || DEFAULT_DIST_FRENTE_MM;
  const distFundo = Number(cfg?.backDistance) || DEFAULT_DIST_FUNDO_MM;

  const cima = items.find((i) => i.tipo === "cima");
  const fundo = items.find((i) => i.tipo === "fundo");
  const latEsq = items.find((i) => i.tipo === "lateral_esquerda");
  const latDir = items.find((i) => i.tipo === "lateral_direita");

  const result = items.map((item) => ({ ...item, drillHoles: [...(item.drillHoles ?? [])] }));

  const processFacePanel = (faceItem: CutListItemComPreco | undefined, edge: "top" | "bottom") => {
    if (!faceItem?.drillHoles?.length || !faceItem.dimensoes) return;
    const faceLargura = faceItem.dimensoes.largura;
    const faceAltura = faceItem.dimensoes.altura;
    const midX = faceLargura / 2;
    if (!latEsq?.dimensoes || !latDir?.dimensoes) return;
    const latEsqLargura = latEsq.dimensoes.largura;
    const latEsqAltura = latEsq.dimensoes.altura;
    const latDirLargura = latDir.dimensoes.largura;
    const latDirAltura = latDir.dimensoes.altura;
    for (const h of faceItem.drillHoles) {
      if (h.holeType !== "cavilha" || h.topDrillable === false) continue;
      const hostX = h.x;
      const hostY = h.y;
      if (hostX < midX && latEsq)
        addMateToLateral(result, latEsq, hostY, faceAltura, edge, latEsqLargura, latEsqAltura, distFrente, distFundo);
      else if (hostX >= midX && latDir)
        addMateToLateral(result, latDir, hostY, faceAltura, edge, latDirLargura, latDirAltura, distFrente, distFundo);
    }
  };

  processFacePanel(cima, "top");
  processFacePanel(fundo, "bottom");

  return result;
}
