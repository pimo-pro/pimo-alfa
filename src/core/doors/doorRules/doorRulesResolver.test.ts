import { describe, expect, it } from "vitest";
import { defaultRulesConfig } from "../../rules/rulesConfig";
import { settingsDefaults } from "../../settings/settingsSchema";
import { resolveDoorRules, resolveDefaultDoorRules } from "./doorRulesResolver";
import { validateResolvedDoorRules } from "./doorRulesValidation";
import { DOOR_OVERLAY_FABRICO_MM } from "./doorRulesDefaults";

describe("doorRulesResolver", () => {
  it("resolveDoorRules espelha RulesConfig.portas e SettingsSchema.portas", () => {
    const resolved = resolveDoorRules(defaultRulesConfig, settingsDefaults);

    expect(resolved.gaps.verticalMm).toBe(settingsDefaults.portas.portaGapVerticalMm);
    expect(resolved.gaps.horizontalMm).toBe(settingsDefaults.portas.portaGapHorizontalMm);
    expect(resolved.gaps.duplaMm).toBe(settingsDefaults.portas.portaGapDuplaMm);
    expect(resolved.gaps.posZOffsetMm).toBe(settingsDefaults.portas.portaPosZOffsetMm);
    expect(resolved.hingeRanges).toEqual(defaultRulesConfig.portas.ranges);
    expect(resolved.drilling.profile).toEqual(defaultRulesConfig.furos.tecnicos.dobradica);
    expect(resolved.drilling.settingsHinge.distanciaCentroDaBorda).toBe(
      settingsDefaults.furação!.dobradica.distanciaCentroDaBorda
    );
    expect(resolved.overlayFabricoMm).toBe(DOOR_OVERLAY_FABRICO_MM);
    expect(validateResolvedDoorRules(resolved)).toEqual([]);
  });

  it("resolveDefaultDoorRules é estável", () => {
    const a = resolveDefaultDoorRules();
    const b = resolveDefaultDoorRules();
    expect(a).toEqual(b);
  });

  it("merge parcial de settings preserva defaults", () => {
    const resolved = resolveDoorRules(defaultRulesConfig, {
      portas: { ...settingsDefaults.portas, portaGapVerticalMm: 3 },
      furação: settingsDefaults.furação,
    });
    expect(resolved.gaps.verticalMm).toBe(3);
    expect(resolved.gaps.horizontalMm).toBe(settingsDefaults.portas.portaGapHorizontalMm);
  });
});
