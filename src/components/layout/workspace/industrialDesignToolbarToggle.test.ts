import { describe, expect, it, vi } from "vitest";
import { IndustrialDesignWorkspaceMode } from "../../../3d/viewer-engine/modes/IndustrialDesignWorkspaceMode";
import {
  applyIndustrialDesignToolbarToggle,
  isIndustrialDesignToolbarActive,
  nextIndustrialDesignToolbarEnabled,
} from "./industrialDesignToolbarToggle";

describe("industrialDesignToolbarToggle", () => {
  it("isIndustrialDesignToolbarActive exige painel aberto e modo viewer activo", () => {
    expect(isIndustrialDesignToolbarActive(false, () => true)).toBe(false);
    expect(isIndustrialDesignToolbarActive(true, () => false)).toBe(false);
    expect(isIndustrialDesignToolbarActive(true, () => true)).toBe(true);
    expect(isIndustrialDesignToolbarActive(true, undefined)).toBe(false);
  });

  it("nextIndustrialDesignToolbarEnabled alterna o estado", () => {
    expect(nextIndustrialDesignToolbarEnabled(false)).toBe(true);
    expect(nextIndustrialDesignToolbarEnabled(true)).toBe(false);
  });

  it("applyIndustrialDesignToolbarToggle activa viewer e painel", () => {
    const setWorkspaceEnabled = vi.fn();
    const setPanelOpen = vi.fn();
    const setPanelRenderingEnabled = vi.fn();
    const setPanelEdgesVisible = vi.fn();

    applyIndustrialDesignToolbarToggle(
      {
        setIndustrialDesignWorkspaceEnabled: setWorkspaceEnabled,
        setIndustrialDesignPanelOpen: setPanelOpen,
        setPanelRenderingEnabled,
        setPanelEdgesVisible,
      },
      true
    );

    expect(setWorkspaceEnabled).toHaveBeenCalledWith(true);
    expect(setPanelOpen).toHaveBeenCalledWith(true);
    expect(setPanelRenderingEnabled).toHaveBeenCalledWith(true);
    expect(setPanelEdgesVisible).toHaveBeenCalledWith(true);
  });

  it("applyIndustrialDesignToolbarToggle desactiva viewer e painel", () => {
    const setWorkspaceEnabled = vi.fn();
    const setPanelOpen = vi.fn();

    applyIndustrialDesignToolbarToggle(
      {
        setIndustrialDesignWorkspaceEnabled: setWorkspaceEnabled,
        setIndustrialDesignPanelOpen: setPanelOpen,
      },
      false
    );

    expect(setWorkspaceEnabled).toHaveBeenCalledWith(false);
    expect(setPanelOpen).toHaveBeenCalledWith(false);
  });
});

describe("IndustrialDesignWorkspaceMode (viewer)", () => {
  it("setEnabled(true) activa renderização de painéis (overlays industriais)", () => {
    const setPanelRenderingEnabled = vi.fn();
    const mode = new IndustrialDesignWorkspaceMode({
      getBoxEntry: () => undefined,
      getBoxMesh: () => null,
      raycastIntersects: () => [],
      updateBoxDrillMarkers: () => {},
      setPanelRenderingEnabled,
      setValidationHighlightPanels: () => {},
      setSelectionHighlightPanel: () => {},
      syncDesignVisuals: () => {},
    });

    mode.setEnabled(true);
    expect(mode.isEnabled()).toBe(true);
    expect(setPanelRenderingEnabled).toHaveBeenCalledWith(true);

    mode.setEnabled(false);
    expect(mode.isEnabled()).toBe(false);
    expect(setPanelRenderingEnabled).toHaveBeenCalledWith(false);
  });
});
