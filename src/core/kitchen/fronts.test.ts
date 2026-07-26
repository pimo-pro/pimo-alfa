import { describe, expect, it } from "vitest";
import { buildFrontModels } from "./fronts/frontModels";

describe("kitchen/fronts", () => {
  it("inclui frentes padrao, dupla, interna, alta e superior", () => {
    const fronts = buildFrontModels();
    const styles = fronts.map((f) => f.style);
    expect(styles).toEqual(expect.arrayContaining(["standard", "dual", "internal", "tall", "upper"]));
    expect(fronts.every((f) => f.integrations.docs && f.integrations.dxf)).toBe(true);
  });
});
