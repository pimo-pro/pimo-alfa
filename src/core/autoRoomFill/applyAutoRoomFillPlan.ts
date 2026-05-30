import type { ProjectState } from "../../context/projectTypes";
import { appendChangelog, applyResultados, createWorkspaceBox } from "../../context/projectState";
import { getNextWorkspaceBoxId, isLowerCabinet, isUpperCabinet } from "../../context/projectHelpers";
import { getBaseCabinetById, modelToPortaTipo } from "../baseCabinets";
import { isCornerFixedFrontModel } from "../cornerCabinet";
import { isPiBaseCabinetId } from "../../data/moveisUnificados/pi/models";
import { createHematisForBox } from "../hemati/hematiFactory";
import { createRodapesForBox } from "../rodape/rodapeFactory";
import { createRematesForBox } from "../remate/remateFactory";
import { getMaterialByIdOrLabel } from "../materials/service";
import { HEMATI_DEFAULT_THICKNESS_MM } from "../kitchenFinish/finishTypes";
import type { AutoFillApplyResult } from "./autoRoomFillTypes";
import type { AutoFillPlan } from "./autoRoomFillTypes";
import { generateAutoRoomFillPlan } from "./generateAutoRoomFillPlan";

function buildBoxFromCatalog(
  prev: ProjectState,
  placed: import("./autoRoomFillTypes").AutoFillPlacedModule,
  boxId: string
) {
  const baseModel = getBaseCabinetById(placed.catalogId);
  if (!baseModel) return null;

  const isUpperModel = baseModel.categoria === "upper";
  const isPiModel = isPiBaseCabinetId(baseModel.id) || baseModel.grupoCatalogo === "pi";
  const baseEspessura = prev.material.espessura;
  let largura = baseModel.widthMm;
  if (placed.trimWidthMm && placed.trimWidthMm > 0) {
    largura = Math.max(280, largura - placed.trimWidthMm);
  }

  const dimensoes = {
    largura,
    altura: baseModel.heightMm,
    profundidade: baseModel.depthMm,
  };

  const box = createWorkspaceBox(
    boxId,
    baseModel.nome,
    dimensoes,
    baseEspessura,
    placed.posicaoX_mm,
    [],
    "reta",
    "recuado",
    placed.catalogId,
    {
      prateleiras: baseModel.shelves,
      portaTipo: modelToPortaTipo(baseModel.doors),
      gavetas: isPiModel ? 0 : baseModel.drawers,
      cabinetType: isUpperModel ? "upper" : "lower",
      feetEnabled: !isUpperModel,
      feetHeight: 100,
      feetOffsetFront: 100,
      drawerHeightMode: isPiModel ? "custom" : "equal",
      cornerFixedFront: isCornerFixedFrontModel(baseModel.id),
    }
  );

  box.manualPosition = true;
  box.posicaoX_mm = placed.posicaoX_mm;
  box.posicaoY_mm = placed.posicaoY_mm;
  box.posicaoZ_mm = placed.posicaoZ_mm;
  box.rotacaoY = placed.rotacaoY_rad;
  box.autoRotateEnabled = false;
  if (isUpperModel) {
    box.cabinetType = "upper";
    box.feetEnabled = false;
    box.feetHeight = 0;
  }
  return box;
}

