import { describe, expect, it } from "vitest";
import { getStructuralBoundsM } from "../../src/core/remate/rematePlacement";
import { resolveRematePoseLocal, snapToMountRule } from "../../src/core/remate/remateMountFrame";
import {
  getRemateSavedPoseLocal,
  markRematePlacementSettled,
  shouldResolveRematePoseFromBounds,
  shouldSkipRemateUpgradeSnap,
  stabilizeRemateForPersistence,
} from "../../src/core/remate/remateTransformStability";
import { upgradeRematesAfterLoad } from "../../src/core/remate/rematePieceMigration";
import { createRematePieces } from "../../src/core/remate/rematePieceFactory";
import { serializeState, reviveState } from "../../src/context/projectPersistence";
import { defaultState } from "../../src/context/projectState";
import { makeDivSepTestBox } from "../../src/core/divSep/divSepTestHelpers";
import type { RematePiece } from "../../src/core/remate/rematePieceTypes";
import { computeRodapePlacementLocal } from "../../src/core/rodape/rodapePlacement";
import {
  hasSavedRodapeTransform,
  rodapeTransformFromPlacementLocal,
  stabilizeRodapeForPersistence,
} from "../../src/core/rodape/rodapeTransformStability";
import { upgradeRodapesAfterLoad } from "../../src/core/rodape/rodapePieceMigration";
import type { ProjectRodape } from "../../src/core/rodape/rodapeTypes";
import { buildDesignState } from "../../src/context/projectState";

const bounds = getStructuralBoundsM(0.6, 0.72, 0.6);
const boundsAlt = getStructuralBoundsM(0.8, 0.9, 0.7);

function baseRemate(overrides: Partial<RematePiece> = {}): RematePiece {
  return {
    id: "remate-test",
    tipo: "DIR",
    width: 19,
    height: 760,
    depth: 100,
    materialPresetId: "mdf_branco",
    position: { xMm: 310, yMm: 120, zMm: 330 },
    rotation: { xRad: 0, yRad: 0.1, zRad: 0 },
    followBox: true,
    placementMode: "SNAPPED",
    faceOffsets: {
      offsetAlongNormalMm: 9.5,
      offsetTangentUMm: 380,
      offsetTangentVMm: 0,
      rotationSnapIndex: 0,
    },
    name: "TEST_REMATE",
    isInitialPlacement: false,
    transform: {
      xMm: 310,
      yMm: 120,
      zMm: 330,
      rotacaoXRad: 0,
      rotacaoYRad: 0.1,
      rotacaoZRad: 0,
    },
    ...overrides,
  };
}

function baseRodape(overrides: Partial<ProjectRodape> = {}): ProjectRodape {
  return {
    id: "rodape-test",
    parentBoxId: "box-1",
    kind: "SIMPLE",
    materialId: "mdf_branco",
    thicknessMm: 19,
    heightMm: 150,
    dimensions: { widthMm: 600, heightMm: 150, depthMm: 19 },
    name: "TEST_RODAPE",
    placementFree: false,
    visible: true,
    isInitialPlacement: false,
    transform: {
      xMm: 0,
      yMm: -371,
      zMm: 309,
      rotacaoXRad: 0,
      rotacaoYRad: 0,
      rotacaoZRad: 0,
    },
    ...overrides,
  };
}

