import { describe, expect, it, vi } from "vitest";
import type { DrawerLayerItem } from "../models/BoxLayers";
import type { WorkspaceBox } from "../core/types";
import {
  closeDrawer,
  openDrawer,
  resolveDrawerMaxPullMm,
} from "../core/drawers/DrawerMotionService";
import { toggleAllDrawersSequential, toggleDrawer } from "../core/drawers/DrawerController";

function baseDrawer(id: string, posY: number, overrides: Partial<DrawerLayerItem> = {}): DrawerLayerItem {
  return {
    id,
    parentBoxId: "box-1",
    width: 560,
    height: 200,
    depth: 530,
    frontThickness: 19,
    bodyDepth: 500,
    openDirection: "pull",
    isOpen: false,
    pullDistanceMm: 0,
    posX: 0,
    posY,
    posZ: 0,
    rotY: 0,
    ...overrides,
  };
}

function baseBox(drawers: DrawerLayerItem[]): WorkspaceBox {
  return {
    id: "box-1",
    nome: "Caixa",
    dimensoes: { largura: 600, altura: 720, profundidade: 560 },
    espessura: 19,
    gavetas: drawers.length,
    prateleiras: 0,
    portaTipo: "sem_porta",
    feetEnabled: false,
    drawersLayer: drawers,
    doorsLayer: [],
  } as WorkspaceBox;
}

describe("DrawerMotionService open/close", () => {
  it("openDrawer define pullDistanceMm = curso máximo", () => {
    const layer = baseDrawer("d1", 0);
    const opened = openDrawer(layer);
    expect(opened.isOpen).toBe(true);
    expect(opened.pullDistanceMm).toBe(500);
    expect(resolveDrawerMaxPullMm(layer)).toBe(500);
  });

  it("closeDrawer zera pullDistanceMm", () => {
    const closed = closeDrawer(baseDrawer("d1", 0, { isOpen: true, pullDistanceMm: 500 }));
    expect(closed.isOpen).toBe(false);
    expect(closed.pullDistanceMm).toBe(0);
  });
});

describe("DrawerController", () => {
  it("toggleDrawer alterna estado da gaveta clicada", () => {
    const drawers = [
      baseDrawer("d1", -200, { isOpen: true, pullDistanceMm: 500 }),
      baseDrawer("d2", 0),
    ];
    const box = baseBox(drawers);
    const calls: Array<{ id: string; isOpen: boolean }> = [];

    toggleDrawer(box, "d2", {
      getBox: () => box,
      setDrawerOpen: (id, isOpen) => calls.push({ id, isOpen }),
    });

    expect(calls).toEqual([{ id: "d2", isOpen: true }]);
  });

  it("toggleAllDrawersSequential abre de baixo para cima", () => {
    vi.useFakeTimers();
    const drawers = [
      baseDrawer("d1", -200),
      baseDrawer("d2", 0),
      baseDrawer("d3", 200),
    ];
    const box = baseBox(drawers);
    const calls: string[] = [];

    toggleAllDrawersSequential(box, {
      getBox: () => box,
      setDrawerOpen: (id, isOpen, options) => {
        if (isOpen) calls.push(id);
        expect(options?.allowMultipleOpen).toBe(true);
      },
    });

    vi.advanceTimersByTime(0);
    expect(calls).toEqual(["d1"]);
    vi.advanceTimersByTime(100);
    expect(calls).toEqual(["d1", "d2"]);
    vi.advanceTimersByTime(100);
    expect(calls).toEqual(["d1", "d2", "d3"]);
    vi.useRealTimers();
  });

  it("toggleAllDrawersSequential fecha de cima para baixo", () => {
    vi.useFakeTimers();
    const drawers = [
      baseDrawer("d1", -200, { isOpen: true, pullDistanceMm: 500 }),
      baseDrawer("d2", 0, { isOpen: true, pullDistanceMm: 500 }),
      baseDrawer("d3", 200, { isOpen: true, pullDistanceMm: 500 }),
    ];
    const box = baseBox(drawers);
    const calls: string[] = [];

    toggleAllDrawersSequential(box, {
      getBox: () => box,
      setDrawerOpen: (id, isOpen) => {
        if (!isOpen) calls.push(id);
      },
    });

    vi.advanceTimersByTime(0);
    expect(calls).toEqual(["d3"]);
    vi.advanceTimersByTime(100);
    expect(calls).toEqual(["d3", "d2"]);
    vi.advanceTimersByTime(100);
    expect(calls).toEqual(["d3", "d2", "d1"]);
    vi.useRealTimers();
  });
});
