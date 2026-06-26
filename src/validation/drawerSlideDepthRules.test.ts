import { describe, expect, it } from "vitest";
import {
  DRAWER_SIDE_DEPTH_SLIDE_CLEARANCE_MM,
  DRAWER_SLIDE_LENGTHS_MM,
  resolveDrawerSideDepthMm,
  resolveDrawerSlideLength,
  resolveDrawerUsableDepthMm,
} from "../core/drawers/drawerSlideDepth";
import { drawerGroupToLayerItems, generateDrawerGroup } from "../core/drawers";
import { settingsDefaults } from "../core/settings/settingsSchema";

describe("Regras industriais — profundidade de corrediças", () => {
  it("resolveDrawerSlideLength escolhe o maior comprimento que cabe", () => {
    expect(resolveDrawerSlideLength(478)).toBe(450);
    expect(resolveDrawerSlideLength(512)).toBe(500);
    expect(resolveDrawerSlideLength(600)).toBe(600);
    expect(resolveDrawerSlideLength(349)).toBe(350);
    expect(resolveDrawerSlideLength(0)).toBe(350);
  });

  it("profundidade útil = P externa − costa − espessura frente − folgas", () => {
    expect(resolveDrawerUsableDepthMm(560, 19, 20)).toBe(511);
    expect(resolveDrawerUsableDepthMm(500, 19, 20)).toBe(451);
  });

  it("bodyDepth da gaveta é igual ao comprimento da corrediça", () => {
    const group = generateDrawerGroup({
      boxWidth: 600,
      boxHeight: 400,
      boxDepth: 560,
      boxThickness: 19,
      boxId: "slide-depth",
      drawerCount: 1,
      drawerType: "normal",
      heightMode: "equal",
      availableDepths: settingsDefaults.gavetas.gavetaProfundidadesDisponiveisMm,
      drawerSettings: settingsDefaults.gavetas,
    });
    const [layer] = drawerGroupToLayerItems(group);
    const usable = resolveDrawerUsableDepthMm(560, 19, settingsDefaults.gavetas.gavetaRecuoProfundidadeCorredicaMm);
    const expectedSlide = resolveDrawerSlideLength(usable);

    expect(expectedSlide).toBe(500);
    expect(layer.bodyDepth).toBe(expectedSlide);
    expect(layer.pullDistanceMm).toBe(expectedSlide);
    expect(DRAWER_SLIDE_LENGTHS_MM).toContain(layer.bodyDepth);
  });

  it("laterais têm comprimento = corrediça − 10 mm (regra industrial)", () => {
    const group = generateDrawerGroup({
      boxWidth: 600,
      boxHeight: 400,
      boxDepth: 560,
      boxThickness: 19,
      boxId: "side-depth",
      drawerCount: 1,
      drawerType: "normal",
      heightMode: "equal",
      availableDepths: settingsDefaults.gavetas.gavetaProfundidadesDisponiveisMm,
      drawerSettings: settingsDefaults.gavetas,
    });
    const [layer] = drawerGroupToLayerItems(group);
    const slide = layer.bodyDepth ?? 0;

    expect(slide).toBe(500);
    expect(layer.leftSideDepth).toBe(slide - DRAWER_SIDE_DEPTH_SLIDE_CLEARANCE_MM);
    expect(layer.rightSideDepth).toBe(slide - DRAWER_SIDE_DEPTH_SLIDE_CLEARANCE_MM);
    expect(resolveDrawerSideDepthMm(400)).toBe(390);
    expect(resolveDrawerSideDepthMm(450)).toBe(440);
  });
});
