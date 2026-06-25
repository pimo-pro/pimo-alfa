/**
 * Dados agregados da cutlist e ferragens (project.boxes).
 * Usado por CutlistPanel e pelos painéis focados (Portas, Ferragens, Totais, etc.).
 *
 * FASE 2: quando `drawersLayer` existe, painéis de gaveta vêm de `cutlistComPrecoFromBox`
 * (pipeline moderno, alinhado com CNC). Caso contrário, fallback legado (`gerarModeloIndustrial`).
 */

import { useMemo } from "react";
import { useProject } from "../context/useProject";
import { gerarModeloIndustrial } from "../core/manufacturing/boxManufacturing";
import { cutlistComPrecoFromBox } from "../core/manufacturing/cutlistFromBoxes";
import { gerarFerragensIndustriais, agruparPorComponente } from "../core/industriais/ferragensIndustriais";
import { useComponentTypes } from "./useComponentTypes";
import { useFerragens } from "./useFerragens";
import type { Ferragem } from "../core/ferragens/ferragens";
import type { BoxModule, CutListItemComPreco } from "../core/types";
import { computeBoxProfundidadeLeituraMm } from "../utils/boxProfundidadeLeituraUi";
import {
  DRAWER_SLIDES_PER_DRAWER,
  boxUsesModernDrawerPipeline,
  isDrawerPieceTipo,
} from "../services/drawerCutlistAdapter";
import { resolveRematePieceNomeForRemate } from "../core/remate/labels";

export type PainelRow = {
  key: string;
  boxNome: string;
  tipo: string;
  largura_mm: number;
  altura_mm: number;
  espessura_mm: number;
  orientacaoFibra: string;
  quantidade: number;
  custo: number;
  boxProfundidadeExternaMm: number;
  boxProfundidadeInternaUtilMm: number;
};

export type PortaRow = {
  key: string;
  boxNome: string;
  tipo: string;
  largura_mm: number;
  altura_mm: number;
  espessura_mm: number;
  dobradicas: number;
  custo: number;
};

export type GavetaRow = {
  key: string;
  boxNome: string;
  largura_mm: number;
  altura_mm: number;
  profundidade_mm: number;
  espessura_mm: number;
  corrediças: number;
  custo: number;
};

export type FerragemRow = {
  key: string;
  boxNome: string;
  tipo: string;
  quantidade: number;
  precoUnitario: number;
  custo: number;
};

export type OrlaFerragemRow = {
  key: string;
  boxNome: string;
  presetNome: string;
  metros: number;
  custo: number;
  tipo: "normal" | "orla_junto";
  pieceNome?: string;
};

export type RemateRow = {
  key: string;
  boxNome: string;
  nome: string;
  material: string;
  largura_mm: number;
  altura_mm: number;
  profundidade_mm: number;
  quantidade: number;
  custo: number;
};

function cutlistItemToPainelRow(
  item: CutListItemComPreco,
  boxNome: string,
  boxProfundidadeExternaMm: number,
  boxProfundidadeInternaUtilMm: number
): PainelRow {
  return {
    key: `${item.boxId ?? "box"}-${item.id}`,
    boxNome,
    tipo: item.tipo,
    largura_mm: item.dimensoes.largura,
    altura_mm: item.dimensoes.altura,
    espessura_mm: item.espessura,
    orientacaoFibra: item.grainDirection ?? "XX",
    quantidade: item.quantidade,
    custo: item.precoTotal,
    boxProfundidadeExternaMm,
    boxProfundidadeInternaUtilMm,
  };
}

function buildGavetaRowsFromModernCutlist(
  box: BoxModule,
  boxNome: string,
  modernCutlist: CutListItemComPreco[]
): GavetaRow[] {
  const drawerPieceIds = modernCutlist.filter((item) => isDrawerPieceTipo(item.tipo));
  const drawerIndices = new Set<number>();
  for (const item of drawerPieceIds) {
    const match = item.id.match(/-drawer-(\d+)-/);
    if (match) drawerIndices.add(Number(match[1]));
  }

  const rows: GavetaRow[] = [];
  for (const drawerIndex of [...drawerIndices].sort((a, b) => a - b)) {
    const prefix = `${box.id}-drawer-${drawerIndex}`;
    const drawerPieces = drawerPieceIds.filter((item) => item.id.startsWith(prefix));
    const front = drawerPieces.find(
      (item) => item.tipo === "gaveta_frente_ext" || item.tipo === "gaveta_frente"
    );
    if (!front) continue;

    rows.push({
      key: `${box.id}-gaveta-${drawerIndex}`,
      boxNome,
      largura_mm: front.dimensoes.largura,
      altura_mm: front.dimensoes.altura,
      profundidade_mm: front.dimensoes.profundidade,
      espessura_mm: front.espessura,
      corrediças: DRAWER_SLIDES_PER_DRAWER,
      custo: drawerPieces.reduce((sum, piece) => sum + piece.precoTotal, 0),
    });
  }
  return rows;
}

