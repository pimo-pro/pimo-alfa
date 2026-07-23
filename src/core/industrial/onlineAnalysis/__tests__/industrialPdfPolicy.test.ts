import { describe, expect, it } from "vitest";
import {
  getIndustrialPdfRenderMode,
  mustUseClassicIndustrialPdf,
  shouldUseShellIndustrialPdfForDoc,
  shouldUseShellIndustrialPdfs,
} from "../industrialPdfPolicy";
import type { ProjectState } from "@/context/projectTypes";
import { emptyIndustrialDocumentOverride } from "../industrialDocumentOverridesTypes";

function baseProject(overrides?: ProjectState["industrialDocumentOverrides"]): ProjectState {
  return {
    projectName: "Teste P1/P2",
    boxes: [],
    rules: {} as ProjectState["rules"],
    industrialDocumentOverrides: overrides,
  } as ProjectState;
}

function projectWithCutlistOverride(): ProjectState {
  return baseProject({
    cutlist: {
      ...emptyIndustrialDocumentOverride(),
      rowPatches: {
        r1: {
          fields: { material: "HDF" },
          updatedAt: new Date().toISOString(),
          updatedBy: { userId: "u", userName: "t" },
          source: "manual",
        },
      },
    },
  });
}

describe("industrialPdfPolicy — P1 binario + P2 classic presentation", () => {
  it("sem overrides ? classic global", () => {
    const project = baseProject(undefined);
    expect(getIndustrialPdfRenderMode(project)).toBe("classic");
    expect(shouldUseShellIndustrialPdfs(project)).toBe(false);
  });

  it("overrides vazios ? classic", () => {
    const project = baseProject({
      cutlist: emptyIndustrialDocumentOverride(),
    });
    expect(getIndustrialPdfRenderMode(project)).toBe("classic");
  });

  it("qualquer override ? shell global (P1)", () => {
    const project = projectWithCutlistOverride();
    expect(getIndustrialPdfRenderMode(project)).toBe("shell");
    expect(shouldUseShellIndustrialPdfs(project)).toBe(true);
  });

  it("ferragens_totais deve sempre usar classic (P2)", () => {
    expect(mustUseClassicIndustrialPdf("ferragens_totais")).toBe(true);
    expect(mustUseClassicIndustrialPdf("cutlist")).toBe(false);
  });

  it("com override noutro doc ? ferragens_totais ainda classic; cutlist shell", () => {
    const project = projectWithCutlistOverride();
    expect(shouldUseShellIndustrialPdfForDoc(project, "ferragens_totais")).toBe(false);
    expect(shouldUseShellIndustrialPdfForDoc(project, "cutlist")).toBe(true);
    expect(shouldUseShellIndustrialPdfForDoc(project, "pecas_totais")).toBe(true);
  });

  it("sem overrides ? nenhum doc usa shell", () => {
    const project = baseProject(undefined);
    expect(shouldUseShellIndustrialPdfForDoc(project, "ferragens_totais")).toBe(false);
    expect(shouldUseShellIndustrialPdfForDoc(project, "cutlist")).toBe(false);
  });
});
