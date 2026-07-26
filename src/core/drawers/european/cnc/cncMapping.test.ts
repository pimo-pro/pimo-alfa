import { describe, expect, it } from "vitest";
import {
  buildCncFileName,
  CNC_FILE_BASE_NAMES,
  resolveCncPieceKeyFromCodigo,
} from "./cncFileNaming";
import {
  mapDxfLayerToCncGroup,
  mapHolePieceRefToCodigo,
  mapPieceBoxToCutOps,
} from "./cncMapping";

describe("cnc/cncMapping", () => {
  it("mapeia layers industriais para grupos CNC", () => {
    expect(mapDxfLayerToCncGroup("CUT")).toBe("CUT");
    expect(mapDxfLayerToCncGroup("DRILLING")).toBe("DRILL");
    expect(mapDxfLayerToCncGroup("FRONT")).toBe("FRONT");
    expect(mapDxfLayerToCncGroup("SIDES")).toBe("SIDES");
    expect(mapDxfLayerToCncGroup("BACK")).toBe("BACK");
    expect(mapDxfLayerToCncGroup("BOTTOM")).toBe("BOTTOM");
    expect(mapDxfLayerToCncGroup("DIMENSIONS")).toBe("META");
  });

  it("mapeia pieceRef de furos para códigos industriais", () => {
    expect(mapHolePieceRefToCodigo("front")).toBe("gav_fren");
    expect(mapHolePieceRefToCodigo("gav_lat_dir")).toBe("gav_lat_dir");
    expect(mapHolePieceRefToCodigo("bottom")).toBe("gav_fun");
    expect(mapHolePieceRefToCodigo("module_lat_esq")).toBeNull();
  });

  it("gera 4 CUT a partir de retângulo", () => {
    const cuts = mapPieceBoxToCutOps(100, 50);
    expect(cuts).toHaveLength(4);
    expect(cuts.every((c) => c.type === "CUT" && c.group === "CUT")).toBe(true);
  });

  it("naming CNC alinha com códigos industriais", () => {
    expect(resolveCncPieceKeyFromCodigo("gav_fren")).toBe("front");
    expect(resolveCncPieceKeyFromCodigo("gav_fun")).toBe("fundo");
    expect(buildCncFileName("gav_fren")).toBe("gav_fren.cnc");
    expect(buildCncFileName("gav_fun", { format: "mpr" })).toBe("gav_fundo.mpr");
    expect(CNC_FILE_BASE_NAMES.lat_dir).toBe("gav_lat_dir");
  });
});
