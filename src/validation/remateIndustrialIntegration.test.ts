import { describe, expect, it, beforeEach } from "vitest";
import { clearAllCutlistCache } from "../core/manufacturing/cutlistFromBoxes";
import { buildCutlistItemsForIndustrialExport } from "../core/fabrication/buildCutlistItemsForIndustrialExport";
import { buildRemateCutlistItems } from "../core/remate/remateCutlist";
import { createRematePieces } from "../core/remate/rematePieceFactory";
import { makeDivSepTestBox } from "../core/divSep/divSepTestHelpers";
import { defaultRulesConfig } from "../core/rules/rulesConfig";
import { cutlistToPieces } from "../core/cutlayout/cutLayoutEngine";

function makeWorkspaceBox() {
  const box = makeDivSepTestBox({
    id: "box-remate-ind",
    nome: "Armario_Test",
  });
  return box as import("../core/types").WorkspaceBox;
}

describe("Remate — integração industrial (cutlist + QR + layout PRO)", () => {
  beforeEach(() => {
    clearAllCutlistCache();
  });

  it("gera etiquetas BOXNAME_REMATE_* na cutlist", () => {
    const wsBox = makeWorkspaceBox();
    const remates = createRematePieces(
      { productType: "COMPLETO", mountSlot: "DIR", parentBoxId: wsBox.id, followBox: true },
      {
        box: wsBox,
        materialPresetId: "mdf_branco",
        thicknessMm: 19,
        boxDimsM: { widthM: 0.6, heightM: 0.72, depthM: 0.56 },
      }
    );

    const cutlist = buildRemateCutlistItems(remates, [makeDivSepTestBox({ id: wsBox.id, nome: wsBox.nome })]);
    expect(cutlist.length).toBeGreaterThan(0);

    const dir = cutlist.find((i) => i.metadata?.remateKind === "DIR");
    expect(dir?.nome).toMatch(/^Armario_Test_REMATE_DIR_\d{2}$/);
    expect(dir?.metadata?.industrialLabel).toBe(dir?.nome);
    expect(dir?.tipo).toBe("remate");
  });

  it("remate L → MOD1_REMATE_L_A / L_B com grain YY nas laterais", () => {
    const wsBox = { ...makeWorkspaceBox(), nome: "MOD1" };
    const remates = createRematePieces(
      { productType: "L", mountSlot: "DIR", parentBoxId: wsBox.id, followBox: true },
      {
        box: wsBox,
        materialPresetId: "mdf_branco",
        thicknessMm: 19,
        boxDimsM: { widthM: 0.6, heightM: 0.72, depthM: 0.56 },
      }
    );

    const cutlist = buildRemateCutlistItems(remates, [makeDivSepTestBox({ id: wsBox.id, nome: "MOD1" })]);
    expect(cutlist).toHaveLength(2);

    const a = cutlist.find((i) => i.metadata?.remateKind === "L_A");
    const b = cutlist.find((i) => i.metadata?.remateKind === "L_B");
    expect(a?.nome).toBe("MOD1_REMATE_L_A_01");
    expect(b?.nome).toBe("MOD1_REMATE_L_B_01");
    expect(a?.grainDirection).toBe("YY");
    expect(b?.grainDirection).toBe("XX");
  });

  it("buildCutlistItemsForIndustrialExport inclui remates com shortCode e pieceNumber", () => {
    const box = makeDivSepTestBox({ id: "box-remate-ind", nome: "Armario_Test" });
    const wsBox = makeWorkspaceBox();
    const remates = createRematePieces(
      { productType: "AVISTA", mountSlot: "FRENTE", parentBoxId: wsBox.id, followBox: true },
      {
        box: wsBox,
        materialPresetId: "mdf_branco",
        thicknessMm: 19,
        boxDimsM: { widthM: 0.6, heightM: 0.72, depthM: 0.56 },
      }
    );

    const all = buildCutlistItemsForIndustrialExport({
      boxes: [box],
      rules: defaultRulesConfig,
      materialId: "mdf_branco",
      projectName: "NP001",
      remates,
    });

    const remateItems = all.filter((i) => i.tipo === "remate");
    expect(remateItems.length).toBeGreaterThan(0);
    for (const item of remateItems) {
      expect(item.nome).toMatch(/_REMATE_/);
      expect(item.shortCode).toBeTruthy();
      expect(item.shortCode).not.toBe("ERR");
      expect(item.pieceNumber).toBeGreaterThan(0);
      expect(item.grainDirection).toBe("XX");
    }
  });

  it("Layout PRO preserva metadata.industrialLabel no partName", () => {
    const wsBox = makeWorkspaceBox();
    const remates = createRematePieces(
      { productType: "COMPLETO", mountSlot: "ESQ", parentBoxId: wsBox.id, followBox: true },
      {
        box: wsBox,
        materialPresetId: "mdf_branco",
        thicknessMm: 19,
        boxDimsM: { widthM: 0.6, heightM: 0.72, depthM: 0.56 },
      }
    );
    const cutlist = buildRemateCutlistItems(remates, [makeDivSepTestBox({ id: wsBox.id, nome: wsBox.nome })]);
    const pieces = cutlistToPieces(cutlist, {
      projectName: "NP001",
      boxes: [{ id: wsBox.id, nome: wsBox.nome }],
    });
    expect(pieces.length).toBeGreaterThan(0);
    expect(pieces[0]?.partName).toMatch(/^Armario_Test_REMATE_ESQ_\d{2}$/);
    expect(pieces[0]?.industrialGrainCode).toBe("YY");
    expect(pieces[0]?.materialId).toBeTruthy();
  });
});
