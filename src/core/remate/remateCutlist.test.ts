import { describe, expect, it } from "vitest";
import { buildRemateCutlistItems } from "./remateCutlist";
import type { RematePiece } from "./rematePieceTypes";

function baseRemate(partial: Partial<RematePiece> & Pick<RematePiece, "id">): RematePiece {
  return {
    id: partial.id,
    tipo: "DIR",
    width: 800,
    height: 100,
    depth: 19,
    materialPresetId: "mdf_branco-19",
    position: { xMm: 0, yMm: 0, zMm: 0 },
    rotation: { xRad: 0, yRad: 0, zRad: 0 },
    followBox: true,
    name: "Remate teste",
    ...partial,
  };
}

describe("buildRemateCutlistItems", () => {
  it("exclui remates com visible=false", () => {
    const items = buildRemateCutlistItems(
      [
        baseRemate({ id: "r1", visible: true }),
        baseRemate({ id: "r2", visible: false }),
      ],
      []
    );
    expect(items.map((i) => i.id)).toEqual(["r1"]);
  });

  it("exclui remates sem dimenses vlidas (no inventa custo)", () => {
    const items = buildRemateCutlistItems(
      [
        baseRemate({ id: "ok", width: 800, height: 100 }),
        baseRemate({ id: "zero", width: 0, height: 0 }),
      ],
      []
    );
    expect(items.map((i) => i.id)).toEqual(["ok"]);
  });
});
