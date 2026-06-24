import { describe, expect, it } from "vitest";
import {
  applyNoBackPanelState,
  resolveCostaAtivaForBox,
  resolveNoBackPanel,
} from "./backPanelFlags";

describe("backPanelFlags", () => {
  it("resolveNoBackPanel prioriza noBackPanel e fallback para costaAtiva", () => {
    expect(resolveNoBackPanel({ noBackPanel: true })).toBe(true);
    expect(resolveNoBackPanel({ noBackPanel: false })).toBe(false);
    expect(resolveNoBackPanel({ costaAtiva: false })).toBe(true);
    expect(resolveNoBackPanel({ costaAtiva: true })).toBe(false);
    expect(resolveNoBackPanel({})).toBe(false);
  });

  it("applyNoBackPanelState mantém campos sincronizados", () => {
    expect(applyNoBackPanelState({ id: "b1" }, true)).toEqual({
      id: "b1",
      noBackPanel: true,
      costaAtiva: false,
    });
    expect(applyNoBackPanelState({ id: "b1", costaAtiva: false }, false)).toEqual({
      id: "b1",
      noBackPanel: false,
      costaAtiva: true,
    });
  });

  it("resolveCostaAtivaForBox é inverso de sem costa", () => {
    expect(resolveCostaAtivaForBox({ noBackPanel: true })).toBe(false);
    expect(resolveCostaAtivaForBox({ noBackPanel: false })).toBe(true);
  });
});
