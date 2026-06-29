import { describe, expect, it } from "vitest";
import {
  PDF_OPERATIONAL_STAGES,
  formatIndustrialDesignDate,
} from "./pdfIndustrialListShell";

describe("pdfIndustrialListShell", () => {
  it("etapas operacionais sem FOLHEAGEM, CNC nem NESTING", () => {
    expect(PDF_OPERATIONAL_STAGES).toEqual(["CORTE manual", "ORLAGEM", "MONTAGEM"]);
    expect(PDF_OPERATIONAL_STAGES.join(" ")).not.toMatch(/FOLHEAGEM|CNC|NESTING|DISCO/i);
  });

  it("formatIndustrialDesignDate devolve data pt-PT", () => {
    const d = formatIndustrialDesignDate();
    expect(d).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
});
