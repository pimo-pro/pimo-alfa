import { describe, expect, it } from "vitest";
import { buildDrawerIndustrialLabel, DRAWER_PIECE_INDUSTRIAL_TOKEN } from "../drawers/drawerIndustrialLabels";

describe("drawerIndustrialLabels", () => {
  it("expõe tokens canónicos por tipo", () => {
    expect(DRAWER_PIECE_INDUSTRIAL_TOKEN.gaveta_lat_esq).toBe("gav_lat_esq");
    expect(DRAWER_PIECE_INDUSTRIAL_TOKEN.gaveta_traseira).toBe("gav_cost");
    expect(DRAWER_PIECE_INDUSTRIAL_TOKEN.gaveta_frente_int).toBe("gav_frent_int");
    expect(DRAWER_PIECE_INDUSTRIAL_TOKEN.gaveta_frente_ext).toBe("gav_frent_ext");
    expect(DRAWER_PIECE_INDUSTRIAL_TOKEN.gaveta_frente).toBe("gav_frent");
  });

  it("gera labels únicos por gaveta", () => {
    expect(buildDrawerIndustrialLabel("Armário Teste", "gaveta_lat_esq", 1)).toBe(
      "Armrio_Teste_gav_lat_esq_01"
    );
    expect(buildDrawerIndustrialLabel("Armário Teste", "gaveta_lat_esq", 2)).toBe(
      "Armrio_Teste_gav_lat_esq_02"
    );
  });
});
