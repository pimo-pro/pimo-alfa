import { describe, it, expect } from "vitest";
import type { RematePiece } from "../../../core/remate/rematePieceTypes";
import {
  collectLRemateCimaGroups,
  isLRemateCimaCompositeCandidate,
  resolveLRemateCimaLeadId,
} from "./remateLCompositeVisual";
import { computeLRemateCimaIntLocalOffsetMm } from "../../../core/remate/remateLGeometry";

const ext: RematePiece = {
  id: "ext-1",
  tipo: "L",
  productType: "L",
  partIndex: 1,
  parentGroupId: "g1",
  mountSlot: "CIMA",
  width: 600,
  height: 100,
  depth: 19,
  materialPresetId: "m",
  position: { xMm: 0, yMm: 720, zMm: 281 },
  rotation: { xRad: 0, yRad: 0, zRad: 0 },
  followBox: true,
  name: "ext",
};

const int: RematePiece = {
  ...ext,
  id: "int-1",
  partIndex: 2,
  mountSlot: "DIR",
  name: "int",
};

describe("remateLCompositeVisual", () => {
  it("identifica par L CIMA como candidato composto", () => {
    expect(isLRemateCimaCompositeCandidate(ext)).toBe(true);
    expect(isLRemateCimaCompositeCandidate(int)).toBe(true);
  });

  it("resolve lead id a partir de ext ou int", () => {
    const pieces = [ext, int];
    expect(resolveLRemateCimaLeadId("ext-1", pieces)).toBe("ext-1");
    expect(resolveLRemateCimaLeadId("int-1", pieces)).toBe("ext-1");
  });

  it("agrupa ext+int pelo parentGroupId", () => {
    const groups = collectLRemateCimaGroups([ext, int]);
    expect(groups.size).toBe(1);
    expect(groups.get("g1")?.ext.id).toBe("ext-1");
    expect(groups.get("g1")?.int.id).toBe("int-1");
  });

  it("offset local industrial alinha int pela espessura", () => {
    expect(computeLRemateCimaIntLocalOffsetMm({ height: 100, depth: 19 })).toEqual({
      xMm: 0,
      yMm: -40.5,
      zMm: -59.5,
    });
  });
});
