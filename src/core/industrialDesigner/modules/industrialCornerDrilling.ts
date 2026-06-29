/**
 * Furação industrial para módulos de canto (cavilhas FF, estruturais, dobradiças, prateleira, costa L).
 */

import type { HoleTypeId } from "../../drill/holeCatalog";
import {
  buildCornerFixedFrontDowelHoles,
} from "../../cornerCabinet/cornerFixedFrontDowels";
import type { PanelDrillHole } from "../../types";
import {
  addDesignDrillHole,
  insertDesignHoleWithCavilhaPairing,
} from "../designModel";
import { isLeftLateral, isRightLateral } from "../cavilhaPairing";
import type { DesignDrillHole, DesignPanel, IndustrialDesignBox } from "../types";
import { calcLateralDowelHoles } from "../../drill/lateralDowels";
import {
  applyDoorAndLateralTechnicalHoles,
  type IndustrialCabinetDrillingOptions,
} from "./industrialBaseDrilling";
import type { CornerIndustrialLayout } from "./industrialCornerGeometry";
import type { CornerSide } from "../../cornerCabinet/cornerCabinetRules";

function panelHoleToDesign(
  hole: PanelDrillHole,
  holeTypeId: HoleTypeId,
  face: "face" | "espessura"
): Omit<DesignDrillHole, "id"> {
  return {
    holeTypeId,
    xMm: hole.x,
    yMm: hole.y,
    face,
  };
}

function applyPanelDrillHoles(
  box: IndustrialDesignBox,
  panelId: string,
  holes: PanelDrillHole[],
  holeTypeId: HoleTypeId,
  face: "face" | "espessura"
): IndustrialDesignBox {
  let current = box;
  for (const hole of holes) {
    current = addDesignDrillHole(current, panelId, panelHoleToDesign(hole, holeTypeId, face)).box;
  }
  return current;
}

function findPanelBySuffix(box: IndustrialDesignBox, suffix: string): DesignPanel | undefined {
  return box.panels.find((p) => p.id.endsWith(`:${suffix}`));
}

/** Cavilhas frente fixa ↔ cima/fundo/lateral (motor cornerFixedFrontDowels). */
export function applyCornerFixedFrontDowelHoles(
  box: IndustrialDesignBox,
  layout: CornerIndustrialLayout
): IndustrialDesignBox {
  const cima = findPanelBySuffix(box, "cima");
  const fundo = findPanelBySuffix(box, "fundo");
  const ff = findPanelBySuffix(box, "frente-fixa");
  if (!cima || !fundo || !ff) return box;

  const fixedFrontSide: "left" | "right" = layout.cornerSide === "right" ? "left" : "right";

  const holes = buildCornerFixedFrontDowelHoles(
    {
      fixedFrontWidthMm: layout.fixedFrontWidthMm,
      fixedFrontHeightMm: layout.fixedFrontHeightMm,
      panelWidthMm: layout.outer.widthMm,
      fixedFrontSide,
    },
    layout.innerH
  );

  let current = box;
  current = applyPanelDrillHoles(current, cima.id, holes.cima, "cavilha_10x30", "espessura");
  current = applyPanelDrillHoles(current, fundo.id, holes.fundo, "cavilha_10x30", "espessura");

  const lateralInterna = findPanelBySuffix(current, "lateral-interna");
  if (lateralInterna && fixedFrontSide === "left" && holes.lateral_esquerda) {
    current = applyPanelDrillHoles(
      current,
      lateralInterna.id,
      holes.lateral_esquerda,
      "cavilha_10x30",
      "espessura"
    );
  }
  if (lateralInterna && fixedFrontSide === "right" && holes.lateral_direita) {
    current = applyPanelDrillHoles(
      current,
      lateralInterna.id,
      holes.lateral_direita,
      "cavilha_10x30",
      "espessura"
    );
  }

  current = applyPanelDrillHoles(
    current,
    ff.id,
    holes.frente_fixa,
    "cavilha_10x30",
    "face"
  );

  return current;
}

/** Cavilhas estruturais na lateral exterior (direita ou esquerda). */
export function applyCornerStructuralDowels(
  box: IndustrialDesignBox,
  cornerSide: CornerSide
): IndustrialDesignBox {
  let current = box;
  const predicate = cornerSide === "right" ? isRightLateral : isLeftLateral;

  for (const lateral of box.panels.filter((p) => p.tipo === "lateral" && predicate(p))) {
    const offset = Math.max(4, lateral.thicknessMm / 2);
    const dowels = calcLateralDowelHoles(lateral.widthMm);
    for (const d of dowels) {
      const yMm = d.edge === "top" ? lateral.heightMm - offset : offset;
      current = insertDesignHoleWithCavilhaPairing(
        current,
        lateral.id,
        "cavilha_10x30",
        d.x,
        yMm,
        "espessura"
      ).box;
    }
  }

  return current;
}

