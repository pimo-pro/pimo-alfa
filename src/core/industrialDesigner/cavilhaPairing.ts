/**
 * Propagação automática de cavilhas frente/verso entre painéis ligados por constraint.
 */

import type { HoleFaceKind, HoleTypeId } from "../drill/holeCatalog";
import { getHoleTypeById, getPairedHoleTypeId } from "../drill/holeCatalog";
import { findDesignPanel, nextDesignId } from "./designModel";
import {
  assertDesignOperationAllowed,
  validateHoleInsertion,
  validateHolePlacement,
} from "./geometryValidation";
import type {
  DesignDrillHole,
  DesignPanel,
  DesignPanelTipo,
  IndustrialDesignBox,
  PanelConstraint,
} from "./types";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function isInternalLateral(panel: DesignPanel): boolean {
  return panel.tipo === "lateral" && panel.id.includes("lateral-interna");
}

export function isLeftLateral(panel: DesignPanel): boolean {
  return panel.tipo === "lateral" && (panel.id.includes(":lateral-le") || panel.id.endsWith("-le"));
}

export function isRightLateral(panel: DesignPanel): boolean {
  return panel.tipo === "lateral" && (panel.id.includes(":lateral-ld") || panel.id.endsWith("-ld"));
}

type PanelPairKind =
  | "lateral_horizontal"
  | "horizontal_lateral"
  | "prateleira_lateral"
  | "lateral_prateleira"
  | "unknown";

function resolvePanelPairKind(source: DesignPanelTipo, target: DesignPanelTipo): PanelPairKind {
  if (source === "lateral" && (target === "fundo" || target === "cima")) return "lateral_horizontal";
  if ((source === "fundo" || source === "cima") && target === "lateral") return "horizontal_lateral";
  if (source === "prateleira" && target === "lateral") return "prateleira_lateral";
  if (source === "lateral" && target === "prateleira") return "lateral_prateleira";
  return "unknown";
}

function edgeOffsetMm(panel: DesignPanel): number {
  return Math.max(4, panel.thicknessMm / 2);
}

export function listCavilhaConstraintsForPanel(
  box: IndustrialDesignBox,
  panelId: string
): PanelConstraint[] {
  return box.constraints.filter(
    (c) =>
      c.tipo === "encaixe_cavilha" &&
      (c.panelAId === panelId || c.panelBId === panelId)
  );
}

export function resolveCavilhaConstraintTarget(
  box: IndustrialDesignBox,
  sourcePanelId: string,
  hole: { xMm: number; yMm: number }
): { constraint: PanelConstraint; targetPanel: DesignPanel } | null {
  const source = findDesignPanel(box, sourcePanelId);
  if (!source) return null;

  const candidates = listCavilhaConstraintsForPanel(box, sourcePanelId)
    .map((constraint) => {
      const otherId =
        constraint.panelAId === sourcePanelId ? constraint.panelBId : constraint.panelAId;
      const targetPanel = findDesignPanel(box, otherId);
      return targetPanel ? { constraint, targetPanel } : null;
    })
    .filter((item): item is { constraint: PanelConstraint; targetPanel: DesignPanel } => item != null);

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  if (source.tipo === "lateral") {
    const midY = source.heightMm / 2;
    const preferTipo = hole.yMm < midY ? "fundo" : "cima";
    const match = candidates.find((c) => c.targetPanel.tipo === preferTipo);
    if (match) return match;
  }

  if (source.tipo === "fundo" || source.tipo === "cima" || source.tipo === "prateleira") {
    const midX = source.widthMm / 2;
    const wantLeft = hole.xMm < midX;
    const match = candidates.find((c) => {
      if (c.targetPanel.tipo !== "lateral") return false;
      return wantLeft ? isLeftLateral(c.targetPanel) : isRightLateral(c.targetPanel);
    });
    if (match) return match;
  }

  return candidates[0];
}

/**
 * Projeta coordenadas de um furo de cavilha do painel fonte para o painel oposto.
 * Convenção alinhada com lateralDowels: eixo X da lateral = profundidade; Y = altura.
 */
