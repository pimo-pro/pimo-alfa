import { describe, it, expect } from "vitest";
import { computeFinanceiroUnificado } from "./financeiroUnificado";
import { defaultRulesConfig } from "../rules/rulesConfig";
import { getPrecoPorMaterial } from "../pricing/pricing";
import { calcularCustoPainel } from "../manufacturing/boxManufacturing";
import { getMaterial } from "../manufacturing/materials";
import type { BoxModule } from "../types";
import type { DoorLayerItem as DoorLayer } from "../../models/BoxLayers";

/**
 * Proxy CAIXA 1201: modulo 600x720x560, porta dupla, 1 prateleira, sem gavetas.
 * Alvo mercado: paineis ~66, orla ~3, ferragens ~10-12, CNC ~12-18, total 180-260.
 */
describe("CAIXA 1201 — precos de mercado", () => {
  it("costa 10mm usa 20 EUR/m2; 19mm usa 31 EUR/m2", () => {
    expect(getPrecoPorMaterial("mdf_branco", 19)).toBe(31);
    expect(getPrecoPorMaterial("mdf_branco", 10)).toBe(20);
    expect(getPrecoPorMaterial("mdf_branco-10", 10)).toBe(20);
    const costa = calcularCustoPainel(
      {
        id: "c",
        tipo: "costa",
        largura_mm: 600,
        altura_mm: 700,
        espessura_mm: 10,
        quantidade: 1,
        material: "mdf_branco",
        custo: 0,
      } as never,
      getMaterial("mdf_branco")
    );
    expect(costa).toBeCloseTo(0.6 * 0.7 * 20, 2);
  });

  it("snapshot financeiro dentro das faixas de mercado", () => {
    const doorH = 700;
    const leftDoor: DoorLayer = {
      id: "d-left",
      parentBoxId: "b1",
      groupType: "dupla",
      width: 297,
      height: doorH,
      thickness: 19,
      materialId: "mdf_branco",
      material: "mdf_branco",
      openDirection: "left",
      isOpen: false,
      hingeSide: "left",
      pivot: "left-edge",
      posX: -150,
      posY: 0,
      posZ: 300,
      rotY: 0,
      manualDimensions: true,
    };
    const rightDoor: DoorLayer = {
      ...leftDoor,
      id: "d-right",
      openDirection: "right",
      hingeSide: "right",
      pivot: "right-edge",
      posX: 150,
    };

    const box = {
      id: "b1",
      nome: "CAIXA 1201",
      dimensoes: { largura: 600, altura: 720, profundidade: 560 },
      espessura: 19,
      portaTipo: "porta_dupla",
      gavetas: 0,
      prateleiras: 1,
      doorsLayer: [leftDoor, rightDoor],
      drawersLayer: [],
      costaAtiva: true,
      material: "mdf_branco",
    } as unknown as BoxModule;

    const snap = computeFinanceiroUnificado({
      boxes: [box],
      rules: defaultRulesConfig,
      materialId: "mdf_branco",
      projectName: "CAIXA 1201",
      remates: [],
      rodapes: [],
    });

    const c = snap.custosEffective;
    const total = Number(snap.totalProjeto) || Number(snap.subtotalComAdmin) || 0;

    // Diagnostico embutido na mensagem de falha
    const diag = JSON.stringify({
      paineis: c.paineis,
      orla: c.orla,
      ferragens: c.ferragens,
      operacoes: c.operacoes,
      operacoesAvancadas: c.operacoesAvancadas,
      desperdicio: c.desperdicio,
      montagem: c.montagem ?? (snap as { adminMontagem?: number }).adminMontagem,
      adm: c.adm,
      subtotal: snap.subtotal,
      subtotalComAdmin: snap.subtotalComAdmin,
      totalProjeto: snap.totalProjeto,
      ops: snap.operacoesBreakdown,
    });

    expect(c.paineis, diag).toBeGreaterThan(40);
    expect(c.paineis, diag).toBeLessThan(95);
    expect(c.orla, diag).toBeGreaterThan(0.5);
    expect(c.orla, diag).toBeLessThan(6);
    expect(c.ferragens, diag).toBeGreaterThan(7);
    expect(c.ferragens, diag).toBeLessThan(15);
    // CNC/Drill a 50% das tarifas anteriores (~2–12)
    expect(c.operacoes, diag).toBeGreaterThan(2);
    expect(c.operacoes, diag).toBeLessThan(12);
    expect(c.operacoesAvancadas ?? 0, diag).toBeLessThan(3);
    // ADM 5% (não 10%)
    expect(c.adm, diag).toBeGreaterThan(0);
    expect(c.adm / Math.max(1e-6, snap.subtotal), diag).toBeCloseTo(0.05, 2);

    // Materiais+servicos tipicos: 100–280 (UI com IVA ~180–260)
    expect(total, diag).toBeGreaterThan(90);
    expect(total, diag).toBeLessThan(280);
  });
});
