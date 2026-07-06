import { describe, expect, it } from "vitest";
import { CORNER_FF_EDGE_DOWEL_DEPTH_MM } from "../../cornerCabinet/cornerFixedFrontDowels";
import baseline from "../../../../scripts/baselines/caixa-forno-industrial-baseline.json";

describe("Caixa Forno — baseline industrial oficial", () => {
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
