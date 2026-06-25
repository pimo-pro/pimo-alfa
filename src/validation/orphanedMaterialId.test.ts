import { describe, expect, it, beforeEach } from "vitest";
import { clearAllCutlistCache, cutlistComPrecoFromBox } from "../core/manufacturing/cutlistFromBoxes";
import { gerarPaineis } from "../core/manufacturing/boxManufacturing";
import { resolveMaterial, getDefaultOfficialMaterial } from "../core/materials/materials.api";
import { resolveIndustrialMaterialKey } from "../core/materials/materialsService";
import { defaultRulesConfig } from "../core/rules/rulesConfig";
import { buildDrawerScenario, minimalBoxWithDrawers } from "./drawerCertificationTestHelpers";
import type { BoxModule } from "../core/types";

const ORPHAN_UUID = "9ab518e3-ac9c-4b25-aeab-d1b4747a9ecb";
const DEFAULT_CANONICAL = getDefaultOfficialMaterial().canonicalId;

function boxWithOrphanMaterial(overrides: Partial<BoxModule> = {}): BoxModule {
  return {
    id: "box-orphan-mat",
    nome: "Caixa_Orphan",
    dimensoes: { largura: 600, altura: 720, profundidade: 560 },
    profundidadeExterna: 560,
    espessura: 19,
    gavetas: 0,
    prateleiras: 0,
    portaTipo: "sem_porta",
    material: ORPHAN_UUID,
    ...overrides,
  };
}

describe("materialId órfão do workspace", () => {
  beforeEach(() => {
    clearAllCutlistCache();
  });

  it("resolveIndustrialMaterialKey substitui UUID inexistente pelo material oficial", () => {
    expect(resolveMaterial(ORPHAN_UUID)).toBeNull();
    expect(resolveIndustrialMaterialKey(ORPHAN_UUID)).toBe(DEFAULT_CANONICAL);
  });

  it("gerarPaineis não lança com box.material órfão (peça CORPO)", () => {
    const box = boxWithOrphanMaterial();
    expect(() => gerarPaineis(box, defaultRulesConfig)).not.toThrow();
  });

  it("cutlist atribui canonicalId a todas as peças do corpo", () => {
    const box = boxWithOrphanMaterial();
    const items = cutlistComPrecoFromBox(box, defaultRulesConfig);
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.materialId).toBeTruthy();
      expect(resolveMaterial(item.materialId!)).not.toBeNull();
      expect(item.materialId).not.toBe(ORPHAN_UUID);
    }
  });

  it("gaveta com materialId órfão na layer resolve frente e corpo", () => {
    const { layers } = buildDrawerScenario({
      boxWidth: 600,
      boxHeight: 720,
      boxDepth: 560,
      drawerCount: 1,
      boxId: "box-drawer-orphan",
    });
    const orphanLayer = { ...layers[0]!, materialId: ORPHAN_UUID };
    const box = minimalBoxWithDrawers([orphanLayer], {
      material: ORPHAN_UUID,
      nome: "Gaveta_Orphan",
    });
    const items = cutlistComPrecoFromBox(box, defaultRulesConfig);
    const drawerPieces = items.filter((i) => i.tipo?.startsWith("gaveta_"));
    expect(drawerPieces.length).toBeGreaterThan(0);
    for (const piece of drawerPieces) {
      expect(piece.materialId).toBeTruthy();
      expect(resolveMaterial(piece.materialId!)).not.toBeNull();
    }
    const front = drawerPieces.find((p) => p.tipo === "gaveta_frente_ext");
    expect(front?.materialId).toBe(DEFAULT_CANONICAL);
  });
});
