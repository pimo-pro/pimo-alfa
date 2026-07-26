import { describe, expect, it } from "vitest";
import { enforceCutlistIdentity } from "./enforceCutlistIdentity";
import { isCanonicalEuropeanCode } from "./namingMap";
import type { DrawerCutlistItem } from "../types";

describe("consistency/cutlist", () => {
  it("corrige nomes/códigos errados sem alterar dims/materiais", () => {
    const items: DrawerCutlistItem[] = [
      {
        id: "x-eu-bad-1",
        nome: "GAV1 Frente (errado)",
        codigo: "gaveta_frente",
        quantidade: 1,
        larguraMm: 400,
        alturaMm: 140,
        profundidadeMm: 19,
        espessuraMm: 19,
        material: "carvalho",
        kind: "wood",
        tipo: "gaveta_frente",
        industrialLabel: "CX_gaveta_frente_01",
      },
    ];
    const out = enforceCutlistIdentity(items, { drawerCount: 1 });
    expect(out[0]!.codigo).toBe("gav_fren");
    expect(out[0]!.nome).toBe("gaveta frente");
    expect(isCanonicalEuropeanCode(out[0]!.codigo!)).toBe(true);
    expect(out[0]!.larguraMm).toBe(400);
    expect(out[0]!.material).toBe("carvalho");
    expect(out[0]!.espessuraMm).toBe(19);
  });
});
