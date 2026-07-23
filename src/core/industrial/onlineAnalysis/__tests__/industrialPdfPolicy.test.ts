import { describe, expect, it } from "vitest";
import {
  getIndustrialPdfRenderMode,
  shouldUseShellIndustrialPdfs,
} from "../industrialPdfPolicy";
import type { ProjectState } from "@/context/projectTypes";
import { emptyIndustrialDocumentOverride } from "../industrialDocumentOverridesTypes";

function baseProject(overrides?: ProjectState["industrialDocumentOverrides"]): ProjectState {
  return {
    projectName: "Teste P1",
    boxes: [],
    rules: {} as ProjectState["rules"],
    industrialDocumentOverrides: overrides,
  } as ProjectState;
}

describe("industrialPdfPolicy — pacote binario P1", () => {
  it("sem overrides ? classic", () => {
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

  it("qualquer override (ex. cutlist) ? shell para o projeto inteiro", () => {
    const project = baseProject({
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
    expect(getIndustrialPdfRenderMode(project)).toBe("shell");
    expect(shouldUseShellIndustrialPdfs(project)).toBe(true);
  });

  it("override so em pecas_totais tambem forca shell global", () => {
    const project = baseProject({
      pecas_totais: {
        ...emptyIndustrialDocumentOverride(),
        deletedRowIds: ["row-a"],
      },
    });
    expect(shouldUseShellIndustrialPdfs(project)).toBe(true);
  });
});
