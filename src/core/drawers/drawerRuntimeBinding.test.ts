/**
 * Verificação de runtime do binding Modelo B (produto).
 * Não altera industrial — só prova layers/DXF/CNC/overlay + gate do pipeline A.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceBox } from "../types";
import * as flags from "./drawerSystemFlags";
import {
  DRAWER_MODELO_A_STORAGE_KEY,
  DRAWER_MODELO_B_DEFAULT_MIGRATION_KEY,
  __resetModeloBProductDefaultMigrationForTests,
  applyModeloBProductDefaultMigration,
} from "./drawerSystemFlags";
import { generateDrawerGroup } from "./DrawerGenerationService";
import { drawerFactory } from "./drawerFactory";
import { resolveActiveDrawersLayer, isDrawerModeloBActive } from "./drawerModeloAGate";
import { applyDrawerPresetToBox } from "./drawerPresetService";
import type { DrawerPreset } from "./drawerPresetTypes";
import { regenerateLayersForBox } from "../../services/boxLayersService";
import {
  generateEuropeanDrawer,
  prepareEuropeanDXFFiles,
  prepareEuropeanCNCFiles,
  buildEuropeanOverlay,
  drawerEuropeanDXF,
  drawerEuropeanCNC,
  drawerEuropeanOverlay,
  drawerEuropeanGenerate,
} from "./european";

function baseBox(partial?: Partial<WorkspaceBox>): WorkspaceBox {
  return {
    id: "runtime-box-1",
    nome: "Modulo Runtime",
    dimensoes: { largura: 600, altura: 720, profundidade: 560 },
    espessura: 19,
    material: "mdf_branco",
    gavetas: 0,
    prateleiras: 0,
    portaTipo: "sem_porta",
    doorsLayer: [],
    drawersLayer: [],
    ...partial,
  } as WorkspaceBox;
}

describe("DRAWER_RUNTIME — Modelo B activo em produto", () => {
  beforeEach(() => {
    vi.spyOn(flags, "isDrawerModeloAActive").mockReturnValue(false);
  });

  it("1-3) adicionar gavetas + alterar altura/profundidade/tipo via regenerateLayersForBox", () => {
    expect(isDrawerModeloBActive()).toBe(true);

    let box = baseBox({
      gavetas: 2,
      europeanDrawerConfig: {
        systemId: "hettich-innotech-atira",
        heightMm: 144,
        depthMm: 450,
        softClose: true,
        pushOpen: false,
        count: 2,
      },
    });

    let layers = regenerateLayersForBox(box);
    box = { ...box, ...layers };
    const drawers = resolveActiveDrawersLayer(box);
    expect(drawers.length).toBeGreaterThanOrEqual(1);
    expect(drawers.every((d) => d.metadata?.modeloB === true)).toBe(true);
    expect(drawers.every((d) => d.metadata?.europeanSystemId === "hettich-innotech-atira")).toBe(
      true
    );

    box = {
      ...box,
      gavetas: 3,
      europeanDrawerConfig: {
        systemId: "blum-legrabox",
        heightMm: 90,
        depthMm: 500,
        softClose: true,
        pushOpen: false,
        count: 3,
      },
    };
    layers = regenerateLayersForBox(box);
    box = { ...box, ...layers };
    const updated = resolveActiveDrawersLayer(box);
    expect(updated.length).toBeGreaterThanOrEqual(1);
    expect(updated.every((d) => d.metadata?.modeloB === true)).toBe(true);
    expect(updated.every((d) => d.metadata?.europeanSystemId === "blum-legrabox")).toBe(true);
  });

  it("4-5) furos, medidas, overlay, DXF e CNC sao do Modelo B", () => {
    const result = generateEuropeanDrawer(
      "hettich-innotech-atira",
      {
        id: "runtime-dxf",
        nome: "Runtime DXF",
        dimensoes: { largura: 538, altura: 720, profundidade: 560 },
        espessura: 19,
        gavetas: 1,
        material: "mdf_branco",
        profundidadeInternaUtilMm: 500,
      },
      {
        systemId: "hettich-innotech-atira",
        heightMm: 144,
        depthMm: 450,
        softClose: true,
        pushOpen: false,
        count: 1,
      }
    );

    expect(result.valid, result.errors.join(" | ")).toBe(true);
    expect(result.holes.length).toBeGreaterThan(0);
    expect(result.geometry.runnerDepthMm).toBe(450);
    expect(result.geometry.bodyDepthMm).toBeLessThan(result.geometry.runnerDepthMm);

    const overlay = buildEuropeanOverlay(result);
    expect(overlay).toBeTruthy();
    expect(drawerEuropeanOverlay).toBe(buildEuropeanOverlay);

    const dxf = prepareEuropeanDXFFiles(result, { prefix: "RUNTIME_" });
    expect(dxf.files.length).toBeGreaterThan(0);
    expect(drawerEuropeanDXF).toBe(prepareEuropeanDXFFiles);

    const cnc = prepareEuropeanCNCFiles(result, { format: "cnc", prefix: "RUNTIME_" });
    expect(cnc.files.length).toBeGreaterThan(0);
    expect(drawerEuropeanCNC).toBe(prepareEuropeanCNCFiles);

    expect(drawerEuropeanGenerate).toBe(generateEuropeanDrawer);
    expect(drawerFactory.use).toBe(generateEuropeanDrawer);
  });

  it("6) pipeline antigo nao produz gavetas com Modelo A off", () => {
    const group = generateDrawerGroup({
      boxWidth: 600,
      boxHeight: 720,
      boxDepth: 560,
      boxThickness: 19,
      boxId: "legacy-should-be-empty",
      drawerCount: 2,
      drawerType: "normal",
      heightMode: "equal",
      availableDepths: [450, 500],
      drawerSettings: {
        gavetaProfundidadesDisponiveisMm: [450, 500],
        gavetaAlturaModoPadrao: "equal",
      } as never,
    });
    expect(group.drawers).toEqual([]);
    expect(group.id).toContain("inactive");
  });

  it("7) preset de gavetas usa caminho europeu (modeloB)", () => {
    const preset: DrawerPreset = {
      id: "preset-runtime",
      nome: "Runtime 2",
      drawerCount: 2,
      drawerHeightMode: "equal",
      drawers: [{ softClose: true }],
    };

    const result = applyDrawerPresetToBox(baseBox(), preset);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.box.gavetas).toBe(2);
    expect(result.box.europeanDrawerConfig?.count).toBe(2);
    const drawers = resolveActiveDrawersLayer(result.box);
    expect(drawers.every((d) => d.metadata?.modeloB === true)).toBe(true);
  });
});

describe("DRAWER_RUNTIME — localStorage nao forca Modelo A legado", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    __resetModeloBProductDefaultMigrationForTests();
  });

  it("8) migracao one-shot forca false mesmo com true legado", () => {
    const store = new Map<string, string>();
    store.set(DRAWER_MODELO_A_STORAGE_KEY, "true");

    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    });

    const prevVitest = process.env.VITEST;
    process.env.VITEST = "";
    try {
      applyModeloBProductDefaultMigration();
      expect(store.get(DRAWER_MODELO_A_STORAGE_KEY)).toBe("false");
      expect(store.get(DRAWER_MODELO_B_DEFAULT_MIGRATION_KEY)).toBe("1");

      store.set(DRAWER_MODELO_A_STORAGE_KEY, "true");
      __resetModeloBProductDefaultMigrationForTests();
      applyModeloBProductDefaultMigration();
      expect(store.get(DRAWER_MODELO_A_STORAGE_KEY)).toBe("true");
    } finally {
      process.env.VITEST = prevVitest;
      vi.unstubAllGlobals();
    }
  });
});
