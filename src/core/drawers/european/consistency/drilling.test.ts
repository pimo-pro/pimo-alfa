import { describe, expect, it } from "vitest";
import { enforceDrillingIdentity } from "./enforceDrillingIdentity";
import type { EuropeanDrawerHole } from "../types";

describe("consistency/drilling", () => {
  it("converte pieceRef de gaveta para códigos SSOT e preserva módulo", () => {
    const holes: EuropeanDrawerHole[] = [
      { x: 1, y: 2, z: 0, diameter: 5, depth: 12, holeType: "corredica", face: "A", pieceRef: "front" },
      { x: 1, y: 2, z: 0, diameter: 5, depth: 12, holeType: "corredica", face: "A", pieceRef: "gav_lat_esq" },
      { x: 1, y: 2, z: 0, diameter: 5, depth: 12, holeType: "corredica", face: "A", pieceRef: "module_lat_dir" },
      { x: 1, y: 2, z: 0, diameter: 5, depth: 12, holeType: "fundo", face: "A", pieceRef: "bottom" },
    ];
    const out = enforceDrillingIdentity(holes, { drawerCount: 1, drawerIndex0: 0 });
    expect(out[0]!.pieceRef).toBe("gav_fren");
    expect(out[1]!.pieceRef).toBe("gav_lat_esq");
    expect(out[2]!.pieceRef).toBe("module_lat_dir");
    expect(out[3]!.pieceRef).toBe("gav_fun");
    expect(out[0]!.x).toBe(1);
  });
});
