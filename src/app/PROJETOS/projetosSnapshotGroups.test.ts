import { describe, expect, it } from "vitest";

import type { SavedProjectRecord } from "../../core/projects/types";
import { buildProjetosElementGroups } from "./projetosSnapshotGroups";

function makeRecord(projectState: Record<string, unknown>): SavedProjectRecord {
  return {
    id: "pimo-test1234567890ab",
    name: "NP2625622",
    sequence: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ownerId: "guest-test",
    ownerName: "Test",
    thumbnailDataUrl: null,
    snapshot: {
      projectState,
      viewerSnapshot: {},
    },
  };
}

describe("buildProjetosElementGroups", () => {
  it("agrupa caixas, remates, roda pé, peças industriais e independentes", () => {
    const record = makeRecord({
      projectName: "NP2625622",
      workspaceBoxes: [
        {
          id: "box-1",
          nome: "Armário A",
          dimensoes: { largura: 600, altura: 720, profundidade: 560 },
          espessura: 19,
          posicaoX_mm: 0,
          posicaoZ_mm: 0,
        },
      ],
      boxes: [
        {
          id: "box-1",
          nome: "Armário A",
          cutList: [],
          cutListComPreco: [
            { id: "p-1", nome: "Lateral Esq", tipo: "lateral", boxId: "box-1", quantidade: 1, dimensoes: { largura: 700, altura: 560, profundidade: 19 }, espessura: 19, material: "MDF", preco: 0, precoTotal: 0 },
          ],
        },
      ],
      remates: [
        {
          id: "rem-1",
          parentBoxId: "box-1",
          tipo: "DIR",
          width: 100,
          height: 720,
          depth: 19,
          materialPresetId: "mdf-branco",
          position: { xMm: 0, yMm: 0, zMm: 0 },
          rotation: { xRad: 0, yRad: 0, zRad: 0 },
          followBox: true,
          name: "Remate DIR",
        },
        {
          id: "rem-standalone",
          tipo: "FRENTE",
          width: 400,
          height: 600,
          depth: 19,
          materialPresetId: "mdf-branco",
          position: { xMm: 0, yMm: 0, zMm: 0 },
          rotation: { xRad: 0, yRad: 0, zRad: 0 },
          followBox: false,
          name: "Peça avulsa",
        },
      ],
      rodapes: [
        {
          id: "rod-1",
          parentBoxId: "box-1",
          kind: "SIMPLE",
          materialId: "mdf-branco",
          thicknessMm: 19,
          heightMm: 100,
          dimensions: { widthMm: 600, heightMm: 100, depthMm: 19 },
          name: "Roda pé A",
        },
      ],
      extractedPartsByBoxId: {
        "box-1": {
          "model-1": [
            {
              id: "cad-1",
              nome: "Puxador CAD",
              tipo: "acessorio",
              sourceType: "glb_importado",
              boxId: "box-1",
              quantidade: 1,
              dimensoes: { largura: 128, altura: 32, profundidade: 20 },
              espessura: 20,
              material: "Metal",
            },
          ],
        },
      },
    });

    const groups = buildProjetosElementGroups(record);
    expect(groups).not.toBeNull();
    expect(groups!.boxes).toHaveLength(1);
    expect(groups!.remates).toHaveLength(1);
    expect(groups!.standalonePieces).toHaveLength(1);
    expect(groups!.rodapes).toHaveLength(1);
    expect(groups!.industrialPieces.length).toBeGreaterThan(0);
    expect(groups!.industrialPieces.some((row) => row.subtitle?.includes("lateral") || row.label.toLowerCase().includes("lateral"))).toBe(true);
    expect(groups!.readyPieces).toHaveLength(1);
    expect(groups!.readyPieces[0].label).toBe("Puxador CAD");
  });

  it("devolve null quando snapshot não tem projectState válido", () => {
    expect(buildProjetosElementGroups(null)).toBeNull();
    expect(
      buildProjetosElementGroups({
        id: "x",
        name: "Vazio",
        sequence: 1,
        createdAt: "",
        updatedAt: "",
        ownerId: "",
        ownerName: "",
        thumbnailDataUrl: null,
        snapshot: { projectState: null, viewerSnapshot: {} },
      })
    ).toBeNull();
  });
});
