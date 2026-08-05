import { describe, expect, it } from "vitest";
import { mergeCrudEspessurasIntoSsotGrupos } from "./materiaisSsotUiMerge";
import type { MateriaisSsotFamiliaGrupo } from "./materiaisSsotNormalize";

describe("mergeCrudEspessurasIntoSsotGrupos", () => {
  it("acrescenta espessura CRUD em falta sem duplicar SSOT", () => {
    const grupos: MateriaisSsotFamiliaGrupo[] = [
      {
        familia: "MDF Branco",
        espessuras: [
          {
            nomeAtual: "MDF Branco 19",
            nomeNovoPadronizado: "MDF Branco",
            ref: "mdf_branco-19",
            espessuraMm: 19,
            medidaChapa: "2800 x 2070",
            precoChapaCompletaEur: null,
            precoPorM2Eur: 20,
            precoVendaPorM2Eur: null,
            familia: "MDF Branco",
            industrialCanonicalId: "mdf_branco-19",
            displayLabel: "MDF Branco 19",
          },
        ],
      },
    ];

    const merged = mergeCrudEspessurasIntoSsotGrupos(grupos, [
      {
        id: "ui_mdf_12",
        label: "MDF Branco 12",
        espessura: 12,
        precoPorM2: 15,
        sheetWidthMm: 2800,
        sheetHeightMm: 2070,
      },
      {
        id: "ui_mdf_19_dup",
        label: "MDF Branco 19",
        espessura: 19,
        precoPorM2: 99,
      },
    ]);

    const mdf = merged.find((g) => g.familia === "MDF Branco");
    expect(mdf).toBeTruthy();
    expect(mdf!.espessuras.map((e) => e.espessuraMm)).toEqual([12, 19]);
    const ssot19 = mdf!.espessuras.find((e) => e.espessuraMm === 19);
    expect(ssot19?.industrialCanonicalId).toBe("mdf_branco-19");
    expect(ssot19?.precoPorM2Eur).toBe(20);
    const ui12 = mdf!.espessuras.find((e) => e.espessuraMm === 12);
    expect(ui12?.industrialCanonicalId).toBeNull();
    expect(ui12?.ref).toBe("ui_mdf_12");
  });
});