export function projectCavilhaHoleToTargetPanel(
  source: DesignPanel,
  target: DesignPanel,
  hole: { xMm: number; yMm: number; face: HoleFaceKind }
): { xMm: number; yMm: number } | null {
  const kind = resolvePanelPairKind(source.tipo, target.tipo);

  switch (kind) {
    case "lateral_horizontal": {
      const xOnHorizontal = isLeftLateral(source)
        ? edgeOffsetMm(source)
        : target.widthMm - edgeOffsetMm(source);
      return {
        xMm: clamp(xOnHorizontal, 0, target.widthMm),
        yMm: clamp(hole.xMm, 0, target.heightMm),
      };
    }
    case "horizontal_lateral": {
      const yOnLateral =
        source.tipo === "fundo"
          ? edgeOffsetMm(target)
          : target.heightMm - edgeOffsetMm(target);
      return {
        xMm: clamp(hole.yMm, 0, target.widthMm),
        yMm: clamp(yOnLateral, 0, target.heightMm),
      };
    }
    case "prateleira_lateral": {
      const shelfHeight = source.positionMm?.y ?? hole.xMm;
      return {
        xMm: clamp(hole.yMm, 0, target.widthMm),
        yMm: clamp(shelfHeight, 0, target.heightMm),
      };
    }
    case "lateral_prateleira": {
      const xOnShelf = isLeftLateral(source)
        ? edgeOffsetMm(source)
        : target.widthMm - edgeOffsetMm(source);
      return {
        xMm: clamp(xOnShelf, 0, target.widthMm),
        yMm: clamp(hole.xMm, 0, target.heightMm),
      };
    }
    default:
      return null;
  }
}

export type InsertDesignHoleResult = {
  box: IndustrialDesignBox;
  hole: DesignDrillHole;
  pairedHole?: DesignDrillHole;
  pairedPanelId?: string;
};

/**
 * Insere furo no painel e, se for cavilha com constraint, gera o par na peça oposta.
 */
export function insertDesignHoleWithCavilhaPairing(
  box: IndustrialDesignBox,
  panelId: string,
  holeTypeId: HoleTypeId,
  xMm: number,
  yMm: number,
  face: HoleFaceKind
): InsertDesignHoleResult {
  const sourcePanel = findDesignPanel(box, panelId);
  if (!sourcePanel) {
    throw new Error(`Painel não encontrado: ${panelId}`);
  }

  assertDesignOperationAllowed(
    validateHoleInsertion(box, panelId, holeTypeId, xMm, yMm)
  );

  const catalog = getHoleTypeById(holeTypeId);
  const primaryId = nextDesignId("hole");

  let pairedHole: DesignDrillHole | undefined;
  let pairedPanelId: string | undefined;

  const pairedTypeId = catalog.uso === "cavilha" ? getPairedHoleTypeId(holeTypeId) : undefined;

  if (pairedTypeId) {
    const target = resolveCavilhaConstraintTarget(box, panelId, { xMm, yMm });
    if (target) {
      const projected = projectCavilhaHoleToTargetPanel(
        sourcePanel,
        target.targetPanel,
        { xMm, yMm, face }
      );
      if (projected) {
        const pairedCatalog = getHoleTypeById(pairedTypeId);
        assertDesignOperationAllowed(
          validateHolePlacement(
            target.targetPanel,
            pairedTypeId,
            projected.xMm,
            projected.yMm
          )
        );
        const pairedId = nextDesignId("hole");
        pairedHole = {
          id: pairedId,
          holeTypeId: pairedTypeId,
          xMm: projected.xMm,
          yMm: projected.yMm,
          face: pairedCatalog.face,
          pairedHoleId: primaryId,
        };
        pairedPanelId = target.targetPanel.id;
      }
    }
  }

  const primary: DesignDrillHole = {
    id: primaryId,
    holeTypeId,
    xMm,
    yMm,
    face,
    pairedHoleId: pairedHole?.id,
  };

  const panels = box.panels.map((panel) => {
    if (panel.id === panelId) {
      return { ...panel, drillHoles: [...panel.drillHoles, primary] };
    }
    if (pairedPanelId && pairedHole && panel.id === pairedPanelId) {
      return { ...panel, drillHoles: [...panel.drillHoles, pairedHole] };
    }
    return panel;
  });

  return {
    box: { ...box, panels },
    hole: primary,
    pairedHole,
    pairedPanelId,
  };
}
