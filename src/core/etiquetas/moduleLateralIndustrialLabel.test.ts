import { describe, expect, it } from "vitest";
import {
  buildIndustrialPieceName,
  buildCutLayoutProPartName,
  piecePrefixForCutLayoutPro,
  resolveIndustrialPieceRef,
} from "../cutlayout/cutLayoutProPieceNaming";
import { resolveNomeIndustrialForEtiqueta } from "../etiquetas/industrialDisplayName";
import { getPieceLabel } from "../manufacturing/boxManufacturing";
import { cutlistComPrecoFromBox } from "../manufacturing/cutlistFromBoxes";
import { defaultRulesConfig } from "../rules/rulesConfig";
import {
  buildDrawerScenario,
  minimalBoxWithDrawers,
} from "../../validation/drawerCertificationTestHelpers";

describe("Etiquetas industriais — inversão L/R dos lados do módulo", () => {
  const projectName = "ProjTest";
  const boxNome = "C1 Armario 1";

  it("SSOT / Viewer / cutlist PRO: nomes correctos (sem inversão)", () => {
    expect(getPieceLabel("lateral_esquerda")).toBe("Lateral esquerda");
    expect(getPieceLabel("lateral_direita")).toBe("Lateral direita");
    expect(piecePrefixForCutLayoutPro({ tipo: "lateral_esquerda" })).toBe("lat_esq");
    expect(piecePrefixForCutLayoutPro({ tipo: "lateral_direita" })).toBe("lat_dir");
    expect(
      buildCutLayoutProPartName({ tipo: "lateral_esquerda" }, boxNome, projectName)
    ).toMatch(/_lat_esq$/i);
    expect(
      buildCutLayoutProPartName({ tipo: "lateral_direita" }, boxNome, projectName)
    ).toMatch(/_lat_dir$/i);
  });

  it("etiqueta industrial: lateral_esquerda ? DIR, lateral_direita ? ESQ", () => {
    expect(
      resolveNomeIndustrialForEtiqueta({ tipo: "lateral_esquerda" }, projectName, boxNome)
    ).toMatch(/_lat_dir$/i);
    expect(
      resolveNomeIndustrialForEtiqueta({ tipo: "lateral_direita" }, projectName, boxNome)
    ).toMatch(/_lat_esq$/i);

    expect(buildIndustrialPieceName({ tipo: "lateral_esquerda" }, boxNome, projectName)).toMatch(
      /_lat_dir$/i
    );
    expect(buildIndustrialPieceName({ tipo: "lateral_direita" }, boxNome, projectName)).toMatch(
      /_lat_esq$/i
    );

    expect(resolveIndustrialPieceRef({ tipo: "lateral_esquerda" }, boxNome, projectName)).toMatch(
      /LAT_DIR$/
    );
    expect(resolveIndustrialPieceRef({ tipo: "lateral_direita" }, boxNome, projectName)).toMatch(
      /LAT_ESQ$/
    );
  });

  it.each([1, 3] as const)(
    "módulo com %i gaveta(s): cutlist/Viewer correctos; etiqueta invertida",
    (drawerCount) => {
      const { layers } = buildDrawerScenario({
        boxWidth: 600,
        boxHeight: 720,
        boxDepth: 560,
        drawerCount,
      });
      const box = minimalBoxWithDrawers(layers, { nome: boxNome });
      const cutlist = cutlistComPrecoFromBox(box, defaultRulesConfig);

      const latEsq = cutlist.find((p) => p.tipo === "lateral_esquerda");
      const latDir = cutlist.find((p) => p.tipo === "lateral_direita");
      expect(latEsq).toBeDefined();
      expect(latDir).toBeDefined();

      // Cutlist / Viewer: nomes humanos correctos (SSOT).
      expect(latEsq!.nome).toBe("Lateral esquerda");
      expect(latDir!.nome).toBe("Lateral direita");
      expect(getPieceLabel(latEsq!.tipo)).toBe("Lateral esquerda");
      expect(getPieceLabel(latDir!.tipo)).toBe("Lateral direita");

      // Furações intactas no item SSOT (pelo menos presença de lista).
      expect(Array.isArray(latEsq!.drillHoles)).toBe(true);
      expect(Array.isArray(latDir!.drillHoles)).toBe(true);

      // Etiqueta / REF industrial: invertidos.
      expect(
        resolveNomeIndustrialForEtiqueta(latEsq!, projectName, box.nome)
      ).toMatch(/_lat_dir$/i);
      expect(
        resolveNomeIndustrialForEtiqueta(latDir!, projectName, box.nome)
      ).toMatch(/_lat_esq$/i);
      expect(resolveIndustrialPieceRef(latEsq!, box.nome, projectName)).toMatch(/LAT_DIR$/);
      expect(resolveIndustrialPieceRef(latDir!, box.nome, projectName)).toMatch(/LAT_ESQ$/);
    }
  );
});
