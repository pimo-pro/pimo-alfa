/**
 * GAV_FRENTE_EXT_01/02/03 — furação DRILL (rasgo do fundo + cavilhas).
 * Frentes 2/3 (middle/highest) partilham o padrão elev+sideH−13 (22mm à cavilha superior).
 * Frente 1 (lowest) usa rasgo fixo a 53mm da base da frente (cavilha inferior desce a elev+0).
 */
import { describe, expect, it } from "vitest";
import { cutlistComPrecoFromBox } from "../core/manufacturing/cutlistFromBoxes";
import { defaultRulesConfig } from "../core/rules/rulesConfig";
import { buildDrillStationXmlFilesForProject } from "../core/drill/drillExport";
import { DRAWER_LOWEST_FRONT_BOTTOM_GROOVE_FROM_BASE_MM } from "../core/drawers/drilling/DrawerDrillingRules";
import {
  buildDrawerScenario,
  minimalBoxWithDrawers,
} from "./drawerCertificationTestHelpers";

describe("GAV_FRENTE_EXT_01/02/03 — furação DRILL", () => {
  it("frente 1 (lowest): rasgo fixo 53mm; frentes 2/3: mesma distância cavilha superior → rasgo (= 22 mm)", () => {
    const { layers } = buildDrawerScenario({
      boxWidth: 600,
      boxHeight: 900,
      boxDepth: 560,
      drawerCount: 3,
    });
    const box = minimalBoxWithDrawers(layers);
    const cutlist = cutlistComPrecoFromBox(box, defaultRulesConfig);
    const fronts = cutlist
      .filter((p) => p.tipo === "gaveta_frente_ext")
      .sort(
        (a, b) =>
          (Number(a.metadata?.drawerIndex) || 0) - (Number(b.metadata?.drawerIndex) || 0)
      );

    expect(fronts).toHaveLength(3);
    expect(fronts[0]!.nome).toMatch(/_gav_frent_ext_01$/);
    expect(fronts[1]!.nome).toMatch(/_gav_frent_ext_02$/);
    expect(fronts[2]!.nome).toMatch(/_gav_frent_ext_03$/);

    // Frente 1 (lowest): rasgo fixo, independente da cavilha superior.
    const grooveLowest = fronts[0]!.drillHoles?.find((h) => h.holeSubtype === "groove");
    expect(grooveLowest).toBeDefined();
    expect(grooveLowest!.y).toBeCloseTo(DRAWER_LOWEST_FRONT_BOTTOM_GROOVE_FROM_BASE_MM, 5);
    expect(grooveLowest!.y).not.toBe(56.5);

    // Frentes 2/3 (middle/highest): mesma distância fixa de 22mm à cavilha superior.
    const distances: number[] = [];
    for (const front of [fronts[1]!, fronts[2]!]) {
      const groove = front.drillHoles?.find((h) => h.holeSubtype === "groove");
      const cavYs = (front.drillHoles ?? [])
        .filter((h) => h.holeType === "cavilha")
        .map((h) => h.y);
      expect(groove).toBeDefined();
      expect(cavYs.length).toBeGreaterThanOrEqual(2);
      const upperCav = Math.max(...cavYs);
      const dist = groove!.y - upperCav;
      expect(dist).toBeCloseTo(22, 5);
      distances.push(dist);
    }
    expect(new Set(distances.map((d) => d.toFixed(3))).size).toBe(1);

    const drill = buildDrillStationXmlFilesForProject(cutlist, {
      projectName: "FRONT01_UNIFORM",
      boxes: [box],
      rules: defaultRulesConfig,
    });
    const frontXmls = drill.filter(
      (f) => f.partName.includes("gav_frent") && f.machineTarget === "drill"
    );
    expect(frontXmls.length).toBeGreaterThanOrEqual(3);
    expect(frontXmls.every((f) => f.zipPath.includes("drill/"))).toBe(true);
  });
});
