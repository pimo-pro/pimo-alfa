import { describe, expect, it } from "vitest";
import {
  buildEtiquetaQrPayloadV5,
} from "../etiquetas/qr/etiquetaCodeV5";
import {
  buildIndustrialPieceRef,
  resolveIndustrialPieceRef,
} from "./cutLayoutProPieceNaming";

const PROJECT = "NP2624619";
const BOX = "Caixa Forno";

describe("resolveIndustrialPieceRef — Caixa Forno", () => {
  it("SEP_02 — metadata Caixa_Forno_SEP_02", () => {
    const ref = resolveIndustrialPieceRef(
      {
        metadata: { industrialLabel: "Caixa_Forno_SEP_02" },
        tipo: "separador",
      },
      BOX,
      PROJECT
    );
    expect(ref).toBe("NP2624619_Caixa_Forno_SEP_02");
    expect(buildEtiquetaQrPayloadV5({ industrialPieceRef: ref, pieceSeq: 5 })).toBe(
      "NP2624619_Caixa_Forno_SEP_02-5"
    );
  });

  it("SEP_03 — metadata Caixa_Forno_SEP_03", () => {
    const ref = resolveIndustrialPieceRef(
      {
        metadata: { industrialLabel: "Caixa_Forno_SEP_03" },
        tipo: "separador",
      },
      BOX,
      PROJECT
    );
    expect(ref).toBe("NP2624619_Caixa_Forno_SEP_03");
  });

  it("porta_superior — nome legado com prefixo de projecto", () => {
    const ref = resolveIndustrialPieceRef(
      {
        nome: "NP2624619_porta_superior",
        tipo: "porta_superior",
      },
      BOX,
      PROJECT
    );
    expect(ref).toBe("NP2624619_Caixa_Forno_porta_superior");
    expect(buildEtiquetaQrPayloadV5({ industrialPieceRef: ref, pieceSeq: 6 })).toBe(
      "NP2624619_Caixa_Forno_porta_superior-6"
    );
  });

  it("não repete projecto nem caixa quando metadata já é referência completa", () => {
    const ref = resolveIndustrialPieceRef(
      {
        metadata: { industrialLabel: "NP2624619_Caixa_Forno_SEP_02" },
      },
      BOX,
      PROJECT
    );
    expect(ref).toBe("NP2624619_Caixa_Forno_SEP_02");
  });
});

describe("buildIndustrialPieceRef", () => {
  it("normaliza espaços da caixa para underscore", () => {
    expect(buildIndustrialPieceRef("NP2624619", "Caixa Forno", "porta_superior")).toBe(
      "NP2624619_Caixa_Forno_porta_superior"
    );
  });
});
