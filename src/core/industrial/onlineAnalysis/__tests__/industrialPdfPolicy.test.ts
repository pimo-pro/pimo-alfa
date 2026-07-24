import { describe, expect, it } from "vitest";
import {
  getIndustrialPdfRenderMode,
  mustUseClassicIndustrialPdf,
  shouldUseShellIndustrialPdfForDoc,
  shouldUseShellIndustrialPdfs,
  INDUSTRIAL_CLASSIC_PRESENTATION_DOC_IDS,
} from "../industrialPdfPolicy";
import { INDUSTRIAL_ONLINE_ANALYSIS_DOC_IDS } from "../industrialOnlineAnalysisDocs";
import type { ProjectState } from "@/context/projectTypes";
import { emptyIndustrialDocumentOverride } from "../industrialDocumentOverridesTypes";

function baseProject(overrides?: ProjectState["industrialDocumentOverrides"]): ProjectState {
  return {
    projectName: "Teste P1/P2/P3",
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

describe("industrialPdfPolicy — P1 binario + P3 classic-first", () => {
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

  it("qualquer override ? shell global (P1 flag)", () => {
    const project = projectWithCutlistOverride();
    expect(getIndustrialPdfRenderMode(project)).toBe("shell");
    expect(shouldUseShellIndustrialPdfs(project)).toBe(true);
  });

  it("P3: todos os 9 docs industriais estao na lista classic-first", () => {
    expect([...INDUSTRIAL_CLASSIC_PRESENTATION_DOC_IDS]).toEqual([
      ...INDUSTRIAL_ONLINE_ANALYSIS_DOC_IDS,
    ]);
    for (const docId of INDUSTRIAL_ONLINE_ANALYSIS_DOC_IDS) {
      expect(mustUseClassicIndustrialPdf(docId)).toBe(true);
    }
  });

  it("com override noutro doc ? PDFs industriais ainda classic (P3)", () => {
    const project = projectWithCutlistOverride();
    for (const docId of INDUSTRIAL_ONLINE_ANALYSIS_DOC_IDS) {
      expect(shouldUseShellIndustrialPdfForDoc(project, docId)).toBe(false);
    }
  });

  it("sem overrides ? nenhum doc usa shell", () => {
    const project = baseProject(undefined);
    expect(shouldUseShellIndustrialPdfForDoc(project, "ferragens_totais")).toBe(false);
    expect(shouldUseShellIndustrialPdfForDoc(project, "cutlist")).toBe(false);
  });
});
