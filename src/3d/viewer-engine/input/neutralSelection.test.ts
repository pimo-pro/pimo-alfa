import { describe, expect, it } from "vitest";
import { ViewerState } from "../state/ViewerState";
import { clearCompetingSelectionsFor } from "./neutralSelection";

describe("neutralSelection", () => {
  it("preserva o tipo selecionado e limpa seleções concorrentes", () => {
    const state = new ViewerState();
    state.setSelectedBox("box-1");
    state.setSelectedRemate("remate-1");
    state.setSelectedRodape("rodape-1");
    state.setSelectedHemati("hemati-1");
    state.setSelectedDivSep({ boxId: "box-1", kind: "div", itemId: "div-1" });
    state.setSelectedWallIndex(2);
    state.setSelectedRoomElementId("door-1");
    state.setGroupTransformMemberIds(["box:box-1", "remate:remate-1"]);

    clearCompetingSelectionsFor(state, "rodape", "rodape-2");

    expect(state.getSelectedRodape()).toBe("rodape-1");
    expect(state.getSelectedHemati()).toBeNull();
    expect(state.getSelectedRemate()).toBeNull();
    expect(state.getSelectedDivSep()).toBeNull();
    expect(state.getSelectedBox()).toBeNull();
    expect(state.getSelectedWallIndex()).toBeNull();
    expect(state.getSelectedRoomElementId()).toBeNull();
    expect(state.getGroupTransformMemberIds()).toEqual([]);
  });

  it("não altera estado quando valor selecionado é nulo", () => {
    const state = new ViewerState();
    state.setSelectedBox("box-1");

    clearCompetingSelectionsFor(state, "remate", null);

    expect(state.getSelectedBox()).toBe("box-1");
  });
});
