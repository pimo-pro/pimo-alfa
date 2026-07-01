import { describe, expect, it } from "vitest";
import {
  buildRemateIndustrialLabel,
  buildRemateIndustrialLabelsForRemates,
  resolveRemateIndustrialSuffix,
  resolveRematePieceDisplayName,
  resolveRematePieceNomeForRemate,
} from "./labels";
import type { RematePiece } from "./rematePieceTypes";

function remate(partial: Partial<RematePiece> & Pick<RematePiece, "id" | "tipo">): RematePiece {
  return {
    name: "legacy",
    width: 600,
    height: 720,
    depth: 19,
    visible: true,
    materialPresetId: "mdf_branco",
    ...partial,
  } as RematePiece;
}

describe("remate industrial labels", () => {
  it("buildRemateIndustrialLabel — formato BOXNAME_REMATE_SUFFIX_NN", () => {
    expect(buildRemateIndustrialLabel("Armario Test", "DIR", 1)).toBe("Armario_Test_REMATE_DIR_01");
    expect(buildRemateIndustrialLabel("MOD1", "L_ext", 2)).toBe("MOD1_REMATE_L_ext_02");
  });

  it("resolveRemateIndustrialSuffix — L, laterais e AVISTA", () => {
    expect(resolveRemateIndustrialSuffix(remate({ id: "1", tipo: "L", productType: "L", partIndex: 1 }))).toBe(
      "L_ext"
    );
    expect(resolveRemateIndustrialSuffix(remate({ id: "2", tipo: "L", productType: "L", partIndex: 2 }))).toBe(
      "L_int"
    );
    expect(resolveRemateIndustrialSuffix(remate({ id: "3", tipo: "DIR", productType: "COMPLETO" }))).toBe("DIR");
    expect(resolveRemateIndustrialSuffix(remate({ id: "4", tipo: "FRENTE", productType: "AVISTA" }))).toBe("FRENTE");
  });

  it("buildRemateIndustrialLabelsForRemates — indexação por caixa e suffix", () => {
    const remates = [
      remate({ id: "r1", tipo: "DIR", productType: "COMPLETO", parentBoxId: "b1" }),
      remate({ id: "r2", tipo: "DIR", productType: "COMPLETO", parentBoxId: "b1" }),
      remate({ id: "r3", tipo: "ESQ", productType: "COMPLETO", parentBoxId: "b1" }),
    ];
    const labels = buildRemateIndustrialLabelsForRemates(remates, { b1: "MOD1" });
    expect(labels.get("r1")).toBe("MOD1_REMATE_DIR_01");
    expect(labels.get("r2")).toBe("MOD1_REMATE_DIR_02");
    expect(labels.get("r3")).toBe("MOD1_REMATE_ESQ_01");
  });

  it("resolveRematePieceDisplayName — personalizado ou automático", () => {
    const piece = remate({
      id: "r1",
      tipo: "DIR",
      productType: "COMPLETO",
      parentBoxId: "b1",
      nomePersonalizado: "REMATE_CUSTOM",
    });
    expect(resolveRematePieceDisplayName(piece, "MOD1_REMATE_DIR_01")).toBe("REMATE_CUSTOM");
    expect(resolveRematePieceNomeForRemate(piece, { b1: "MOD1" })).toBe("REMATE_CUSTOM");

    const auto = remate({ id: "r2", tipo: "DIR", productType: "COMPLETO", parentBoxId: "b1" });
    expect(resolveRematePieceNomeForRemate(auto, { b1: "MOD1" })).toBe("MOD1_REMATE_DIR_01");
  });
});
