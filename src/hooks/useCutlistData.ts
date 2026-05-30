/**
 * Dados agregados da cutlist e ferragens (project.boxes).
 * Usado por CutlistPanel e pelos painéis focados (Portas, Ferragens, Totais, etc.).
 */

import { useMemo } from "react";
import { useProject } from "../context/useProject";
import { gerarModeloIndustrial } from "../core/manufacturing/boxManufacturing";
import { gerarFerragensIndustriais, agruparPorComponente } from "../core/industriais/ferragensIndustriais";
import { useComponentTypes } from "./useComponentTypes";
import { useFerragens } from "./useFerragens";
import { computeBoxProfundidadeLeituraMm } from "../utils/boxProfundidadeLeituraUi";

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

export function useCutlistData() {
  const { project } = useProject();
  const { componentTypes } = useComponentTypes();
  const { ferragens } = useFerragens();
  const boxes = useMemo(() => project.boxes ?? [], [project.boxes]);

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
      modelo.portas.forEach((p) => {
        totalPortasQty += 1;
        custoTotalPortas += p.custo;
        allPortas.push({ ...p, key: `${box.id}-${p.id}`, boxNome });
      });
      modelo.gavetas.forEach((p) => {
        totalGavetasQty += 1;
        custoTotalGavetas += p.custo;
        allGavetas.push({ ...p, key: `${box.id}-${p.id}`, boxNome });
      });
      modelo.ferragens.forEach((f) => {
        totalFerragensQty += f.quantidade;
        custoTotalFerragens += f.custo;
        allFerragens.push({ ...f, key: `${box.id}-${f.id}`, boxNome });
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

    (project.remates ?? []).forEach((remate) => {
      const box = boxes.find((b) => b.id === remate.parentBoxId);
      allRemates.push({
        key: remate.id,
        boxNome: box?.nome ?? remate.parentBoxId,
        nome: remate.name,
        material: remate.materialId,
        largura_mm: remate.dimensions.widthMm,
        altura_mm: remate.dimensions.heightMm,
        profundidade_mm: remate.dimensions.depthMm,
        quantidade: 1,
        custo: project.cutListComPreco?.find((item) => item.id === remate.id)?.precoTotal ?? 0,
      });
    });

    const totalPecas = totalPaineisQty + totalPortasQty + totalGavetasQty;
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
      custoTotalOrla,
      custoTotalRemates,
      custoTotal,
    };
  }, [boxes, project.rules, project.ferragemOrla, project.remates, project.cutListComPreco, ferragensIndustriaisDetalhado, ferragensPorComponente]);

  return aggregated;
}
