import { describe, expect, it } from "vitest";
import { applyCiRemapToTokenMap, CI_CSS, remapHexToCiVar } from "./ciRemap";

describe("ciRemap (aplicação visual CI)", () => {
  it("mapeia Prussian/Sienna/core hex para var(--ci-*)", () => {
    expect(remapHexToCiVar("#1C4A7A")).toBe(CI_CSS.prussian600);
    expect(remapHexToCiVar("#8B4A1C")).toBe(CI_CSS.sienna600);
    expect(remapHexToCiVar("#F0EDE8")).toBe(CI_CSS.chalk);
    expect(remapHexToCiVar("#0A0B0C")).toBe(CI_CSS.darkCard);
  });

  it("preserva rgba e hex fora do SSOT", () => {
    expect(remapHexToCiVar("rgba(28,74,122,0.25)")).toBe("rgba(28,74,122,0.25)");
    expect(remapHexToCiVar("#C8845A")).toBe("#C8845A");
  });

  it("não altera var() já existentes", () => {
    expect(remapHexToCiVar("var(--ci-prussian-600)")).toBe("var(--ci-prussian-600)");
  });

  it("aplica remap a um mapa de tokens", () => {
    const mapped = applyCiRemapToTokenMap({
      "blue-light": "#1C4A7A",
      "bg-selected": "rgba(28,74,122,0.25)",
    });
    expect(mapped["blue-light"]).toBe(CI_CSS.prussian600);
    expect(mapped["bg-selected"]).toBe("rgba(28,74,122,0.25)");
  });
});
