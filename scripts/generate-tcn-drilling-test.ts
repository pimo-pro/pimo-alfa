/**
 * Gera TCN completo de teste: lateral direita (prateleira + fixação dobradiça) + porta (35 mm).
 * Uso: npx vite run scripts/generate-tcn-drilling-test.ts
 * Ou: node --experimental-vm-modules com loader se necessário.
 *
 * Validações esperadas no relatório:
 * - 2 linhas de furos de prateleira; margens topo/base; espaçamento 30–50 mm
 * - Por cada dobradiça na lateral: 3 furos (2 calço a 37 mm + 1 parafuso união a 53 mm, centrado em Y)
 * - Porta: mínimo 2 dobradiças (35 mm), posições Y = distTopo e altura−distFundo
 * - Sem furos extra nas laterais (só prateleira + conjuntos de 3 por dobradiça)
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Polyfill localStorage para getSettings() em Node
const storage: Record<string, string> = {};
if (typeof globalThis.localStorage === "undefined") {
  (globalThis as any).localStorage = {
    getItem: (key: string) => storage[key] ?? null,
    setItem: (key: string, value: string) => {
      storage[key] = value;
    },
    removeItem: (key: string) => {
      delete storage[key];
    },
  };
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "cnc-examples-output");

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  // Importações dinâmicas para evitar side-effects no top-level (localStorage já mockado)
  const { defaultRulesConfig } = await import("../src/core/rules/rulesConfig");
  const { cutlistComPrecoFromBox } = await import("../src/core/manufacturing/cutlistFromBoxes");
  const { cutlistToPieces, runCutLayout } = await import("../src/core/cutlayout/cutLayoutEngine");
  const { exportCncFiles } = await import("../src/core/cnc/cncExport");

  type BoxModule = import("../src/core/types").BoxModule;

  const box: BoxModule = {
    id: "test-box-1",
    nome: "Módulo teste TCN",
    dimensoes: { largura: 600, altura: 800, profundidade: 400 },
    espessura: 19,
    tipoBorda: "reta",
    tipoFundo: "integrado",
    models: [],
    prateleiras: 2,
    portaTipo: "porta_simples",
    gavetas: 0,
    alturaGaveta: 0,
    doorsLayer: [],
    drawersLayer: [],
    ferragens: [],
    cutList: [],
    cutListComPreco: [],
    estrutura3D: null,
    precoTotalPecas: 0,
  };

  const box2: BoxModule = {
    id: "test-box-2",
    nome: "Módulo porta dupla",
    dimensoes: { largura: 800, altura: 900, profundidade: 450 },
    espessura: 19,
    tipoBorda: "reta",
    tipoFundo: "integrado",
    models: [],
    prateleiras: 3,
    portaTipo: "porta_dupla",
    gavetas: 0,
    alturaGaveta: 0,
    doorsLayer: [],
    drawersLayer: [],
    ferragens: [],
    cutList: [],
    cutListComPreco: [],
    estrutura3D: null,
    precoTotalPecas: 0,
  };

  const rules = defaultRulesConfig;
  const cutlist1 = cutlistComPrecoFromBox(box, rules);
  const cutlist2 = cutlistComPrecoFromBox(box2, rules);
  const cutlist = [...cutlist1, ...cutlist2];

  const lateral = cutlist.find((i) => i.tipo === "lateral_direita");
  const porta = cutlist.find((i) => i.tipo && String(i.tipo).startsWith("porta"));

  if (!lateral || !porta) {
    throw new Error(
      "Cutlist sem lateral_direita ou porta. Encontrados: " +
        cutlist.map((i) => i.tipo).join(", ")
    );
  }

  // Relatório de furação para validação
  const lateralHoles = (lateral.furacoesTecnicas ?? []).map((h: any) => ({
    x: h.x,
    y: h.y,
    diametro: h.diametro,
    profundidade: h.profundidade,
    tipo: h.tipo,
    face: h.face,
  }));
  const portaHoles = (porta.furacoesTecnicas ?? []).map((h: any) => ({
    x: h.x,
    y: h.y,
    diametro: h.diametro,
    profundidade: h.profundidade,
    tipo: h.tipo,
    face: h.face,
  }));

  const prateleiraHoles = lateralHoles.filter((h: any) => h.tipo === "prateleira");
  const fixacaoHoles = lateralHoles.filter((h: any) => h.tipo === "dobradica_fixacao");
  const parafusoUniaoHoles = lateralHoles.filter((h: any) => h.tipo === "dobradica_parafuso_uniao");
  const dobradicaHoles = portaHoles.filter((h: any) => h.tipo === "dobradica");
  const numHingesLateral = fixacaoHoles.length / 2;
  const outrosLateral = lateralHoles.length - prateleiraHoles.length - fixacaoHoles.length - parafusoUniaoHoles.length;

  const xPrateleira = [...new Set(prateleiraHoles.map((h: any) => h.x))].sort((a, b) => a - b);
  const altLateral = lateral.dimensoes?.altura ?? 0;
  const margem70OkPorta = dobradicaHoles.every((h: any) => h.y >= 70 && h.y <= (porta.dimensoes?.altura ?? 0) - 70);
  const centrosFixacao = [...new Set([...fixacaoHoles, ...parafusoUniaoHoles].map((h: any) => h.y))].sort((a: number, b: number) => a - b);
  const margem70OkLateral = centrosFixacao.length === 0 || centrosFixacao.every((y: number) => y >= 70 && y <= altLateral - 70);
  const larguraLateral = lateral.dimensoes?.largura ?? 0;
  const margem60OkPrateleira =
    xPrateleira.length >= 2 &&
    (Math.min(...xPrateleira) === 60) &&
    (Math.max(...xPrateleira) === larguraLateral - 60);
  const yPrateleira = [...new Set(prateleiraHoles.map((h: any) => h.y))].sort((a, b) => a - b);
  const spacing =
    yPrateleira.length > 1
      ? yPrateleira.slice(1).map((y, i) => y - yPrateleira[i])
      : [];

  const posicoesYDobradicaPortaMod1 = dobradicaHoles.map((h: any) => h.y).sort((a: number, b: number) => a - b);
  const posicoesYDobradicaLateralMod1 = [...new Set([...fixacaoHoles, ...parafusoUniaoHoles].map((h: any) => h.y))].sort((a: number, b: number) => a - b);

  const report = {
    geradoEm: new Date().toISOString(),
    portasGeradas: {
      modulo1: (() => {
        const portasMod1 = cutlist1.filter((i) => i.tipo && String(i.tipo).startsWith("porta"));
        const byTipo: Record<string, number> = {};
        portasMod1.forEach((p) => { byTipo[p.tipo] = (byTipo[p.tipo] ?? 0) + 1; });
        return { lista: Object.entries(byTipo).map(([tipo, quantidade]) => ({ tipo, quantidade })), total: portasMod1.length };
      })(),
      modulo2: (() => {
        const portasMod2 = cutlist2.filter((i) => i.tipo && String(i.tipo).startsWith("porta"));
        const byTipo: Record<string, number> = {};
        portasMod2.forEach((p) => { byTipo[p.tipo] = (byTipo[p.tipo] ?? 0) + 1; });
        return { lista: Object.entries(byTipo).map(([tipo, quantidade]) => ({ tipo, quantidade })), total: portasMod2.length };
      })(),
    },
    modulo1_portaSimples: {
      box: { id: box.id, dimensoes: box.dimensoes, prateleiras: box.prateleiras, portaTipo: box.portaTipo },
      posicoesYDobradicaPorta: posicoesYDobradicaPortaMod1,
      posicoesYDobradicaLateral: posicoesYDobradicaLateralMod1,
      lateral_direita: {
        dimensoes: lateral.dimensoes,
        totalFuros: lateralHoles.length,
        porTipo: {
          prateleira: prateleiraHoles.length,
          dobradica_fixacao: fixacaoHoles.length,
          dobradica_parafuso_uniao: parafusoUniaoHoles.length,
          outros: outrosLateral,
        },
        validacaoPrateleira: {
          numLinhasX: xPrateleira.length,
          xValores: xPrateleira,
          xFrenteMm: Math.min(...xPrateleira),
          xFundoMm: Math.max(...xPrateleira),
          margem60Ok: margem60OkPrateleira,
          numPosicoesY: yPrateleira.length,
          espacamentoMin: spacing.length ? Math.min(...spacing) : null,
          espacamentoMax: spacing.length ? Math.max(...spacing) : null,
        },
        validacaoFixacao: {
          numConjuntos3Furos: numHingesLateral,
          numFurosCalco: fixacaoHoles.length,
          numFurosParafusoUniao: parafusoUniaoHoles.length,
          xCalco: fixacaoHoles[0]?.x ?? null,
          xParafusoUniao: parafusoUniaoHoles[0]?.x ?? null,
          posicoesY: posicoesYDobradicaLateralMod1,
          diametroCalco: fixacaoHoles[0]?.diametro ?? null,
          profundidadeCalco: fixacaoHoles[0]?.profundidade ?? null,
          todasDentroDaAltura: [...fixacaoHoles, ...parafusoUniaoHoles].every(
            (h: any) => h.y >= 0 && h.y <= (lateral.dimensoes.altura ?? 0)
          ),
          margem70Ok: margem70OkLateral,
        },
      },
      porta: {
        dimensoes: porta.dimensoes,
        totalFuros: portaHoles.length,
        validacaoDobradica: {
          numFuros: dobradicaHoles.length,
          minEsperado: 2,
          posicoes: dobradicaHoles.map((h: any) => ({ x: h.x, y: h.y })),
          posicoesY: posicoesYDobradicaPortaMod1,
          diametro: dobradicaHoles[0]?.diametro ?? null,
          profundidade: dobradicaHoles[0]?.profundidade ?? null,
          margem70Ok: margem70OkPorta,
        },
      },
    },
    modulo2_portaDupla: (() => {
      const lat2 = cutlist2.find((i) => i.tipo === "lateral_direita");
      const portas2 = cutlist2.filter((i) => i.tipo && String(i.tipo).startsWith("porta"));
      const hLat = (lat2?.furacoesTecnicas ?? []) as any[];
      const pr = hLat.filter((h: any) => h.tipo === "prateleira").length;
      const fix = hLat.filter((h: any) => h.tipo === "dobradica_fixacao").length;
      const uniao = hLat.filter((h: any) => h.tipo === "dobradica_parafuso_uniao").length;
      const outros = hLat.length - pr - fix - uniao;
      const fixUniao = hLat.filter((h: any) => h.tipo === "dobradica_fixacao" || h.tipo === "dobradica_parafuso_uniao");
      const posicoesYLateral2 = [...new Set(fixUniao.map((h: any) => h.y))].sort((a: number, b: number) => a - b);
      const primeiraPorta2 = portas2[0];
      const dobradicaPorta2 = (primeiraPorta2?.furacoesTecnicas ?? []).filter((h: any) => h.tipo === "dobradica");
      const posicoesYPorta2 = dobradicaPorta2.map((h: any) => h.y).sort((a: number, b: number) => a - b);
      return {
        posicoesYDobradicaPorta: posicoesYPorta2,
        posicoesYDobradicaLateral: posicoesYLateral2,
        lateral_direita: lat2 ? { totalFuros: hLat.length, prateleira: pr, dobradica_fixacao: fix, dobradica_parafuso_uniao: uniao, outros } : null,
        portas: portas2.length,
        dobradicaPorPorta: portas2.map((p) => (p.furacoesTecnicas ?? []).filter((h: any) => h.tipo === "dobradica").length),
      };
    })(),
  };

  const reportPath = join(OUT_DIR, "TCN_DRILLING_TEST_REPORT.json");
  await writeFile(reportPath, JSON.stringify(report, null, 2), "utf-8");
  console.log("Relatório de furação guardado:", reportPath);

  // Layout: apenas lateral + porta na mesma chapa para gerar TCN
  const sheetDef = {
    largura_mm: 2750,
    altura_mm: 1830,
    espessura_mm: 19,
  };

  const itemsForLayout = [lateral, porta].map((i) => ({
    dimensoes: i.dimensoes,
    espessura: i.espessura ?? 19,
    quantidade: 1,
    boxId: i.boxId,
    nome: i.nome ?? i.tipo,
    material: i.material,
    materialId: i.materialId,
    holes: i.holes,
    furacoesTecnicas: i.furacoesTecnicas,
    furacoes: (i as any).furacoes,
    grainDirection: i.grainDirection,
    visualMaterial: (i as any).visualMaterial,
  }));

  const pieces = cutlistToPieces(itemsForLayout);
  const layoutResult = runCutLayout(pieces, sheetDef, {
    groupByThicknessOnly: true,
    rotationPreferenceMode: "aggressive",
    rotationWeight: 0.8,
    rotationPenalty: 0.45,
  });

  if (!layoutResult.sheets.length) {
    throw new Error("Layout não gerou chapas.");
  }

  const projectStub = { projectName: "TCN_Test_Drilling" };
  const cncResult = exportCncFiles(projectStub, layoutResult, []);

  const tcnContent = cncResult.files.map((f) => f.tcn).join("\n\n");
  const tcnPath = join(OUT_DIR, "TCN_DRILLING_TEST.tcn");
  await writeFile(tcnPath, tcnContent, "utf-8");
  console.log("TCN guardado:", tcnPath);

  const reportTxt = [
    "=== RELATÓRIO DE VALIDAÇÃO - FURAÇÃO LATERAL + PORTA ===",
    "",
    "PORTAS GERADAS (tipos e quantidades)",
    "  Módulo 1 (porta simples): " + report.portasGeradas.modulo1.lista.map((x: any) => x.tipo + " × " + x.quantidade).join(", ") + " (total: " + report.portasGeradas.modulo1.total + ")",
    "  Módulo 2 (porta dupla):   " + report.portasGeradas.modulo2.lista.map((x: any) => x.tipo + " × " + x.quantidade).join(", ") + " (total: " + report.portasGeradas.modulo2.total + ")",
    "",
    "POSIÇÕES Y DAS DOBRADIÇAS",
    "  Na porta (35 mm) — Módulo 1: " + report.modulo1_portaSimples.posicoesYDobradicaPorta.join(", ") + " mm",
    "  Na lateral (fixação) — Módulo 1: " + report.modulo1_portaSimples.posicoesYDobradicaLateral.join(", ") + " mm",
    "  Na porta (35 mm) — Módulo 2: " + (report.modulo2_portaDupla.posicoesYDobradicaPorta ?? []).join(", ") + " mm",
    "  Na lateral (fixação) — Módulo 2: " + (report.modulo2_portaDupla.posicoesYDobradicaLateral ?? []).join(", ") + " mm",
    "  (Mínimo 70 mm do topo e do fundo do painel.)",
    "",
    "1) LATERAL DIREITA",
    "   - Furos de prateleira: " + prateleiraHoles.length,
    "   - Número de linhas (X distintos): " + xPrateleira.length + " (esperado: 2)",
    "   - Posições X (frente / fundo): " + xPrateleira.join(", ") + " mm (esperado: 60 e " + (larguraLateral - 60) + ")",
    "   - Margem 70 mm (dobradiças): porta " + (margem70OkPorta ? "OK" : "FALHA") + ", lateral " + (margem70OkLateral ? "OK" : "FALHA") + "",
    "   - Margem 60 mm (prateleira frente/fundo): " + (margem60OkPrateleira ? "OK" : "FALHA"),
    "   - Posições Y (altura): " + yPrateleira.length,
    "   - Espaçamento entre Y (mm): " + (spacing.length ? spacing.map((s) => s.toFixed(1)).join(", ") : "N/A"),
    "   - Espaçamento min/max (30–50 mm): " + (spacing.length ? `${Math.min(...spacing).toFixed(1)} / ${Math.max(...spacing).toFixed(1)}` : "N/A"),
    "   - Furos fixação (2 calço + 1 parafuso união por dobradiça): " + fixacaoHoles.length + " calço + " + parafusoUniaoHoles.length + " união",
    "   - Conjuntos de 3 furos por dobradiça: " + numHingesLateral + " (esperado: = nº dobradiças porta)",
    "   - X calço (mm): " + (fixacaoHoles[0]?.x ?? "N/A") + " (esperado: 37)",
    "   - X parafuso união (mm): " + (parafusoUniaoHoles[0]?.x ?? "N/A") + " (esperado: 53)",
    "   - Diâmetro calço: " + (fixacaoHoles[0]?.diametro ?? "N/A") + " mm, profundidade: " + (fixacaoHoles[0]?.profundidade ?? "N/A") + " mm",
    "   - Furos 'outros' na lateral: " + outrosLateral + " (esperado: 0)",
    "",
    "2) PORTA",
    "   - Furos dobradiça 35 mm: " + dobradicaHoles.length + " (mínimo 2)",
    "   - Posições (x, y): " + dobradicaHoles.map((h: any) => `(${h.x}, ${h.y})`).join(", "),
    "   - Diâmetro: " + (dobradicaHoles[0]?.diametro ?? "N/A") + " mm (esperado: 35)",
    "   - Profundidade: " + (dobradicaHoles[0]?.profundidade ?? "N/A") + " mm (esperado: 12–13)",
    "",
    "3) TCN",
    "   - Ficheiro: " + tcnPath,
    "   - Chapas: " + cncResult.files.length,
    "",
    "4) MÓDULO 2 (PORTA DUPLA)",
    "   - Lateral: total " + (report.modulo2_portaDupla.lateral_direita?.totalFuros ?? "N/A") +
      " (prateleira: " + (report.modulo2_portaDupla.lateral_direita?.prateleira ?? "N/A") +
      ", calço: " + (report.modulo2_portaDupla.lateral_direita?.dobradica_fixacao ?? "N/A") +
      ", parafuso união: " + (report.modulo2_portaDupla.lateral_direita?.dobradica_parafuso_uniao ?? "N/A") +
      ", outros: " + (report.modulo2_portaDupla.lateral_direita?.outros ?? "N/A") + ")",
    "   - Portas: " + report.modulo2_portaDupla.portas + ", dobradiças por porta: " + (report.modulo2_portaDupla.dobradicaPorPorta?.join(", ") ?? "N/A"),
    "",
  ].join("\n");

  const reportTxtPath = join(OUT_DIR, "TCN_DRILLING_TEST_REPORT.txt");
  await writeFile(reportTxtPath, reportTxt, "utf-8");
  console.log("Relatório texto:", reportTxtPath);

  console.log("\n" + reportTxt);
  console.log("\n--- Conteúdo TCN completo ---\n");
  console.log(tcnContent);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