export function applyAutoRoomFillPlan(prev: ProjectState, plan: AutoFillPlan): AutoFillApplyResult {
  const materialId = prev.materialId || prev.material.tipo;
  const material = getMaterialByIdOrLabel(materialId);
  const thicknessMm =
    Number(material?.espessura ?? prev.material.espessura ?? HEMATI_DEFAULT_THICKNESS_MM) || 19;

  let workspaceBoxes = [...prev.workspaceBoxes];
  let remates = [...(prev.remates ?? [])];
  let hematis = [...(prev.hematis ?? [])];
  let rodapes = [...(prev.rodapes ?? [])];

  const createdBoxIds: string[] = [];
  const createdRemateIds: string[] = [];
  const createdHematiIds: string[] = [];
  const createdRodapeIds: string[] = [];

  const boxesByIndex: import("../types").WorkspaceBox[] = [];

  for (const placed of plan.modules) {
    const { id: newBoxId } = getNextWorkspaceBoxId(workspaceBoxes);
    const box = buildBoxFromCatalog(prev, placed, newBoxId);
    if (!box) continue;
    workspaceBoxes = [...workspaceBoxes, box];
    boxesByIndex.push(box);
    createdBoxIds.push(box.id);
  }

  for (const finish of plan.finishes) {
    const box = boxesByIndex[finish.boxIndex];
    if (!box) continue;
    const remateCount = remates.filter((r) => r.parentBoxId === box.id).length;
    const hematiCount = hematis.filter((h) => h.parentBoxId === box.id).length;
    const rodapeCount = rodapes.filter((r) => r.parentBoxId === box.id).length;

    if (finish.remateL) {
      const created = createRematesForBox({
        box,
        input: { type: "L", position: "dir", materialId },
        materialId,
        thicknessMm,
        existingCount: remateCount,
      });
      remates = [...remates, ...created];
      createdRemateIds.push(...created.map((r) => r.id));
      workspaceBoxes = workspaceBoxes.map((b) =>
        b.id === box.id ? { ...b, remateIds: [...(b.remateIds ?? []), ...created.map((r) => r.id)] } : b
      );
    }
    if (finish.remateDir) {
      const created = createRematesForBox({
        box,
        input: { type: "avista", position: "dir", materialId },
        materialId,
        thicknessMm,
        existingCount: remateCount,
      });
      remates = [...remates, ...created];
      createdRemateIds.push(...created.map((r) => r.id));
    }
    if (finish.remateEsq) {
      const created = createRematesForBox({
        box,
        input: { type: "avista", position: "esq", materialId },
        materialId,
        thicknessMm,
        existingCount: remateCount + 1,
      });
      remates = [...remates, ...created];
      createdRemateIds.push(...created.map((r) => r.id));
    }

    if (finish.hematiDir && isLowerCabinet(box)) {
      const created = createHematisForBox({
        box,
        allBoxes: workspaceBoxes,
        room: prev.room,
        roomBoundsM: null,
        input: { kind: "DIR", parentBoxId: box.id, materialId },
        materialId,
        thicknessMm,
        existingCount: hematiCount,
      });
      hematis = [...hematis, ...created];
      createdHematiIds.push(...created.map((h) => h.id));
    }
    if (finish.hematiEsq && isLowerCabinet(box)) {
      const created = createHematisForBox({
        box,
        allBoxes: workspaceBoxes,
        room: prev.room,
        roomBoundsM: null,
        input: { kind: "ESQ", parentBoxId: box.id, materialId },
        materialId,
        thicknessMm,
        existingCount: hematiCount + 1,
      });
      hematis = [...hematis, ...created];
      createdHematiIds.push(...created.map((h) => h.id));
    }
    if (finish.hematiCima && isUpperCabinet(box)) {
      const created = createHematisForBox({
        box,
        allBoxes: workspaceBoxes,
        room: prev.room,
        roomBoundsM: null,
        input: { kind: "CIMA", parentBoxId: box.id, materialId },
        materialId,
        thicknessMm,
        existingCount: hematiCount,
      });
      hematis = [...hematis, ...created];
      createdHematiIds.push(...created.map((h) => h.id));
    }

    if (finish.rodapeSimple && isLowerCabinet(box)) {
      const created = createRodapesForBox({
        box,
        allBoxes: workspaceBoxes,
        room: prev.room,
        roomBoundsM: null,
        input: { kind: "SIMPLE", parentBoxId: box.id, materialId },
        materialId,
        thicknessMm,
        heightMm: 150,
        existingCount: rodapeCount,
      });
      rodapes = [...rodapes, ...created];
      createdRodapeIds.push(...created.map((r) => r.id));
    }
  }

  const summary = plan.summaryLines.join("\n");
  const lastRun = {
    lastRunAt: new Date().toISOString(),
    summary,
    createdBoxIds,
    createdRemateIds,
    createdHematiIds,
    createdRodapeIds,
    wallSummaries: plan.wallSummaries,
  };

  const next = applyResultados({
    ...prev,
    workspaceBoxes,
    remates,
    hematis,
    rodapes,
    autoFill: lastRun,
    selectedWorkspaceBoxId: createdBoxIds[0] ?? prev.selectedWorkspaceBoxId,
    changelog: appendChangelog(prev.changelog, {
      timestamp: new Date(),
      type: "box",
      message: `Auto-Room-Fill: ${createdBoxIds.length} módulos`,
    }),
  });

  return {
    state: next,
    createdBoxIds,
    createdRemateIds,
    createdHematiIds,
    createdRodapeIds,
    summary,
  };
}

export function runAutoRoomFillOnState(prev: ProjectState): AutoFillApplyResult | null {
  const plan = generateAutoRoomFillPlan(prev.room);
  if (!plan || plan.modules.length === 0) return null;
  return applyAutoRoomFillPlan(prev, plan);
}
