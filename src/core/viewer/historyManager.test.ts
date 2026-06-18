import { describe, expect, it } from "vitest";
import { historyManager } from "./historyManager";

describe("historyManager", () => {
  it("comprime drag contínuo num único evento", () => {
    historyManager.beginDragSession("transform.drag", "Mover");
    historyManager.beginDragSession("transform.drag", "Mover");
    expect(historyManager.isDragActive()).toBe(true);
    const event = historyManager.endDragSession();
    expect(event?.kind).toBe("transform.drag");
    expect(historyManager.isDragActive()).toBe(false);
  });

  it("regista eventos discretos", () => {
    historyManager.recordEvent("group.create", "Criar grupo");
    const recent = historyManager.getRecentEvents();
    expect(recent.some((e) => e.kind === "group.create")).toBe(true);
  });
});
