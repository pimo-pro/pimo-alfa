import { describe, expect, it, beforeEach } from "vitest";
import { invariantRulesStore } from "../core/invariants/config/invariantRulesStore";
import { invariantNotificationStore } from "../stores/invariantNotificationStore";
import {
  runInvariantSuite,
  assertExportInvariantsAllowed,
} from "../core/invariants/integration/invariantContract";
import { InvariantViolationError } from "../core/invariants/errors/InvariantViolationError";
import type { ProjectState } from "../context/projectTypes";
import { defaultState } from "../context/projectState";
import type { CutListItemComPreco } from "../core/types";

function minimalProject(overrides: Partial<ProjectState> = {}): ProjectState {
  return { ...defaultState, ...overrides };
}

describe("Invariant Engine", () => {
  beforeEach(() => {
    invariantRulesStore.reset();
    invariantNotificationStore.getState().clearAll();
  });

  it("detecta furos fora da peça", () => {
    const cutList: CutListItemComPreco[] = [
      {
        id: "p1",
        nome: "Lateral",
        quantidade: 1,
        dimensoes: { largura: 500, altura: 400, profundidade: 18 },
        espessura: 18,
        material: "MDF",
        tipo: "lateral",
        drillHoles: [{ x: 600, y: 200, diametro: 5, profundidade: 10, tipo: "cavilha", face: "frente" }],
      },
    ];

    const result = runInvariantSuite({
      project: minimalProject({ cutListComPreco: cutList }),
      cutList,
      phase: "drilling",
    });

    expect(result.issues.some((i) => i.ruleId === "drill-holes-out-of-bounds")).toBe(true);
  });

  it("permite exportação quando blockGenerationOnErrors está desactivado", () => {
    invariantRulesStore.setBlockGenerationOnErrors(false);
    const cutList: CutListItemComPreco[] = [
      {
        id: "p1",
        nome: "Lateral",
        quantidade: 1,
        dimensoes: { largura: 500, altura: 400, profundidade: 18 },
        espessura: 18,
        material: "MDF",
        tipo: "lateral",
        drillHoles: [{ x: 900, y: 200, diametro: 5, profundidade: 10, tipo: "cavilha", face: "frente" }],
      },
    ];

    expect(() =>
      assertExportInvariantsAllowed({
        project: minimalProject({ cutListComPreco: cutList }),
        cutList,
        phase: "export",
      })
    ).not.toThrow();
  });

  it("bloqueia exportação quando blockGenerationOnErrors está activo e há erros", () => {
    invariantRulesStore.setBlockGenerationOnErrors(true);
    const cutList: CutListItemComPreco[] = [
      {
        id: "p1",
        nome: "Lateral",
        quantidade: 1,
        dimensoes: { largura: 500, altura: 400, profundidade: 18 },
        espessura: 18,
        material: "MDF",
        tipo: "lateral",
        drillHoles: [{ x: 900, y: 200, diametro: 5, profundidade: 10, tipo: "cavilha", face: "frente" }],
      },
    ];

    expect(() =>
      assertExportInvariantsAllowed({
        project: minimalProject({ cutListComPreco: cutList }),
        cutList,
        phase: "export",
      })
    ).toThrow(InvariantViolationError);
  });

  it("regista notificações persistentes", () => {
    const cutList: CutListItemComPreco[] = [
      {
        id: "p1",
        nome: "Lateral",
        quantidade: 1,
        dimensoes: { largura: 0, altura: 400, profundidade: 18 },
        espessura: 18,
        material: "MDF",
        tipo: "lateral",
      },
    ];

    assertExportInvariantsAllowed({
      project: minimalProject({ cutListComPreco: cutList }),
      cutList,
      phase: "export",
    });

    const notifications = invariantNotificationStore.getState().notifications;
    expect(notifications.length).toBeGreaterThan(0);
    expect(notifications[0]?.read).toBe(false);
  });

  it("admin pode activar/desactivar regras", () => {
    invariantRulesStore.toggleRule("inv-drill-out-of-bounds", false);
    const cutList: CutListItemComPreco[] = [
      {
        id: "p1",
        nome: "Lateral",
        quantidade: 1,
        dimensoes: { largura: 500, altura: 400, profundidade: 18 },
        espessura: 18,
        material: "MDF",
        tipo: "lateral",
        drillHoles: [{ x: 900, y: 200, diametro: 5, profundidade: 10, tipo: "cavilha", face: "frente" }],
      },
    ];

    const result = runInvariantSuite({
      project: minimalProject({ cutListComPreco: cutList }),
      cutList,
      phase: "drilling",
    });

    expect(result.issues.filter((i) => i.ruleId === "drill-holes-out-of-bounds")).toHaveLength(0);
  });
});
