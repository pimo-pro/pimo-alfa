import { describe, expect, it, beforeEach } from "vitest";
import { createWorkspaceBox, defaultState } from "../../context/projectState";
import {
  applyMaterialSync,
  buildIndustrialCutlistAfterMaterialSync,
  commitMaterialSync,
  invalidateMaterialCutlistCache,
} from "./materialSync";
import {
  clearAllCutlistCache,
  cutlistComPrecoFromBox,
} from "../manufacturing/cutlistFromBoxes";
import { buildBoxesFromWorkspace } from "../../context/projectState";
import { makeDivSepTestBox } from "../divSep/divSepTestHelpers";
import { defaultRulesConfig } from "../rules/rulesConfig";

function projectWithBox(overrides: {
  boxId?: string;
  material?: string;
  doorsLayer?: import("../../models/BoxLayers").DoorLayerItem[];
  drawersLayer?: import("../../models/BoxLayers").DrawerLayerItem[];
}) {
  const boxId = overrides.boxId ?? "box-1";
  const baseBox = createWorkspaceBox(
    boxId,
    "Caixa Teste",
    { largura: 600, altura: 720, profundidade: 560 },
    19,
    [],
    "reta",
    "recuado"
  );
  return {
    ...defaultState,
    workspaceBoxes: [
      {
        ...baseBox,
        material: overrides.material ?? "mdf_branco",
        doorsLayer: overrides.doorsLayer ?? baseBox.doorsLayer,
        drawersLayer: overrides.drawersLayer ?? baseBox.drawersLayer,
      },
    ],
    selectedWorkspaceBoxId: boxId,
  };
}

describe("materialSync", () => {
  beforeEach(() => {
    clearAllCutlistCache();
  });

  it("applyMaterialSync box — atualiza material e espessura industrial", () => {
    const project = projectWithBox({ boxId: "b1", material: "mdf_branco" });
    const sync = applyMaterialSync(project, {
      kind: "box",
      boxId: "b1",
      materialId: "carvalho",
    });

    expect(sync.affectedBoxIds).toEqual(["b1"]);
    expect(sync.workspaceBoxes[0]?.material).toBe("carvalho");
    expect(sync.workspaceBoxes[0]?.espessura).toBeGreaterThan(0);
  });

  it("applyMaterialSync door — propaga materialId e material na porta", () => {
    const doorId = "door-1";
    const project = projectWithBox({
      doorsLayer: [{ id: doorId, widthMm: 400, heightMm: 600, pivot: "left-edge" }],
    });
    const sync = applyMaterialSync(project, {
      kind: "door",
      boxId: "box-1",
      doorLayerId: doorId,
      materialId: "carvalho",
    });

    const door = sync.workspaceBoxes[0]?.doorsLayer?.[0];
    expect(door?.materialId).toBe("carvalho");
    expect(door?.material).toBe("carvalho");
    expect(sync.affectedBoxIds).toEqual(["box-1"]);
  });

  it("applyMaterialSync selection — aplica a box, porta e remate", () => {
    const project = {
      ...projectWithBox({
        doorsLayer: [{ id: "d1", widthMm: 400, heightMm: 600, pivot: "left-edge" }],
      }),
      remates: [
        {
          id: "r1",
          name: "Remate",
          materialPresetId: "mdf_branco",
          parentBoxId: "box-1",
          width: 600,
          height: 720,
          depth: 19,
          visible: true,
        } as import("../remate/rematePieceTypes").RematePiece,
      ],
    };

    const sync = applyMaterialSync(project, {
      kind: "selection",
      encodedIds: ["box:box-1", "door:d1", "remate:r1"],
      materialId: "carvalho",
    });

    expect(sync.workspaceBoxes[0]?.material).toBe("carvalho");
    expect(sync.workspaceBoxes[0]?.doorsLayer?.[0]?.materialId).toBe("carvalho");
    expect(sync.remates[0]?.materialPresetId).toBe("carvalho");
    expect(sync.affectedBoxIds).toContain("box-1");
    expect(sync.affectedRemateIds).toEqual(["r1"]);
  });

  it("commitMaterialSync — invalida cache e recalcula cutlist industrial", () => {
    const box = makeDivSepTestBox({ id: "sync-box" });
    const wsBox = createWorkspaceBox(
      "sync-box",
      box.nome,
      box.dimensoes,
      box.espessura,
      [],
      "reta",
      "integrado"
    );
    const project = {
      ...defaultState,
      rules: defaultRulesConfig,
      materialId: "mdf_branco",
      workspaceBoxes: [{ ...wsBox, material: "mdf_branco" }],
    };

    cutlistComPrecoFromBox(box, defaultRulesConfig, "mdf_branco");

    const { next, sync } = commitMaterialSync(project, {
      kind: "box",
      boxId: "sync-box",
      materialId: "carvalho",
    });

    expect(sync.affectedBoxIds).toEqual(["sync-box"]);
    expect(next.boxes.length).toBeGreaterThan(0);

    invalidateMaterialCutlistCache(next, sync);
    const afterBox = buildBoxesFromWorkspace(next)[0]!;
    const afterCutlist = cutlistComPrecoFromBox(afterBox, defaultRulesConfig, next.materialId);
    expect(afterCutlist.length).toBeGreaterThan(0);

    const industrial = buildIndustrialCutlistAfterMaterialSync(next);
    expect(industrial.length).toBeGreaterThan(0);
  });

  it("applyMaterialSync project — marca invalidação global de cache", () => {
    const sync = applyMaterialSync(defaultState, {
      kind: "project",
      material: { ...defaultState.material, tipo: "carvalho" },
    });
    expect(sync.invalidateGlobalCache).toBe(true);
    expect(sync.affectedBoxIds.length).toBe(defaultState.workspaceBoxes.length);
  });
});