/** Fixação estrutural nas duas peças da costa em L. */
export function applyCornerLBackFixation(box: IndustrialDesignBox): IndustrialDesignBox {
  const costaA = findPanelBySuffix(box, "costa-a");
  const costaB = findPanelBySuffix(box, "costa-b");
  if (!costaA || !costaB) return box;

  let current = box;
  for (const costa of [costaA, costaB]) {
    const margin = 50;
    const midX = costa.widthMm / 2;
    const positions: Array<[number, number]> = [
      [margin, margin],
      [costa.widthMm - margin, margin],
      [margin, costa.heightMm - margin],
      [costa.widthMm - margin, costa.heightMm - margin],
      [midX, margin],
      [midX, costa.heightMm - margin],
    ];
    for (const [xMm, yMm] of positions) {
      current = addDesignDrillHole(current, costa.id, {
        holeTypeId: "fixacao_estrutural",
        xMm,
        yMm,
        face: "espessura",
      }).box;
    }
  }
  return current;
}

/** Cavilhas prateleira ↔ lateral exterior. */
export function applyCornerShelfDowelHoles(
  box: IndustrialDesignBox,
  shelf: DesignPanel,
  cornerSide: CornerSide
): IndustrialDesignBox {
  const exteriorLateral = box.panels.find(
    (p) => p.tipo === "lateral" && (cornerSide === "right" ? isRightLateral(p) : isLeftLateral(p))
  );
  if (!exteriorLateral) return box;

  let current: IndustrialDesignBox = {
    ...box,
    constraints: [
      ...box.constraints,
      {
        id: `constraint-shelf-ext`,
        panelAId: shelf.id,
        panelBId: exteriorLateral.id,
        tipo: "encaixe_cavilha",
      },
    ],
  };

  const insetDepth = 55;
  const insetWidth = shelf.widthMm - 70;
  const shelfX =
    cornerSide === "right"
      ? insetWidth
      : Math.max(insetDepth, shelf.widthMm - insetWidth);
  const shelfPositions: Array<[number, number]> = [
    [shelfX, insetDepth],
    [shelfX, shelf.heightMm - insetDepth],
  ];

  for (const [xMm, yMm] of shelfPositions) {
    current = insertDesignHoleWithCavilhaPairing(
      current,
      shelf.id,
      "cavilha_10x30",
      xMm,
      yMm,
      "espessura"
    ).box;
  }

  return current;
}

export type CornerIndustrialDrillingOptions = IndustrialCabinetDrillingOptions & {
  layout: CornerIndustrialLayout;
  cornerSide?: CornerSide;
};

/** Pipeline completo de furação do canto industrial (direita ou esquerda). */
export function applyAllIndustrialCornerDrillingRules(
  box: IndustrialDesignBox,
  options: CornerIndustrialDrillingOptions
): IndustrialDesignBox {
  const cornerSide = options.cornerSide ?? options.layout.cornerSide;
  const hingeSide = options.hingeSide ?? (cornerSide === "right" ? "right" : "left");

  let current = applyCornerFixedFrontDowelHoles(box, options.layout);

  current = applyCornerStructuralDowels(current, cornerSide);

  const shelf = current.panels.find((p) => p.tipo === "prateleira");
  if (options.hasShelf && shelf) {
    current = applyCornerShelfDowelHoles(current, shelf, cornerSide);
  }

  const door = current.panels.find((p) => p.tipo === "frente");
  if (door) {
    current = applyDoorAndLateralTechnicalHoles(current, door, {
      hasShelf: options.hasShelf,
      hingeSide,
      shelfTechnicalMargins: options.shelfTechnicalMargins,
    });
  }

  return applyCornerLBackFixation(current);
}

/** Remove furos de dobradiça da frente fixa (regra canto). */
export function stripFixedFrontHingeHoles(box: IndustrialDesignBox): IndustrialDesignBox {
  const ff = findPanelBySuffix(box, "frente-fixa");
  if (!ff) return box;
  const panels = box.panels.map((p) =>
    p.id === ff.id
      ? {
          ...p,
          drillHoles: p.drillHoles.filter((h) => !h.holeTypeId.startsWith("dobradica")),
        }
      : p
  );
  return { ...box, panels };
}
