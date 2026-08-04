/**
 * GAV_FRENTE_EXT_01 alinhada ao padrão das frentes 2 e 3 (só DRILL).
 */
import { describe, expect, it } from "vitest";
import { cutlistComPrecoFromBox } from "../core/manufacturing/cutlistFromBoxes";
import { defaultRulesConfig } from "../core/rules/rulesConfig";
import { buildDrillStationXmlFilesForProject } from "../core/drill/drillExport";
import { DRAWER_BOTTOM_GROOVE_Y_FROM_TOP_MM } from "../core/drawers/drawerGeometryConstants";
import {
  buildDrawerScenario,
  minimalBoxWithDrawers,
} from "./drawerCertificationTestHelpers";

describe("GAV_FRENTE_EXT_01 — padrão uniforme com frentes 2/3", () => {
  it("3 gavetas: mesma distância cavilha superior ? rasgo (= 22 mm)", () => {
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

    const distances: number[] = [];
    for (const front of fronts) {
      const groove = front.drillHoles?.find((h) => h.holeSubtype === "groove");
      const cavYs = (front.drillHoles ?? [])
        .filter((h) => h.holeType === "cavilha")
        .map((h) => h.y);
      expect(groove).toBeDefined();
      expect(cavYs.length).toBeGreaterThanOrEqual(2);
      const upperCav = Math.max(...cavYs);
      const dist = groove!.y - upperCav;
      expect(dist).toBeCloseTo(DRAWER_BOTTOM_GROOVE_Y_FROM_TOP_MM + 9, 5); // 13 + 9 = 22 (sideH?35 vs sideH?13)
      expect(dist).toBeCloseTo(22, 5);
      // Não usar golden legado W?56.5 na frente 1
      expect(groove!.y).not.toBe(56.5);
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
