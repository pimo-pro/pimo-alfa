/**
 * Operações sobre o modelo de design industrial (caixa + painéis + furos).
 */

import type { HoleTypeId } from "../drill/holeCatalog";
import { insertDesignHoleWithCavilhaPairing } from "./cavilhaPairing";
import {
  assertDesignOperationAllowed,
  autoAdjustPanelToInnerSpace,
  validateIndustrialDesignBox,
  validatePanelState,
} from "./geometryValidation";
import type {
  DesignDrillHole,
  DesignPanel,
  DesignPanelTipo,
  IndustrialDesignBox,
  PanelConstraint,
} from "./types";

let _idCounter = 0;

export function nextDesignId(prefix: string): string {
  _idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${_idCounter}`;
}

export type CreateDesignBoxInput = {
  id?: string;
  nome?: string;
  outerWidthMm: number;
  outerHeightMm: number;
  outerDepthMm: number;
  espessuraMm?: number;
  materialId?: string;
};

/** Cria caixa vazia com painéis estruturais padrão (cima, fundo, laterais, costa). */
export function createIndustrialDesignBox(input: CreateDesignBoxInput): IndustrialDesignBox {
  const espessura = input.espessuraMm ?? 19;
  const boxId = input.id ?? nextDesignId("design-box");
  const innerW = Math.max(1, input.outerWidthMm - 2 * espessura);
  const innerH = Math.max(1, input.outerHeightMm - 2 * espessura);
  const innerD = Math.max(1, input.outerDepthMm - espessura);

  const panels: DesignPanel[] = [
    makeStructuralPanel("cima", boxId, innerW, innerD, espessura, input.materialId ?? "default"),
    makeStructuralPanel("fundo", boxId, innerW, innerD, espessura, input.materialId ?? "default"),
    makeStructuralPanel("lateral", boxId, innerD, innerH, espessura, input.materialId ?? "default", "le"),
    makeStructuralPanel("lateral", boxId, innerD, innerH, espessura, input.materialId ?? "default", "ld"),
    makeStructuralPanel("costa", boxId, innerW, innerH, 10, input.materialId ?? "default"),
  ];

  const constraints: PanelConstraint[] = [
    {
      id: nextDesignId("constraint"),
      panelAId: panels[0].id,
      panelBId: panels[2].id,
      tipo: "encaixe_cavilha",
    },
    {
      id: nextDesignId("constraint"),
      panelAId: panels[0].id,
      panelBId: panels[3].id,
      tipo: "encaixe_cavilha",
    },
    {
      id: nextDesignId("constraint"),
      panelAId: panels[1].id,
      panelBId: panels[2].id,
      tipo: "encaixe_cavilha",
    },
    {
      id: nextDesignId("constraint"),
      panelAId: panels[1].id,
      panelBId: panels[3].id,
      tipo: "encaixe_cavilha",
    },
  ];

  return {
    id: boxId,
    nome: input.nome ?? "Modelo em design",
    outerWidthMm: input.outerWidthMm,
    outerHeightMm: input.outerHeightMm,
    outerDepthMm: input.outerDepthMm,
    espessuraMm: espessura,
    materialId: input.materialId ?? "default",
    panels,
    constraints,
  };
}

function makeStructuralPanel(
  tipo: DesignPanelTipo,
  boxId: string,
  widthMm: number,
  heightMm: number,
  thicknessMm: number,
  materialId: string,
  suffix?: string
): DesignPanel {
  const label = suffix ? `${tipo}-${suffix}` : tipo;
  return {
    id: `${boxId}:${label}`,
    tipo,
    widthMm,
    heightMm,
    thicknessMm,
    materialId,
    drillHoles: [],
  };
}

export function findDesignPanel(box: IndustrialDesignBox, panelId: string): DesignPanel | undefined {
  return box.panels.find((p) => p.id === panelId);
}

export function getInnerDimensions(box: IndustrialDesignBox): {
  larguraInterna: number;
  alturaInterna: number;
  profundidadeInterna: number;
} {
  const e = box.espessuraMm;
  return {
    larguraInterna: Math.max(0, box.outerWidthMm - 2 * e),
    alturaInterna: Math.max(0, box.outerHeightMm - 2 * e),
    profundidadeInterna: Math.max(0, box.outerDepthMm - e),
  };
}

export function addDesignDrillHole(
  box: IndustrialDesignBox,
  panelId: string,
  hole: Omit<DesignDrillHole, "id">
): { box: IndustrialDesignBox; hole: DesignDrillHole } {
  const holeWithId: DesignDrillHole = { ...hole, id: nextDesignId("hole") };
  const panels = box.panels.map((panel) =>
    panel.id === panelId
      ? { ...panel, drillHoles: [...panel.drillHoles, holeWithId] }
      : panel
  );
  return {
    box: { ...box, panels },
    hole: holeWithId,
  };
}

export function addDesignPanel(
  box: IndustrialDesignBox,
  panel: Omit<DesignPanel, "id" | "drillHoles"> & { id?: string }
): IndustrialDesignBox {
  const newPanel: DesignPanel = {
    ...panel,
    id: panel.id ?? nextDesignId(panel.tipo),
    drillHoles: [],
  };
  const candidate = { ...box, panels: [...box.panels, newPanel] };
  assertDesignOperationAllowed(validateIndustrialDesignBox(candidate));
  return candidate;
}

export function updateDesignPanelDimensions(
  box: IndustrialDesignBox,
  panelId: string,
  dims: Partial<Pick<DesignPanel, "widthMm" | "heightMm" | "thicknessMm">>
): IndustrialDesignBox {
  const current = findDesignPanel(box, panelId);
  if (!current) return box;

  const proposed: DesignPanel = { ...current, ...dims };
  assertDesignOperationAllowed(validatePanelState(box, proposed));

  const panels = box.panels.map((p) => (p.id === panelId ? proposed : p));
  const candidate = { ...box, panels };
  assertDesignOperationAllowed(validateIndustrialDesignBox(candidate));
  return candidate;
}

export function updateDesignPanelPosition(
  box: IndustrialDesignBox,
  panelId: string,
  positionMm: DesignPanel["positionMm"]
): IndustrialDesignBox {
  const current = findDesignPanel(box, panelId);
  if (!current) return box;

  const proposed: DesignPanel = { ...current, positionMm };
  assertDesignOperationAllowed(validatePanelState(box, proposed));

  const panels = box.panels.map((p) => (p.id === panelId ? proposed : p));
  const candidate = { ...box, panels };
  assertDesignOperationAllowed(validateIndustrialDesignBox(candidate));
  return candidate;
}

/** Redimensiona prateleira/divisória para caber no espaço interno. */
export function applyAutoAdjustPanelToInnerSpace(
  box: IndustrialDesignBox,
  panelId: string
): IndustrialDesignBox {
  const panel = findDesignPanel(box, panelId);
  if (!panel) return box;
  const adjusted = autoAdjustPanelToInnerSpace(box, panel);
  return {
    ...box,
    panels: box.panels.map((p) => (p.id === panelId ? adjusted : p)),
  };
}

export function setActiveHoleOnPanel(
  box: IndustrialDesignBox,
  panelId: string,
  holeTypeId: HoleTypeId,
  xMm: number,
  yMm: number,
  face: DesignDrillHole["face"]
): { box: IndustrialDesignBox; hole: DesignDrillHole } {
  const result = insertDesignHoleWithCavilhaPairing(box, panelId, holeTypeId, xMm, yMm, face);
  return { box: result.box, hole: result.hole };
}

/** Remove furo (e par cavilha associado, se existir). */
export function removeDesignDrillHole(
  box: IndustrialDesignBox,
  panelId: string,
  holeId: string
): IndustrialDesignBox {
  const panel = findDesignPanel(box, panelId);
  const hole = panel?.drillHoles.find((h) => h.id === holeId);
  if (!hole) return box;

  const idsToRemove = new Set<string>([holeId]);
  if (hole.pairedHoleId) idsToRemove.add(hole.pairedHoleId);

  const panels = box.panels.map((p) => ({
    ...p,
    drillHoles: p.drillHoles
      .filter((h) => !idsToRemove.has(h.id))
      .map((h) =>
        h.pairedHoleId && idsToRemove.has(h.pairedHoleId)
          ? { ...h, pairedHoleId: undefined }
          : h
      ),
  }));

  return { ...box, panels };
}

export { insertDesignHoleWithCavilhaPairing } from "./cavilhaPairing";
export type { InsertDesignHoleResult } from "./cavilhaPairing";
