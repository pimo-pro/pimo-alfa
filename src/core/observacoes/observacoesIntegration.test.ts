import { describe, it, expect } from "vitest";
import { defaultState, applyResultados, createWorkspaceBox } from "../../context/projectState";
import { reviveState, serializeState } from "../../context/projectPersistence";
import {
  collectObservationsForItem,
  formatObservacoesForPdf,
  getBoxObservacoes,
  getPieceObservacoes,
  mergePieceObservacoesStores,
  migrateProjectPieceObservacoes,
  resolveObservacoesForCutListItem,
} from "./ObservacoesService";
import type { BoxModule } from "../types";

const cutListItem = {
  id: "box-1-cima",
  nome: "Cima",
  quantidade: 1,
  dimensoes: { largura: 600, altura: 400, profundidade: 19 },
  espessura: 19,
  material: "mdf_branco",
  tipo: "cima",
  metadata: { panelId: "cima-1", observacao: "Legado em metadata" },
};

const minimalBox = {
  id: "box-1",
  nome: "Módulo",
  cutList: [cutListItem],
} as BoxModule;

describe("observacoes — persistência snapshot", () => {
  it("roundtrip serialize/revive preserva pieceObservacoes e box.observacoes", () => {
    const wsBox = createWorkspaceBox(
      "box-1",
      "Módulo",
      defaultState.dimensoes,
      19,
      0
    );
    wsBox.observacoes = ["Nota da caixa"];

    const state = {
      ...defaultState,
      pieceObservacoes: { "cima-1": ["Verificar orla", "Atenção ao veio"] },
      workspaceBoxes: [wsBox],
    };

    const serialized = serializeState(state);
    const revived = reviveState(serialized);
    expect(revived).not.toBeNull();
    expect(revived!.pieceObservacoes["cima-1"]).toEqual(["Verificar orla", "Atenção ao veio"]);
    expect(getBoxObservacoes(revived!.workspaceBoxes[0])).toEqual(["Nota da caixa"]);
  });
});

describe("observacoes — recompute sem perda", () => {
  it("applyResultados preserva pieceObservacoes existentes", () => {
    const state = {
      ...defaultState,
      pieceObservacoes: { "cima-1": ["Persistida"] },
    };
    const after = applyResultados(state);
    expect(getPieceObservacoes("cima-1", after.pieceObservacoes)).toEqual(["Persistida"]);
  });

  it("migração legado é idempotente após primeira execução", () => {
    const store = { "cima-1": ["Já guardada"] };
    const first = migrateProjectPieceObservacoes(store, [minimalBox]);
    expect(first["cima-1"]).toEqual(["Já guardada", "Legado em metadata"]);
    const second = migrateProjectPieceObservacoes(first, [minimalBox]);
    expect(second).toBe(first);
  });
});

describe("observacoes — multi-projeto", () => {
  it("mergePieceObservacoesStores funde sem duplicar", () => {
    const merged = mergePieceObservacoesStores(
      { p1: ["A", "B"] },
      { p1: ["B", "C"], p2: ["X"] },
      undefined,
      { p3: ["Z"] }
    );
    expect(merged).toEqual({
      p1: ["A", "B", "C"],
      p2: ["X"],
      p3: ["Z"],
    });
  });
});

describe("observacoes — contrato pipeline industrial", () => {
  it("PDF/cutlist resolve apenas pieceObservacoes", () => {
    const store = { "cima-1": ["Produção OK"] };
    const text = formatObservacoesForPdf(
      resolveObservacoesForCutListItem(cutListItem, { pieceObservacoes: store })
    );
    expect(text).toBe("Produção OK");
    expect(text).not.toContain("Legado");
  });

  it("etiquetas v5 usam apenas pieceObservacoes (sem runtime.label defaults)", () => {
    const obs = collectObservationsForItem(
      cutListItem,
      { etiqueta: { observacoesPadrao: "Não deve aparecer" } },
      { "cima-1": ["Etiqueta peça"] }
    );
    expect(obs).toEqual(["Etiqueta peça"]);
  });

  it("pipeline ignora metadata quando store está vazio", () => {
    const obs = resolveObservacoesForCutListItem(cutListItem, { pieceObservacoes: {} });
    expect(obs).toEqual([]);
  });
});
