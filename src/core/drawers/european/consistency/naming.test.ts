import { describe, expect, it } from "vitest";
import {
  enforceNaming,
  isCanonicalEuropeanCode,
  resolveBaseCode,
  EUROPEAN_INDUSTRIAL_NAMES,
} from "./index";

describe("consistency/naming", () => {
  it("SSOT: nomes canónicos", () => {
    expect(EUROPEAN_INDUSTRIAL_NAMES.gav_fren).toBe("gaveta frente");
    expect(EUROPEAN_INDUSTRIAL_NAMES.gav_costa).toBe("gaveta costa");
    expect(EUROPEAN_INDUSTRIAL_NAMES.gav_fun).toBe("gaveta fundo");
  });

  it("aliases proibidos resolvem para códigos canónicos", () => {
    expect(resolveBaseCode("gaveta_frente")).toBe("gav_fren");
    expect(resolveBaseCode("gav_frent")).toBe("gav_fren");
    expect(resolveBaseCode("front")).toBe("gav_fren");
    expect(resolveBaseCode("gaveta_traseira")).toBe("gav_costa");
    expect(resolveBaseCode("gav_cost")).toBe("gav_costa");
    expect(resolveBaseCode("bottom")).toBe("gav_fun");
  });

  it("enforceNaming corrige variações", () => {
    const a = enforceNaming({ tipo: "gaveta_frente", drawerIndex0: 0, drawerCount: 1 });
    expect(a?.codigo).toBe("gav_fren");
    expect(a?.nome).toBe("gaveta frente");
    expect(a?.label).toBe("gav_fren");

    const b = enforceNaming({ tipo: "gaveta_frente", drawerIndex0: 0, drawerCount: 3 });
    expect(b?.codigo).toBe("gav_1_fren");

    const c = enforceNaming({ tipo: "gaveta_corpo", drawerIndex0: 2, drawerCount: 3 });
    expect(c?.codigo).toBe("gav_2");
    expect(c?.nome).toBe("gaveta 2");
  });

  it("isCanonicalEuropeanCode aceita indexados", () => {
    expect(isCanonicalEuropeanCode("gav_fren")).toBe(true);
    expect(isCanonicalEuropeanCode("gav_2_fren")).toBe(true);
    expect(isCanonicalEuropeanCode("gav_3")).toBe(true);
    expect(isCanonicalEuropeanCode("gaveta_frente")).toBe(false);
  });
});
