import { describe, expect, it } from "vitest";
import type { DoorLayerItem } from "../../models/BoxLayers";
import {
  resolveDoorIndustrialLabel,
  resolveDoorLabel,
  resolveDoorPositionKind,
} from "./doorLabels";

function door(partial: Partial<DoorLayerItem> & Pick<DoorLayerItem, "id">): DoorLayerItem {
  return {
    parentBoxId: "b1",
    width: 600,
    height: 720,
    thickness: 19,
    openDirection: "left",
    isOpen: false,
    hingeSide: "left",
    pivot: "left-edge",
    posX: 0,
    posY: 0,
    posZ: 300,
    rotY: 0,
    ...partial,
  };
}

describe("doorLabels", () => {
  it("resolveDoorLabel — laterais por hingeSide", () => {
    expect(resolveDoorLabel(door({ id: "d1", hingeSide: "right" }), 0)).toBe("Porta Direita");
    expect(resolveDoorLabel(door({ id: "d2", hingeSide: "left" }), 1)).toBe("Porta Esquerda");
    expect(resolveDoorIndustrialLabel(door({ id: "d1", hingeSide: "right" }), 0)).toBe("port_dir");
    expect(resolveDoorIndustrialLabel(door({ id: "d2", hingeSide: "left" }), 1)).toBe("port_esq");
  });

  it("resolveDoorLabel — cima/baixa por hingeSide vertical", () => {
    expect(resolveDoorLabel(door({ id: "d1", hingeSide: "top", openDirection: "up" }), 0)).toBe(
      "Porta Cima"
    );
    expect(resolveDoorIndustrialLabel(door({ id: "d2", hingeSide: "bottom", openDirection: "down" }), 0)).toBe(
      "port_baix"
    );
  });

  it("resolveDoorLabel — empilhamento vertical (caixa forno)", () => {
    const lower = door({ id: "inf", hingeSide: "left", posY: -400 });
    const upper = door({ id: "sup", hingeSide: "left", posY: 400 });
    const all = [lower, upper];
    expect(resolveDoorPositionKind(lower, 0, all)).toBe("baixa");
    expect(resolveDoorPositionKind(upper, 1, all)).toBe("cima");
    expect(resolveDoorIndustrialLabel(lower, 0, all)).toBe("port_baix");
    expect(resolveDoorIndustrialLabel(upper, 1, all)).toBe("port_cima");
  });

  it("fallback legado sem posição — Porta 1→dir, Porta 2→esq", () => {
    expect(resolveDoorIndustrialLabel(undefined, 0)).toBe("port_dir");
    expect(resolveDoorIndustrialLabel(undefined, 1)).toBe("port_esq");
    expect(resolveDoorLabel(undefined, 0)).toBe("Porta Direita");
    expect(resolveDoorLabel(undefined, 1)).toBe("Porta Esquerda");
  });

  it("porta dupla — esquerda e direita", () => {
    const left = door({ id: "d-esq", hingeSide: "left", openDirection: "left" });
    const right = door({ id: "d-dir", hingeSide: "right", openDirection: "right" });
    const all = [left, right];
    expect(resolveDoorLabel(left, 0, all)).toBe("Porta Esquerda");
    expect(resolveDoorLabel(right, 1, all)).toBe("Porta Direita");
  });
});
