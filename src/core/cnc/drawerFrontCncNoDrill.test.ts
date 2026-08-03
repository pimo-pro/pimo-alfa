/**
 * Frentes de gaveta: nesting CNC sem furação TCN (furos só em DRILL).
 */
import { describe, expect, it } from "vitest";
import { stripDrawerFrontHolesForCnc } from "./cncPipeline";
import { isDrawerFrontPieceTipo } from "../drill/xmlMachineRouting";
import { cutlistComPrecoFromBox } from "../manufacturing/cutlistFromBoxes";
import { defaultRulesConfig } from "../rules/rulesConfig";
import {
  buildDrawerScenario,
  minimalBoxWithDrawers,
} from "../../validation/drawerCertificationTestHelpers";
import type { CutlistItemForPieces } from "../cutlayout/cutLayoutEngine";
import { cutlistToPieces } from "../cutlayout/cutLayoutEngine";
import { generateTcnForPanelNestingMo } from "./tcnGeneratorNestingMo";

describe("frente gaveta — zero furos em CNC/TCN", () => {
  it("isDrawerFrontPieceTipo cobre GAV_FRENTE_EXT_*", () => {
    expect(isDrawerFrontPieceTipo("gaveta_frente_ext")).toBe(true);
    expect(isDrawerFrontPieceTipo("gaveta_frente_int")).toBe(true);
    expect(isDrawerFrontPieceTipo("gaveta_frente")).toBe(true);
    expect(isDrawerFrontPieceTipo("gaveta_lat_esq")).toBe(false);
    expect(isDrawerFrontPieceTipo("cima")).toBe(false);
  });

  it("stripDrawerFrontHolesForCnc zera furos das frentes e preserva laterais", () => {
    const { layers } = buildDrawerScenario({
      boxWidth: 600,
      boxHeight: 720,
      boxDepth: 560,
      drawerCount: 3,
    });
    const box = minimalBoxWithDrawers(layers);
    const cutlist = cutlistComPrecoFromBox(box, defaultRulesConfig);
    const fronts = cutlist.filter((p) => p.tipo === "gaveta_frente_ext");
    const lat = cutlist.find((p) => p.tipo === "gaveta_lat_esq");
    expect(fronts).toHaveLength(3);
    expect(fronts.every((f) => (f.drillHoles?.length ?? 0) > 0)).toBe(true);
    const latHoleCount = lat?.drillHoles?.length ?? 0;
    expect(latHoleCount).toBeGreaterThan(0);

    const stripped = stripDrawerFrontHolesForCnc(cutlist as unknown as CutlistItemForPieces[]);
    for (const item of stripped) {
      const tipo = String((item as { tipo?: string }).tipo ?? "");
      if (isDrawerFrontPieceTipo(tipo)) {
        expect(item.drillHoles ?? []).toHaveLength(0);
      }
    }
    const latAfter = stripped.find((p) => String((p as { tipo?: string }).tipo) === "gaveta_lat_esq");
    expect(latAfter?.drillHoles?.length ?? 0).toBe(latHoleCount);

    // Cutlist de origem (DRILL) intacta
    expect(fronts.every((f) => (f.drillHoles?.length ?? 0) > 0)).toBe(true);
  });

  it("TCN gerado a partir de frentes stripped não contém operações de furo", () => {
    const frontItem: CutlistItemForPieces = {
      id: "f1",
      nome: "Caixa_gav_frent_ext_01",
      tipo: "gaveta_frente_ext",
      dimensoes: { largura: 598, altura: 200 },
      espessura: 19,
      quantidade: 1,
      drillHoles: [
        { x: 33, y: 50, diameter: 10, depth: 13, holeType: "cavilha" },
        { x: 12, y: 180, diameter: 0, depth: 11, holeSubtype: "groove" },
      ],
    } as CutlistItemForPieces;

    const stripped = stripDrawerFrontHolesForCnc([frontItem]);
    const pieces = cutlistToPieces(stripped);
    expect(pieces).toHaveLength(1);
    expect(pieces[0]!.drillHoles ?? pieces[0]!.holes ?? []).toHaveLength(0);

    const tcn = generateTcnForPanelNestingMo(
      {
        sheet: {
          largura_mm: 2800,
          altura_mm: 2100,
          espessura_mm: 19,
          materialName: "MDF",
        },
        placements: [
          {
            ...pieces[0]!,
            x_mm: 10,
            y_mm: 10,
            rotacao: 0,
            sheetIndex: 0,
            drillHoles: [],
            holes: [],
          },
        ],
        unplaced: [],
        utilization: 0.1,
      } as never,
      { sheetIndex: 0 }
    );
    // Sem W#DRILL / blocos de furo típicos quando não há drillHoles
    expect(tcn).not.toMatch(/W#1\d{3}\{[^}]*D=/s);
  });
});
