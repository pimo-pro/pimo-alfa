import { describe, expect, it } from "vitest";
import { IndustrialError, buildIndustrialPieceId, isIndustrialError } from "./IndustrialError";

describe("IndustrialError", () => {
  it("expõe boxId, pieceId, message e hints", () => {
    const err = new IndustrialError({
      boxId: "C1",
      pieceId: "C1_COSTA",
      message: "Teste",
      hints: ["Sugestão A"],
    });
    expect(err.boxId).toBe("C1");
    expect(err.pieceId).toBe("C1_COSTA");
    expect(err.message).toBe("Teste");
    expect(err.hints).toEqual(["Sugestão A"]);
    expect(isIndustrialError(err)).toBe(true);
  });

  it("formatForToast inclui título, mensagem e sugestões", () => {
    const err = IndustrialError.materialNotFound({
      boxId: "C1",
      pieceId: "C1_COSTA",
      materialKey: "hdf_x",
      costaApplicable: true,
    });
    const text = err.formatForToast();
    expect(text).toContain("Erro na peça C1_COSTA do módulo C1");
    expect(text).toContain("Material inexistente");
    expect(text).toContain("Ativar Sem Costa");
  });

  it("buildIndustrialPieceId normaliza chaves", () => {
    expect(buildIndustrialPieceId("C1", "costa")).toBe("C1_COSTA");
  });
});
