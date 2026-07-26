import { describe, expect, it } from "vitest";
import { buildBaseModules } from "./modules/baseModules";
import { buildTallModules } from "./modules/tallModules";
import { buildUpperModules } from "./modules/upperModules";
import { buildCornerModules } from "./modules/cornerModules";

describe("kitchen/modules", () => {
  it("gera base 300–1200, altos, superiores e canto", () => {
    const base = buildBaseModules();
    expect(base.every((m) => m.kind === "base")).toBe(true);
    expect(base.map((m) => m.widthMm)).toContain(300);
    expect(base.map((m) => m.widthMm)).toContain(1200);

    const tall = buildTallModules();
    expect(tall.some((m) => m.heightMm === 1500)).toBe(true);
    expect(tall.some((m) => m.heightMm === 2200)).toBe(true);

    const upper = buildUpperModules();
    expect(upper.every((m) => m.kind === "upper")).toBe(true);
    expect(upper.map((m) => m.widthMm)).toContain(900);

    const corner = buildCornerModules();
    expect(corner.some((m) => m.cornerType === "L")).toBe(true);
    expect(corner.some((m) => m.cornerType === "diagonal")).toBe(true);
  });
});