function sumCutlistAreaMm2(items: CutListItemComPreco[]): number {
  return items.reduce(
    (total, item) => total + item.dimensoes.largura * item.dimensoes.altura * item.quantidade,
    0
  );
}

export function useCutlistData() {
  const { project } = useProject();
  const { componentTypes } = useComponentTypes();
  const { ferragens } = useFerragens();
  const boxes = useMemo(() => project.boxes ?? [], [project.boxes]);

  const resolveFerragemPrecoUnitario = useMemo(() => {
    const byId = new Map(ferragens.map((f) => [f.id, f]));
    const idAliases: Record<string, string[]> = {
      dobradicas: ["dobradica_35mm"],
      corredicas: ["corredica_esq", "corredica_dir"],
      suportes_prateleira: ["suporte_prateleira"],
    };
    const categoryAliases: Record<string, Ferragem["categoria"]> = {
      dobradicas: "dobradica",
      corredicas: "corredica",
      suportes_prateleira: "suporte",
    };

    return (tipo: string): number | null => {
      for (const id of idAliases[tipo] ?? []) {
        const preco = byId.get(id)?.precoUnitario;
        if (typeof preco === "number") return preco;
      }

      const categoria = categoryAliases[tipo];
      if (!categoria) return null;
      const ferragem = ferragens.find((item) => item.categoria === categoria);
      return typeof ferragem?.precoUnitario === "number" ? ferragem.precoUnitario : null;
    };
  }, [ferragens]);

  const ferragensIndustriaisDetalhado = useMemo(
    () => gerarFerragensIndustriais(componentTypes, ferragens),
    [componentTypes, ferragens]
  );
  const ferragensPorComponente = useMemo(
    () => agruparPorComponente(ferragensIndustriaisDetalhado),
    [ferragensIndustriaisDetalhado]
  );

  const aggregated = useMemo(() => {
    let totalAreaMm2 = 0;
    let totalPaineisQty = 0;
    let totalPortasQty = 0;
    let totalGavetasQty = 0;
    let totalFerragensQty = 0;
    let custoTotalPaineis = 0;
    let custoTotalPortas = 0;
    let custoTotalGavetas = 0;
    let custoTotalFerragens = 0;
    const allPaineis: PainelRow[] = [];
    const allPortas: PortaRow[] = [];
    const allGavetas: GavetaRow[] = [];
    const allFerragens: FerragemRow[] = [];
    const allOrlaFerragens: OrlaFerragemRow[] = [];
    const allRemates: RemateRow[] = [];

    boxes.forEach((box) => {
      const { profundidadeExternaMm, profundidadeInternaUtilMm } = computeBoxProfundidadeLeituraMm(
        box,
        project.rules
      );
      const modelo = gerarModeloIndustrial(box, project.rules);
      const boxNome = box.nome || box.id;
      const useModernDrawers = boxUsesModernDrawerPipeline(box);

      if (useModernDrawers) {
        const modernCutlist = cutlistComPrecoFromBox(box, project.rules, project.materialId);
        totalAreaMm2 += sumCutlistAreaMm2(modernCutlist);

        for (const item of modernCutlist) {
          totalPaineisQty += item.quantidade;
          custoTotalPaineis += item.precoTotal;
          allPaineis.push(
            cutlistItemToPainelRow(item, boxNome, profundidadeExternaMm, profundidadeInternaUtilMm)
          );
        }

        const gavetaRows = buildGavetaRowsFromModernCutlist(box, boxNome, modernCutlist);
        for (const gaveta of gavetaRows) {
          totalGavetasQty += 1;
          custoTotalGavetas += gaveta.custo;
          allGavetas.push(gaveta);
        }
      } else {
        totalAreaMm2 += modelo.cutlist.areaTotal_mm2;
        modelo.paineis.forEach((p) => {
          totalPaineisQty += p.quantidade;
          custoTotalPaineis += p.custo;
          allPaineis.push({
            ...p,
            key: `${box.id}-${p.id}`,
            boxNome,
            boxProfundidadeExternaMm: profundidadeExternaMm,
            boxProfundidadeInternaUtilMm: profundidadeInternaUtilMm,
          });
        });
        modelo.gavetas.forEach((p) => {
          totalGavetasQty += 1;
          custoTotalGavetas += p.custo;
          allGavetas.push({ ...p, key: `${box.id}-${p.id}`, boxNome });
        });
      }

      modelo.portas.forEach((p) => {
        totalPortasQty += 1;
        custoTotalPortas += p.custo;
        allPortas.push({ ...p, key: `${box.id}-${p.id}`, boxNome });
      });

      modelo.ferragens.forEach((f) => {
        const precoUnitario = resolveFerragemPrecoUnitario(f.tipo);
        const custo = precoUnitario != null ? precoUnitario * f.quantidade : f.custo;
        totalFerragensQty += f.quantidade;
        custoTotalFerragens += custo;
        allFerragens.push({
          ...f,
          key: `${box.id}-${f.id}`,
          boxNome,
          precoUnitario: precoUnitario ?? (f.quantidade > 0 ? f.custo / f.quantidade : 0),
          custo,
        });
      });
    });

    (project.ferragemOrla?.linhas ?? []).forEach((linha) => {
      allOrlaFerragens.push({
        key: linha.id,
        boxNome: linha.boxNome ?? "—",
        presetNome: linha.presetNome,
        metros: linha.metros,
        custo: linha.custo,
        tipo: linha.tipo,
        pieceNome: linha.pieceNome,
      });
    });

    const remateBoxNameById: Record<string, string> = {};
    for (const b of boxes) {
      if (b?.id) remateBoxNameById[b.id] = typeof b.nome === "string" ? b.nome : b.id;
    }

    (project.remates ?? []).forEach((remate) => {
      const box = boxes.find((b) => b.id === remate.parentBoxId);
      allRemates.push({
        key: remate.id,
        boxNome: box?.nome ?? remate.parentBoxId ?? "Standalone",
        nome: resolveRematePieceNomeForRemate(remate, remateBoxNameById),
        material: remate.materialPresetId,
        largura_mm: remate.width,
        altura_mm: remate.height,
        profundidade_mm: remate.depth,
        quantidade: 1,
        custo: project.cutListComPreco?.find((item) => item.id === remate.id)?.precoTotal ?? 0,
      });
    });

    const totalPecas = totalPaineisQty + totalPortasQty;
    const totalOrlaMetros = allOrlaFerragens.reduce((s, l) => s + l.metros, 0);
    const custoTotalOrla = allOrlaFerragens.reduce((s, l) => s + l.custo, 0);
    const custoTotalRemates = allRemates.reduce((s, l) => s + l.custo, 0);
    const totalAreaM2 = totalAreaMm2 / 1_000_000;
    const custoTotal =
      custoTotalPaineis + custoTotalPortas + custoTotalGavetas + custoTotalFerragens + custoTotalOrla + custoTotalRemates;

    return {
      boxes,
      allPaineis,
      allPortas,
      allGavetas,
      allFerragens,
      allOrlaFerragens,
      allRemates,
      ferragensIndustriaisDetalhado,
      ferragensPorComponente,
      totalAreaMm2,
      totalAreaM2,
      totalPaineisQty,
      totalPortasQty,
      totalGavetasQty,
      totalFerragensQty,
      totalPecas,
      custoTotalPaineis,
      custoTotalPortas,
      custoTotalGavetas,
      custoTotalFerragens,
      totalOrlaMetros,
      custoTotalOrla,
      custoTotalRemates,
      custoTotal,
    };
  }, [boxes, project.rules, project.materialId, project.ferragemOrla, project.remates, project.cutListComPreco, ferragensIndustriaisDetalhado, ferragensPorComponente, resolveFerragemPrecoUnitario]);

  return aggregated;
}
