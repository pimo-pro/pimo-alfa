/**
 * Furação industrial — gaveta (corrediças, estrutural, caixa base).
 */

import type { PieceType } from "../../drilling/drillingService";
import {
  computeDrawerCostaStructuralHoles,
  computeDrawerFrenteIntStructuralHoles,
  computeDrawerLateralStructuralHoles,
  computeDrawerPieceCorredicaHoles,
  computePiModuleLateralCorredicaHoles,
  getDrawerSlideDrillingRules,
  resolvePiRunnerLinesYMm,
} from "../../drawers/drilling/DrawerDrillingRules";
import type { DrillFace, TechnicalDrillHole } from "../../types";
import type { HoleTypeId } from "../../drill/holeCatalog";
import { isLeftLateral, isRightLateral } from "../cavilhaPairing";
import { addDesignDrillHole } from "../designModel";
import type { DesignDrillHole, DesignPanel, IndustrialDesignBox } from "../types";
import {
  applyBackStructuralFixation,
  applyLateralStructuralDowels,
} from "./industrialBaseDrilling";
import type { IndustrialDrawerSingleLayout } from "./industrialDrawerGeometry";

function drillTipoToHoleTypeId(tipo: TechnicalDrillHole["tipo"], isMark?: boolean): HoleTypeId {
  if (tipo === "cavilha") return "cavilha_10x30";
  if (tipo === "corredica") return isMark ? "corredica_marca" : "corredica";
  if (tipo === "puxador") return "fixacao_estrutural";
  return "fixacao_estrutural";
}

function drillFaceToHoleFace(drillFace: DrillFace): DesignDrillHole["face"] {
  if (
    drillFace === "cima" ||
    drillFace === "fundo" ||
    drillFace === "frente" ||
    drillFace === "tras" ||
    drillFace === "esquerda" ||
    drillFace === "direita"
  ) {
    return "face";
  }
  return "espessura";
}

function technicalToDesignHole(hole: TechnicalDrillHole, isMark?: boolean): Omit<DesignDrillHole, "id"> {
  if (hole.holeSubtype === "groove" || hole.diametro <= 0) {
    return {
      holeTypeId: "fixacao_estrutural",
      xMm: hole.x,
      yMm: hole.y,
      face: "face",
      drillFace: hole.face,
    };
  }
  return {
    holeTypeId: drillTipoToHoleTypeId(hole.tipo, isMark),
    xMm: hole.x,
    yMm: hole.y,
    face: drillFaceToHoleFace(hole.face),
    drillFace: hole.face,
  };
}

function applyTechnicalHolesToPanel(
  box: IndustrialDesignBox,
  panel: DesignPanel,
  holes: TechnicalDrillHole[]
): IndustrialDesignBox {
  let current = box;
  for (const hole of holes) {
    if (hole.holeSubtype === "groove" || hole.diametro <= 0) continue;
    current = addDesignDrillHole(
      current,
      panel.id,
      technicalToDesignHole(hole)
    ).box;
  }
  return current;
}

function pieceTypeForPanel(panel: DesignPanel): PieceType {
  return panel.tipo as PieceType;
}

/** Corrediças nas laterais da caixa (par esquerda/direita). */
export function applyCabinetSlideHoles(
  box: IndustrialDesignBox,
  layout: IndustrialDrawerSingleLayout
): IndustrialDesignBox {
  const runnerLines = resolvePiRunnerLinesYMm(layout.innerH, 1, [layout.frontExtH]);
  let current = box;

  for (const lateral of box.panels.filter((p) => p.tipo === "lateral")) {
    const side = isLeftLateral(lateral) ? "left" : isRightLateral(lateral) ? "right" : null;
    if (!side) continue;

    const rules = getDrawerSlideDrillingRules(undefined, undefined, {
      mode: "pi_module_lateral",
      panelDepthMm: lateral.widthMm,
      panelHeightMm: lateral.heightMm,
    });
    if (!rules.enabled) continue;

    const specs = computePiModuleLateralCorredicaHoles({
      runnerLinesYMm: runnerLines,
      panelDepthMm: lateral.widthMm,
      panelHeightMm: lateral.heightMm,
      side,
      rules,
      useLegacyPiOffsets: false,
    });

    for (const spec of specs) {
      current = addDesignDrillHole(current, lateral.id, {
        holeTypeId: spec.isMarkOnly ? "corredica_marca" : "corredica",
        xMm: spec.x,
        yMm: spec.y,
        face: "face",
        drillFace: "frente",
      }).box;
    }
  }

  return current;
}

/** Furação estrutural + corrediças nas peças da gaveta. */
export function applyDrawerBoxDrilling(
  box: IndustrialDesignBox,
  _layout: IndustrialDrawerSingleLayout
): IndustrialDesignBox {
  const rules = getDrawerSlideDrillingRules(undefined, undefined, {
    mode: "drawer_piece",
    panelDepthMm: 500,
  });
  let current = box;

  for (const panel of box.panels) {
    if (panel.tipo === "gaveta_lat_esq" || panel.tipo === "gaveta_lat_dir") {
      const structural = computeDrawerLateralStructuralHoles({
        largura: panel.widthMm,
        altura: panel.heightMm,
        espessura: panel.thicknessMm,
        side: panel.tipo === "gaveta_lat_esq" ? "esq" : "dir",
      });
      current = applyTechnicalHolesToPanel(current, panel, structural);

      const pieceRules = getDrawerSlideDrillingRules(undefined, undefined, {
        mode: "drawer_piece",
        panelDepthMm: panel.widthMm,
        panelHeightMm: panel.heightMm,
      });
      const corredica = computeDrawerPieceCorredicaHoles({
        pieceType: pieceTypeForPanel(panel),
        largura: panel.widthMm,
        altura: panel.heightMm,
        rules: pieceRules,
      });
      for (const spec of corredica) {
        current = addDesignDrillHole(current, panel.id, {
          holeTypeId: spec.isMarkOnly ? "corredica_marca" : "corredica",
          xMm: spec.x,
          yMm: spec.y,
          face: "face",
          drillFace: spec.face,
        }).box;
      }
    }

    if (panel.tipo === "gaveta_traseira") {
      const structural = computeDrawerCostaStructuralHoles({
        largura: panel.widthMm,
        altura: panel.heightMm,
        espessura: panel.thicknessMm,
      });
      current = applyTechnicalHolesToPanel(current, panel, structural);
    }

    if (panel.tipo === "gaveta_frente_int") {
      const structural = computeDrawerFrenteIntStructuralHoles({
        largura: panel.widthMm,
        altura: panel.heightMm,
        espessura: panel.thicknessMm,
        isLowestDrawer: true,
      });
      current = applyTechnicalHolesToPanel(current, panel, structural);
    }
  }

  return current;
}

/** Caixa base (sem porta/prateleira) + corrediças + corpo da gaveta. */
export function applyAllIndustrialDrawerSingleDrillingRules(
  box: IndustrialDesignBox,
  layout: IndustrialDrawerSingleLayout
): IndustrialDesignBox {
  let current = applyLateralStructuralDowels(box);
  current = applyBackStructuralFixation(current);
  current = applyCabinetSlideHoles(current, layout);
  current = applyDrawerBoxDrilling(current, layout);
  return current;
}
