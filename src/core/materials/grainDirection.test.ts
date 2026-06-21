import { describe, expect, it } from "vitest";
import {
  industrialGrainToLayoutAxis,
  isGrainRotationLocked,
  resolveIndustrialGrainCode,
} from "./grainDirection";
import { isRotatablePiece } from "../cutlayout/utils/cutLayoutUtils";
import type { CutPiece } from "../cutlayout/cutLayoutTypes";

describe("resolveIndustrialGrainCode", () => {
  it("porta → YY", () => {
    expect(resolveIndustrialGrainCode({ tipo: "porta_simples" })).toBe("YY");
    expect(resolveIndustrialGrainCode({ tipo: "porta_dupla" })).toBe("YY");
    expect(resolveIndustrialGrainCode({ tipo: "porta_correr" })).toBe("YY");
  });

  it("frente de gaveta → YY", () => {
    expect(resolveIndustrialGrainCode({ tipo: "gaveta_frente" })).toBe("YY");
  });

  it("remate completo lateral DIR/ESQ → YY", () => {
    expect(
      resolveIndustrialGrainCode({
        tipo: "remate",
        remateProductType: "COMPLETO",
        remateTipo: "DIR",
      })
    ).toBe("YY");
    expect(
      resolveIndustrialGrainCode({
        tipo: "remate",
        remateProductType: "COMPLETO",
        remateTipo: "ESQ",
      })
    ).toBe("YY");
  });

  it("remate L — peça A lateral DIR/ESQ → YY; peça B → XX", () => {
    expect(
      resolveIndustrialGrainCode({
        tipo: "remate",
        remateProductType: "L",
        remateTipo: "L",
        remateMountSlot: "DIR",
      })
    ).toBe("YY");
    expect(
      resolveIndustrialGrainCode({
        tipo: "remate",
        remateProductType: "L",
        remateTipo: "L",
        remateMountSlot: "FRENTE",
      })
    ).toBe("XX");
  });

  it("remate à vista → XX", () => {
    expect(
      resolveIndustrialGrainCode({
        tipo: "remate",
        remateProductType: "AVISTA",
        remateTipo: "FRENTE",
      })
    ).toBe("XX");
  });

  it("remate RODAPE e roda pé → XX", () => {
    expect(
      resolveIndustrialGrainCode({
        tipo: "remate",
        remateProductType: "RODAPE",
        remateTipo: "RODAPE",
      })
    ).toBe("XX");
    expect(resolveIndustrialGrainCode({ tipo: "rodape" })).toBe("XX");
  });

  it("laterais, prateleiras e demais → XX", () => {
    expect(resolveIndustrialGrainCode({ tipo: "lateral_esquerda" })).toBe("XX");
    expect(resolveIndustrialGrainCode({ tipo: "lateral_direita" })).toBe("XX");
    expect(resolveIndustrialGrainCode({ tipo: "prateleira" })).toBe("XX");
    expect(resolveIndustrialGrainCode({ tipo: "cima" })).toBe("XX");
    expect(resolveIndustrialGrainCode({ tipo: "gaveta_lat_esq" })).toBe("XX");
  });

  it("remate completo CIMA/FRENTE → XX", () => {
    expect(
      resolveIndustrialGrainCode({
        tipo: "remate",
        remateProductType: "COMPLETO",
        remateTipo: "CIMA",
      })
    ).toBe("XX");
  });
});

describe("isGrainRotationLocked", () => {
  it("YY bloqueia rotação", () => {
    expect(isGrainRotationLocked("YY")).toBe(true);
    expect(isGrainRotationLocked("XX")).toBe(false);
    expect(isGrainRotationLocked(undefined)).toBe(false);
  });
});

describe("industrialGrainToLayoutAxis", () => {
  it("YY frente gaveta → length", () => {
    expect(industrialGrainToLayoutAxis("YY", "gaveta_frente")).toBe("length");
  });
  it("YY porta → width", () => {
    expect(industrialGrainToLayoutAxis("YY", "porta_simples")).toBe("width");
  });
});

describe("isRotatablePiece com industrialGrainCode", () => {
  const base: CutPiece = {
    largura_mm: 600,
    altura_mm: 400,
    espessura_mm: 19,
    quantidade: 1,
    boxId: "b1",
    partName: "test",
  };

  it("YY não roda", () => {
    expect(
      isRotatablePiece({
        ...base,
        industrialGrainCode: "YY",
        grainDirection: "width",
      })
    ).toBe(false);
  });

  it("XX roda quando geometria permite", () => {
    expect(
      isRotatablePiece({
        ...base,
        industrialGrainCode: "XX",
      })
    ).toBe(true);
  });
});
