import { describe, it, expect } from "vitest";
import type { RematePiece } from "../../../core/remate/rematePieceTypes";
import {
  collectLRemateCompositeGroups,
  isLRemateCompositeCandidate,
  resolveLRemateCompositeLeadId,
} from "./remateLCompositeVisual";
import { computeLRemateCimaIntLocalOffsetMm } from "../../../core/remate/remateLGeometry";

const extCima: RematePiece = {
  id: "ext-cima",
  tipo: "L",
  productType: "L",
  partIndex: 1,
  parentGroupId: "g-cima",
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

const intCima: RematePiece = {
  ...extCima,
  id: "int-cima",
  partIndex: 2,
  mountSlot: "DIR",
  name: "int",
};

describe("remateLCompositeVisual", () => {
  it("identifica par L CIMA como candidato composto", () => {
    expect(isLRemateCompositeCandidate(extCima)).toBe(true);
    expect(isLRemateCompositeCandidate(intCima)).toBe(true);
  });

  it("resolve lead id a partir de ext ou int CIMA", () => {
    expect(resolveLRemateCompositeLeadId("ext-cima", [extCima, intCima])).toBe("ext-cima");
    expect(resolveLRemateCompositeLeadId("int-cima", [extCima, intCima])).toBe("ext-cima");
  });

  it("agrupa ext+int CIMA pelo parentGroupId", () => {
    const groups = collectLRemateCompositeGroups([extCima, intCima]);
    expect(groups.size).toBe(1);
    expect(groups.get("g-cima")?.ext.id).toBe("ext-cima");
  });

  it("offset local industrial alinha int pela espessura", () => {
    expect(computeLRemateCimaIntLocalOffsetMm({ height: 100, depth: 19 })).toEqual({
      xMm: 0,
      yMm: -40.5,
      zMm: -59.5,
    });
  });
});
