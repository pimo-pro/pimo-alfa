import { describe, expect, it } from "vitest";
import { EUROPEAN_RELEASE_PHASE_CATALOG } from "./releaseCollector";
import { formatEuropeanReleaseSections, formatEuropeanReleaseText } from "./releaseFormatter";

describe("release/releaseFormatter", () => {
  it("gera todas as secoes industriais", () => {
    const sections = formatEuropeanReleaseSections(EUROPEAN_RELEASE_PHASE_CATALOG);
    expect(sections.map((s) => s.id)).toEqual([
      "novas_funcionalidades",
      "melhorias",
      "correcoes",
      "alteracoes_internas",
      "notas_industriais",
      "avisos_seguranca",
      "componentes_afetados",
    ]);
    expect(sections.find((s) => s.id === "novas_funcionalidades")!.items.length).toBeGreaterThan(0);
    const text = formatEuropeanReleaseText({
      version: "B.v3.14",
      generatedAt: "2026-07-26T00:00:00.000Z",
      author: "PIMO Engine",
      sections,
    });
    expect(text).toContain("Novas funcionalidades");
    expect(text).toContain("Melhorias");
    expect(text).toContain("B.v3.14");
  });
});
