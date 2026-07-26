import { describe, expect, it } from "vitest";
import { buildDoorModels } from "./doors/doorModels";

describe("kitchen/doors", () => {
  it("inclui portas simples, duplas, superiores, altas e canto", () => {
    const doors = buildDoorModels();
    const styles = doors.map((d) => d.style);
    expect(styles).toEqual(expect.arrayContaining(["simple", "double", "upper", "tall", "corner"]));
    expect(doors.every((d) => d.integrations.technicalViews && d.integrations.dxf)).toBe(true);
  });
});
