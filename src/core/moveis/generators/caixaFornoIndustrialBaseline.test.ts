import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CORNER_FF_EDGE_DOWEL_DEPTH_MM } from "../../cornerCabinet/cornerFixedFrontDowels";

type CaixaFornoIndustrialBaseline = {
  model: string;
  status: string;
  baselineTag: string;
  baselineCommit: string;
  immutableReference: { tag: string; commit: string };
  contractTestSuite: string[];
  expectedTestCount: number;
  invariants: {
    sepCavilhaDepthMm: number;
    lateralCavilhaDepthMm: number;
    sepCount: number;
    cimaFundoWithoutSepCavilhas: boolean;
    viewerLateralDireitaInteriorFace: string;
    viewerLateralEsquerdaInteriorFace: string;
  };
  ssotModules: string[];
  guardrails: string[];
};

function loadBaseline(): CaixaFornoIndustrialBaseline {
  const path = resolve(process.cwd(), "scripts/baselines/caixa-forno-industrial-baseline.json");
  return JSON.parse(readFileSync(path, "utf8")) as CaixaFornoIndustrialBaseline;
}

describe("Caixa Forno — baseline industrial oficial", () => {
  const baseline = loadBaseline();

  it("manifesto de baseline existe e é ponto de partida obrigatório do pipeline", () => {
    expect(baseline.model).toBe("caixa_forno");
    expect(baseline.status).toBe("mandatory_pipeline_starting_point");
    expect(baseline.baselineTag).toBe("v6.0706.1215");
    expect(baseline.baselineCommit).toBe("9e0a7c9");
    expect(baseline.immutableReference.tag).toBe("v6.0706.1215");
    expect(baseline.immutableReference.commit).toBe("9e0a7c9");
    expect(baseline.expectedTestCount).toBe(54);
    expect(baseline.contractTestSuite.length).toBeGreaterThanOrEqual(6);
    expect(baseline.ssotModules.length).toBeGreaterThanOrEqual(4);
    expect(baseline.guardrails.length).toBeGreaterThanOrEqual(4);
  });

  it("invariantes alinhados com CORNER_FF_EDGE_DOWEL_DEPTH_MM e contrato Viewer", () => {
    expect(baseline.invariants.sepCavilhaDepthMm).toBe(CORNER_FF_EDGE_DOWEL_DEPTH_MM);
    expect(baseline.invariants.lateralCavilhaDepthMm).toBe(CORNER_FF_EDGE_DOWEL_DEPTH_MM);
    expect(baseline.invariants.sepCount).toBe(3);
    expect(baseline.invariants.cimaFundoWithoutSepCavilhas).toBe(true);
    expect(baseline.invariants.viewerLateralDireitaInteriorFace).toBe("esquerda");
    expect(baseline.invariants.viewerLateralEsquerdaInteriorFace).toBe("direita");
  });
});
