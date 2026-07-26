import { describe, expect, it } from "vitest";
import {
  buildDxfFileName,
  resolvePieceKeyFromCodigo,
  DXF_FILE_NAMES,
} from "./dxfFileNaming";

describe("dxf/export/dxfFileNaming", () => {
  it("mapeia codigos industriais para nomes de ficheiro", () => {
    expect(resolvePieceKeyFromCodigo("gav_fren")).toBe("front");
    expect(resolvePieceKeyFromCodigo("gav_1_fren")).toBe("front");
    expect(resolvePieceKeyFromCodigo("gav_lat_dir")).toBe("lat_dir");
    expect(resolvePieceKeyFromCodigo("gav_lat_esq")).toBe("lat_esq");
    expect(resolvePieceKeyFromCodigo("gav_costa")).toBe("costa");
    expect(resolvePieceKeyFromCodigo("gav_fun")).toBe("fundo");

    expect(buildDxfFileName("gav_fren")).toBe(DXF_FILE_NAMES.front);
    expect(buildDxfFileName("gav_lat_dir")).toBe("GAVETA_LAT_DIR.dxf");
    expect(buildDxfFileName("gav_costa", { prefix: "CX01" })).toBe("CX01_GAVETA_COSTA.dxf");
  });
});
