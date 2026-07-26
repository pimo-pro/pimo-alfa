import { describe, expect, it } from "vitest";
import { enforcePdfIdentity } from "./enforcePdfIdentity";
import type { DrawerPDFSection } from "../types";

describe("consistency/pdf", () => {
  it("normaliza nomes de peças e pieceRef de furos", () => {
    const pdf: DrawerPDFSection = {
      title: "T",
      measureRows: [],
      pieceRows: [{ nome: "GAV Frente [gaveta_frente]", qty: "1", dims: "400 x 140 x 19", material: "m" }],
      holeRows: [
        { peca: "front", x: "1", y: "2", d: "5", depth: "12", tipo: "corredica" },
        { peca: "module_lat_esq", x: "1", y: "2", d: "5", depth: "12", tipo: "corredica" },
      ],
      notes: [],
      explodedViewNotes: [],
    };
    const out = enforcePdfIdentity(pdf, { drawerCount: 1 });
    expect(out.pieceRows[0]!.nome).toBe("gaveta frente [gav_fren]");
    expect(out.holeRows[0]!.peca).toBe("gav_fren");
    expect(out.holeRows[1]!.peca).toBe("module_lat_esq");
  });
});
