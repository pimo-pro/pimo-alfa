import { describe, expect, it } from "vitest";
import {
  DRAWER_HANDLE_PROFILES,
  getDefaultProfileForHandleType,
  resolveDrawerHandleProfile,
  STANDARD_HANDLE_CENTER_DISTANCES_MM,
} from "./drawerHandleCatalog";
import { computeDrawerHandleHoles } from "./drilling/DrawerHandleDrillingRules";

describe("drawerHandleCatalog", () => {
  it("tem perfis para cada tipo de puxador activo", () => {
    expect(getDefaultProfileForHandleType("Puxador")?.kind).toBe("bar_double_hole");
    expect(getDefaultProfileForHandleType("Cava")?.kind).toBe("groove");
    expect(getDefaultProfileForHandleType("Perfil Alumínio")?.kind).toBe("profile_groove");
    expect(getDefaultProfileForHandleType("Nenhum")).toBeNull();
  });

  it("resolve CC personalizado para puxador barra", () => {
    const profile = resolveDrawerHandleProfile("Puxador", "puxador_cc80", 128);
    expect(profile?.defaultCenterDistanceMm).toBe(128);
    expect(profile?.holes).toHaveLength(2);
    expect(profile?.holes[0].xFromCenter).toBe(-64);
    expect(profile?.holes[1].xFromCenter).toBe(64);
  });

  it("CC padrão inclui valores industriais", () => {
    expect(STANDARD_HANDLE_CENTER_DISTANCES_MM).toEqual([80, 96, 128, 160]);
    expect(DRAWER_HANDLE_PROFILES.some((p) => p.id === "puxador_cc96")).toBe(true);
  });
});

describe("computeDrawerHandleHoles", () => {
  const basePiece = {
    tipo: "gaveta_frente" as const,
    largura: 560,
    altura: 198,
    espessura: 19,
  };

  it("gera 2 furos puxador com tipo puxador (CC 80)", () => {
    const holes = computeDrawerHandleHoles({
      ...basePiece,
      handleType: "Puxador",
      handleCenterDistanceMm: 80,
      handlePosition: "Centro",
    });
    expect(holes).toHaveLength(2);
    expect(holes.every((h) => h.tipo === "puxador")).toBe(true);
    expect(holes[0].x).toBeCloseTo(240, 0);
    expect(holes[1].x).toBeCloseTo(320, 0);
  });

  it("gera rasgo para cava", () => {
    const holes = computeDrawerHandleHoles({
      ...basePiece,
      handleType: "Cava",
      handleProfileId: "cava_horizontal",
      handlePosition: "Topo",
    });
    expect(holes).toHaveLength(1);
    expect(holes[0].holeSubtype).toBe("groove");
    expect(holes[0].tipo).toBe("puxador");
    expect(holes[0].y).toBeCloseTo(40, 0);
  });

  it("não gera furos para Nenhum", () => {
    expect(computeDrawerHandleHoles({ ...basePiece, handleType: "Nenhum" })).toHaveLength(0);
  });
});
