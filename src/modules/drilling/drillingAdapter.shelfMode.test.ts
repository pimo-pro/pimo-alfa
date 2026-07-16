import { describe, expect, it } from "vitest";
import { defaultRulesConfig } from "../../core/rules/rulesConfig";
import { buildPanelDrillingResult } from "./drillingAdapter";

describe("buildPanelDrillingResult — shelfMode div", () => {
  it("não gera furos standard de prateleira quando shelfMode='div'", () => {
    const result = buildPanelDrillingResult(
      {
        tipo: "lateral_direita",
        larguraMm: 536,
        alturaMm: 900,
        espessuraMm: 19,
        hasShelves: true,
        shelfMode: "div",
        hasDrawers: false,
      },
      defaultRulesConfig
    );

    expect(result.success).toBe(true);
    const drillHoles = result.data?.drillHoles ?? [];
    expect(drillHoles.filter((h) => h.holeType === "prateleira")).toHaveLength(0);
  });

  it("continua a gerar furos standard no modo standard", () => {
    const result = buildPanelDrillingResult(
      {
        tipo: "lateral_direita",
        larguraMm: 536,
        alturaMm: 900,
        espessuraMm: 19,
        hasShelves: true,
        shelfMode: "standard",
        hasDrawers: false,
      },
      defaultRulesConfig
    );

    expect(result.success).toBe(true);
    const drillHoles = result.data?.drillHoles ?? [];
    expect(drillHoles.some((h) => h.holeType === "prateleira")).toBe(true);
  });
});
