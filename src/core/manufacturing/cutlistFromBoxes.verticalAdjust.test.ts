import { describe, it, expect } from "vitest";
import {
  applyDoorHeightWithOrigin,
  computeDoorVerticalGaps,
  hasVerticallyStackedDoors,
  VERTICAL_STACK_MIN_DELTA_MM,
} from "../doors/doorLayerGeometry";
import { cutlistComPrecoFromBox } from "./cutlistFromBoxes";
import { defaultRulesConfig } from "../rules/rulesConfig";
import type { BoxModule } from "../types";
import type { DoorLayerItem as DoorLayer } from "../../models/BoxLayers";

function hingeOffsetsFromBottom(holes: { y: number; holeType?: string }[], panelHeight: number): number[] {
  return holes
    .filter((h) => h.holeType === "dobradica" || h.holeType === "dobradica_fixacao")
    .map((h) => Math.round(panelHeight - h.y))
    .filter((y, i, arr) => arr.indexOf(y) === i)
    .sort((a, b) => a - b);
}

describe("ajuste vertical vs stack — alinhamento L/R", () => {
  it("? posY < limiar NAO activa stack (porta dupla com ajuste ligeiro)", () => {
    expect(VERTICAL_STACK_MIN_DELTA_MM).toBe(40);
    expect(hasVerticallyStackedDoors([{ posY: 0 }, { posY: 10 }])).toBe(false);
    expect(hasVerticallyStackedDoors([{ posY: 0 }, { posY: 39 }])).toBe(false);
    expect(hasVerticallyStackedDoors([{ posY: -20 }, { posY: 20 }])).toBe(true);
    expect(hasVerticallyStackedDoors([{ posY: 0 }, { posY: 200 }])).toBe(true);
  });

  it("ajuste -20mm origem topo numa folha: posY diverge mas furos L/R no referencial do vao", () => {
    const openingH = 720 - 19; // laterais tipicas se calcularAlturaLaterais
    const doorH0 = 700;
    const left0 = {
      id: "dl",
      height: doorH0,
      posY: 0,
      hingeSide: "left" as const,
    };
    const leftAdj = {
      ...left0,
      ...applyDoorHeightWithOrigin(left0 as DoorLayer, doorH0 - 20, "top"),
    };
    expect(leftAdj.posY).toBeGreaterThan(0);
    expect(Math.abs(leftAdj.posY - 0)).toBeLessThan(VERTICAL_STACK_MIN_DELTA_MM);
    expect(hasVerticallyStackedDoors([leftAdj, { posY: 0 }])).toBe(false);

    const gapsL = computeDoorVerticalGaps(openingH, leftAdj.height, leftAdj.posY);
    const gapsR = computeDoorVerticalGaps(openingH, doorH0, 0);
    // Gaps diferentes por folha — correcto; stack falso nao deve misturar eixos
    expect(gapsL.bottomGapMm).not.toBe(gapsR.bottomGapMm);
  });

  it("cutlist porta_dupla com posY assimetrico: laterais recebem Y no vao (nao eixo da folha)", () => {
    const boxHeight = 720;
    const esp = 19;
    const openingH = boxHeight - esp; // calcularAlturaLaterais default true
    const doorH = openingH - 4; // folgas ~2+2
    const leftDoor: DoorLayer = {
      id: "d-left",
      parentBoxId: "b1",
      groupType: "dupla",
      width: 297,
      height: doorH - 20,
      thickness: 19,
      materialId: "mdf",
      material: "mdf",
      openDirection: "left",
      isOpen: false,
      hingeSide: "left",
      pivot: "left-edge",
      posX: -150,
      posY: 10,
      posZ: 300,
      rotY: 0,
      manualDimensions: true,
    };
    const rightDoor: DoorLayer = {
      ...leftDoor,
      id: "d-right",
      height: doorH,
      openDirection: "right",
      hingeSide: "right",
      pivot: "right-edge",
      posX: 150,
      posY: 0,
    };
    expect(hasVerticallyStackedDoors([leftDoor, rightDoor])).toBe(false);

    const box = {
      id: "b1",
      nome: "Dupla",
      dimensoes: { largura: 600, altura: boxHeight, profundidade: 560 },
      espessura: esp,
      portaTipo: "porta_dupla",
      gavetas: 0,
      prateleiras: 0,
      doorsLayer: [leftDoor, rightDoor],
      drawersLayer: [],
    } as unknown as BoxModule;

    const items = cutlistComPrecoFromBox(box, defaultRulesConfig);
    const latEsq = items.find((i) => i.tipo === "lateral_esquerda");
    const latDir = items.find((i) => i.tipo === "lateral_direita");
    const portaEsq = items.find((i) => i.tipo === "porta_dupla" && i.doorsLayerIndex === 0)
      ?? items.filter((i) => String(i.tipo).includes("porta"))[0];
    const portaDir = items.filter((i) => String(i.tipo).includes("porta"))[1];

    expect(latEsq?.drillHoles?.length).toBeGreaterThan(0);
    expect(latDir?.drillHoles?.length).toBeGreaterThan(0);

    const latH = Number(latEsq?.dimensoes?.altura) || openingH;
    // Offsets desde a base do vao nas laterais devem ser finitos e iguais em cardinalidade tipica
    const yEsq = hingeOffsetsFromBottom(latEsq!.drillHoles ?? [], latH);
    const yDir = hingeOffsetsFromBottom(latDir!.drillHoles ?? [], latH);
    expect(yEsq.length).toBeGreaterThan(0);
    expect(yDir.length).toBeGreaterThan(0);
    // Ambos no referencial do vao (valores tipicos 70..latH-70)
    for (const y of [...yEsq, ...yDir]) {
      expect(y).toBeGreaterThanOrEqual(50);
      expect(y).toBeLessThanOrEqual(latH - 50);
    }

    void portaEsq;
    void portaDir;
  });
});
