import { describe, expect, it } from "vitest";
import {
  DRILL_HOLE_VIEWER_COLORS,
  INDUSTRIAL_DESIGN_PANEL_ERROR_COLOR,
  INDUSTRIAL_DESIGN_PANEL_SELECTION_COLOR,
  INDUSTRIAL_DESIGN_PAIRING_LINE_COLOR,
  resolveDrillHoleViewerColorHex,
  resolvePanelOutlineColorHex,
  resolvePanelOutlineHighlight,
} from "./drillHoleViewerColors";

describe("drillHoleViewerColors", () => {
  it("mapeia cores por tipo de furo", () => {
    expect(resolveDrillHoleViewerColorHex("cavilha")).toBe(DRILL_HOLE_VIEWER_COLORS.cavilha);
    expect(resolveDrillHoleViewerColorHex("dobradica")).toBe(DRILL_HOLE_VIEWER_COLORS.dobradica);
    expect(resolveDrillHoleViewerColorHex("dobradica_fixacao")).toBe(DRILL_HOLE_VIEWER_COLORS.dobradica);
    expect(resolveDrillHoleViewerColorHex("prateleira")).toBe(DRILL_HOLE_VIEWER_COLORS.tecnico);
    expect(resolveDrillHoleViewerColorHex("corredica")).toBe(DRILL_HOLE_VIEWER_COLORS.tecnico);
    expect(resolveDrillHoleViewerColorHex("parafuso")).toBe(DRILL_HOLE_VIEWER_COLORS.parafuso);
    expect(resolveDrillHoleViewerColorHex("fixacao_estrutural")).toBe(
      DRILL_HOLE_VIEWER_COLORS.fixacaoEstrutural
    );
    expect(resolveDrillHoleViewerColorHex("minifix")).toBe(DRILL_HOLE_VIEWER_COLORS.fixacaoEstrutural);
  });

  it("prioriza erro > seleccionado > default no contorno do painel", () => {
    expect(resolvePanelOutlineHighlight(true, true)).toBe("error");
    expect(resolvePanelOutlineHighlight(false, true)).toBe("selected");
    expect(resolvePanelOutlineHighlight(false, false)).toBe("default");

    expect(resolvePanelOutlineColorHex("error")).toBe(INDUSTRIAL_DESIGN_PANEL_ERROR_COLOR);
    expect(resolvePanelOutlineColorHex("selected")).toBe(INDUSTRIAL_DESIGN_PANEL_SELECTION_COLOR);
    expect(resolvePanelOutlineColorHex("default")).toBeNull();
  });

  it("cor da linha de emparelhamento é cinza claro", () => {
    expect(INDUSTRIAL_DESIGN_PAIRING_LINE_COLOR).toBe(0xc8d0dc);
  });
});