describe("REMATE / RODA PÉ — integridade de transform", () => {
  it("resolveRematePoseLocal não recalcula a partir dos bounds quando transform guardado", () => {
    const piece = baseRemate();
    expect(shouldResolveRematePoseFromBounds(piece)).toBe(false);
    const saved = getRemateSavedPoseLocal(piece);
    const fromBounds = resolveRematePoseLocal(piece, boundsAlt);
    expect(fromBounds.position).toEqual(saved.position);
    expect(fromBounds.rotation).toEqual(saved.rotation);
  });

  it("upgradeRematesAfterLoad preserva posição/rotação/offsets de REMATE L SNAPPED", () => {
    const wsBox = makeDivSepTestBox({ id: "box-1", nome: "MOD1" });
    const remates = createRematePieces(
      { productType: "L", mountSlot: "CIMA", parentBoxId: wsBox.id, followBox: true },
      {
        box: wsBox,
        materialPresetId: "mdf_branco",
        thicknessMm: 19,
        boxDimsM: { widthM: 0.6, heightM: 0.72, depthM: 0.6 },
      }
    );
    const before = remates.map((r) => ({
      id: r.id,
      position: { ...r.position },
      rotation: { ...r.rotation },
      faceOffsets: r.faceOffsets ? { ...r.faceOffsets } : undefined,
      transform: r.transform ? { ...r.transform } : undefined,
    }));

    const after = upgradeRematesAfterLoad(remates, [wsBox]);
    for (const prev of before) {
      const next = after.find((r) => r.id === prev.id)!;
      expect(next.position).toEqual(prev.position);
      expect(next.rotation).toEqual(prev.rotation);
      expect(next.faceOffsets).toEqual(prev.faceOffsets);
      expect(shouldSkipRemateUpgradeSnap(next)).toBe(true);
    }
  });

  it("serialize/revive + buildDesignState preservam remates e rodapes", () => {
    const wsBox = makeDivSepTestBox({ id: "box-1", nome: "MOD1" });
    const remate = baseRemate({ parentBoxId: wsBox.id });
    const rodape = baseRodape({ parentBoxId: wsBox.id });
    const state = {
      ...defaultState,
      workspaceBoxes: [wsBox],
      remates: [remate],
      rodapes: [rodape],
      boxes: [],
    };
    const withDesign = { ...state, ...buildDesignState({ ...state, boxes: [wsBox as never] }) };
    const serialized = serializeState(withDesign);
    const revived = reviveState(serialized);
    expect(revived?.remates?.[0]?.position).toEqual(remate.position);
    expect(revived?.remates?.[0]?.rotation).toEqual(remate.rotation);
    expect(revived?.remates?.[0]?.faceOffsets).toEqual(remate.faceOffsets);
    expect(revived?.remates?.[0]?.transform).toEqual(stabilizeRemateForPersistence(remate).transform);
    expect(revived?.rodapes?.[0]?.transform).toEqual(stabilizeRodapeForPersistence(rodape).transform);
  });

  it("computeRodapePlacementLocal fora da criação devolve transform guardado", () => {
    const rodape = baseRodape();
    expect(hasSavedRodapeTransform(rodape)).toBe(true);
    const local = computeRodapePlacementLocal(rodape, boundsAlt, false);
    expect(local.position[0]).toBeCloseTo(0, 3);
    expect(local.position[1]).toBeCloseTo(-0.371, 3);
    expect(local.position[2]).toBeCloseTo(0.309, 3);
  });

  it("snap inicial marca peça como settled e impede re-snap posterior", () => {
    const snapped = markRematePlacementSettled(
      snapToMountRule(
        baseRemate({
          isInitialPlacement: true,
          placementMode: "SNAPPED",
          faceOffsets: undefined,
          transform: undefined,
        }),
        bounds
      )
    );
    expect(snapped.isInitialPlacement).toBe(false);
    expect(snapped.transform).toBeDefined();
    const poseBefore = getRemateSavedPoseLocal(snapped);
    const poseAfter = resolveRematePoseLocal(snapped, boundsAlt);
    expect(poseAfter).toEqual(poseBefore);
  });

  it("upgradeRodapesAfterLoad preserva transform existente", () => {
    const wsBox = makeDivSepTestBox({ id: "box-1", nome: "MOD1" });
    const rodape = baseRodape();
    const [upgraded] = upgradeRodapesAfterLoad([rodape], [wsBox]);
    expect(upgraded.transform).toEqual(rodape.transform);
  });

  it("migração única de rodapé legacy sem transform", () => {
    const wsBox = makeDivSepTestBox({ id: "box-1", nome: "MOD1" });
    const legacy = baseRodape({ transform: undefined, isInitialPlacement: undefined });
    const widthM = Math.max(0.001, (wsBox.dimensoes?.largura ?? 600) / 1000);
    const heightM = Math.max(0.001, (wsBox.dimensoes?.altura ?? 720) / 1000);
    const depthM = Math.max(0.001, (wsBox.dimensoes?.profundidade ?? 600) / 1000);
    const boxBounds = getStructuralBoundsM(widthM, heightM, depthM);
    const [upgraded] = upgradeRodapesAfterLoad([legacy], [wsBox]);
    const expectedLocal = computeRodapePlacementLocal(legacy, boxBounds, true);
    expect(upgraded.transform).toEqual(rodapeTransformFromPlacementLocal(expectedLocal));
    const [again] = upgradeRodapesAfterLoad([upgraded], [wsBox]);
    expect(again.transform).toEqual(upgraded.transform);
  });
});
