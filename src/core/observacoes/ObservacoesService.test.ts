import { describe, it, expect } from "vitest";
import {
  collectObservationsForItem,
  formatObservacoesForPdf,
  migrateLegacyMetadataObservations,
  migrateProjectPieceObservacoes,
  normalizeObservacoesList,
  resolveObservacoesForCutListItem,
  sanitizeObservationText,
} from "./ObservacoesService";

describe("ObservacoesService — sanitização", () => {
  it("remove quebras de linha e colapsa espaços", () => {
    expect(sanitizeObservationText("  linha\ncom\r\nquebra  ")).toBe("linha com quebra");
  });

  it("remove tags HTML", () => {
    expect(sanitizeObservationText("<b>Verificar</b> orla")).toBe("Verificar orla");
  });

  it("remove caracteres de controlo", () => {
    expect(sanitizeObservationText("ok\u0007texto")).toBe("oktexto");
  });

  it("limita comprimento máximo", () => {
    const long = "a".repeat(300);
    expect(sanitizeObservationText(long).length).toBe(240);
  });

  it("normaliza e deduplica observações", () => {
    expect(normalizeObservacoesList(["  A  ", "A", "B", "", "  "])).toEqual(["A", "B"]);
  });
});

describe("ObservacoesService — migração legado", () => {
  it("migra metadata legado", () => {
    expect(migrateLegacyMetadataObservations({ observacao: "Verificar orla" })).toEqual([
      "Verificar orla",
    ]);
    expect(migrateLegacyMetadataObservations({ obs: "X", observacoes: ["Y"] })).toEqual(["Y", "X"]);
  });

  it("migra para store sem sobrescrever existentes", () => {
    const boxes = [
      {
        id: "b1",
        nome: "Box",
        cutList: [
          {
            id: "b1-cima",
            nome: "Cima",
            quantidade: 1,
            dimensoes: { largura: 1, altura: 1, profundidade: 1 },
            espessura: 18,
            material: "mdf",
            tipo: "cima",
            metadata: { panelId: "cima-1", observacao: "Legado" },
          },
        ],
      },
    ] as import("../types").BoxModule[];

    const migrated = migrateProjectPieceObservacoes(
      { "cima-1": ["Já guardada"] },
      boxes
    );
    expect(migrated["cima-1"]).toEqual(["Já guardada", "Legado"]);
  });
});

describe("ObservacoesService — pipeline industrial", () => {
  it("formata PDF com separador ;", () => {
    expect(formatObservacoesForPdf(["A", "B"])).toBe("A; B");
  });

  it("resolve observações apenas de pieceObservacoes (ignora legado na pipeline)", () => {
    const obs = resolveObservacoesForCutListItem(
      {
        id: "box-cima",
        nome: "Cima",
        quantidade: 1,
        dimensoes: { largura: 1, altura: 1, profundidade: 1 },
        espessura: 18,
        material: "mdf",
        tipo: "cima",
        metadata: { panelId: "cima-1", observacao: "Legado não usado" },
      },
      { pieceObservacoes: { "cima-1": ["Store"] } }
    );
    expect(obs).toEqual(["Store"]);
  });
});

describe("collectObservationsForItem", () => {
  it("recolhe exclusivamente de pieceObservacoes", () => {
    const obs = collectObservationsForItem(
      { id: "p1", metadata: { panelId: "p1", observacao: "Legado ignorado" } },
      undefined,
      { p1: ["Store"] }
    );
    expect(obs).toEqual(["Store"]);
  });

  it("ignora rules.observacoesPadrao (legado removido da pipeline)", () => {
    const obs = collectObservationsForItem(
      { metadata: { observacao: "A" } },
      { etiqueta: { observacoesPadrao: "Padrão" } },
      undefined
    );
    expect(obs).toEqual([]);
  });

  it("limita a 3 entradas para etiqueta v5", () => {
    const obs = collectObservationsForItem(
      { id: "p1", metadata: { panelId: "p1" } },
      undefined,
      { p1: ["1", "2", "3", "4"] }
    );
    expect(obs).toHaveLength(3);
    expect(obs).toEqual(["1", "2", "3"]);
  });
});
