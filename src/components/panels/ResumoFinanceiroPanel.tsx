/**
 * Painel Resumo Financeiro do Projeto.
 * Conteúdo extraído do antigo BottomPanel; exibido no overlay da BottomInfoToolbar.
 */

import { useMemo } from "react";
import { useProject } from "../../context/useProject";
import Panel from "../ui/Panel";
import {
  cutlistComPrecoFromBoxes,
  ferragensFromBoxes,
} from "../../core/manufacturing/cutlistFromBoxes";
import {
  calcularPrecoTotalPecas,
  calcularPrecoTotalProjeto,
} from "../../core/pricing/pricing";
import {
  CHAPA_PADRAO_LARGURA,
  CHAPA_PADRAO_ALTURA,
  DENSIDADE_PADRAO,
} from "../../core/manufacturing/materials";
import { useMaterials } from "../../hooks/useMaterials";

const microTextStyle: React.CSSProperties = { fontSize: 12, lineHeight: 1.4, color: "var(--text-muted)" };

export default function ResumoFinanceiroPanel() {
  const { project } = useProject();
  const { materials } = useMaterials();
  const boxes = useMemo(() => project.boxes ?? [], [project.boxes]);
  const cutlist = useMemo(
    () => cutlistComPrecoFromBoxes(boxes, project.rules, project.materialId, project.projectName),
    [boxes, project.rules, project.materialId, project.projectName]
  );
  const ferragens = useMemo(() => ferragensFromBoxes(boxes, project.rules), [boxes, project.rules]);
  const totalPecas = cutlist.reduce((sum, item) => sum + item.quantidade, 0);
  const totalFerragens = ferragens.reduce((sum, a) => sum + a.quantidade, 0);
  const totalItens = totalPecas + totalFerragens;
  const custoPecas = cutlist.length > 0 ? calcularPrecoTotalPecas(cutlist) : null;
  const custoFerragens =
    ferragens.length > 0 ? ferragens.reduce((s, a) => s + a.precoTotal, 0) : null;
  const custoMateriais =
    custoPecas != null && custoFerragens != null
      ? custoPecas + custoFerragens
      : custoPecas ?? custoFerragens ?? null;
  const precoTotal =
    custoPecas != null && custoFerragens != null
      ? calcularPrecoTotalProjeto(custoPecas + custoFerragens)
      : null;
  const precoPorPeca = precoTotal != null && totalPecas > 0 ? precoTotal / totalPecas : null;
  const custoMontagem =
    precoTotal != null && custoPecas != null && custoFerragens != null
      ? precoTotal - (custoPecas + custoFerragens)
      : null;
  const precoPorCaixa = precoTotal != null && boxes.length > 0 ? precoTotal / boxes.length : null;

  const areaTotalMm2 = useMemo(() => {
    return cutlist.reduce((sum, item) => {
      const largura = item.dimensoes?.largura ?? 0;
      const altura = item.dimensoes?.altura ?? 0;
      const qty = item.quantidade;
      return sum + largura * altura * qty;
    }, 0);
  }, [cutlist]);
  const areaTotalM2 = areaTotalMm2 / 1_000_000;

  const pesoTotalKg = useMemo(() => {
    return cutlist.reduce((sum, item) => {
      const largura = item.dimensoes?.largura ?? 0;
      const altura = item.dimensoes?.altura ?? 0;
      const espessura = item.espessura ?? item.dimensoes?.profundidade ?? 18;
      const qty = item.quantidade;
      const mat = materials.find((m) => m.nome === item.material);
      const densidade = mat?.densidade ?? DENSIDADE_PADRAO;
      const volumeM3 = (largura * altura * espessura * qty) / 1_000_000_000;
      return sum + volumeM3 * densidade;
    }, 0);
  }, [cutlist, materials]);

  const areaChapaMm2 = CHAPA_PADRAO_LARGURA * CHAPA_PADRAO_ALTURA;
  const numeroChapas = areaTotalMm2 > 0 ? Math.ceil(areaTotalMm2 / areaChapaMm2) : 0;

  return (
    <Panel title="Resumo Financeiro do Projeto">
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "4px 0" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-main)", marginBottom: 2 }}>
          Quantidades
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", ...microTextStyle }}>
          <span>Peças totais</span>
          <span style={{ color: "var(--text-main)" }}>{totalPecas}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", ...microTextStyle }}>
          <span>Ferragens totais</span>
          <span style={{ color: "var(--text-main)" }}>{totalFerragens}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", ...microTextStyle }}>
          <span>Total de itens</span>
          <span style={{ color: "var(--text-main)" }}>{totalItens}</span>
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "4px 0 2px 0" }} />

        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-main)", marginBottom: 2 }}>
          Materiais
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", ...microTextStyle }}>
          <span>Área total</span>
          <span style={{ color: "var(--text-main)" }}>{areaTotalM2.toFixed(3)} m²</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", ...microTextStyle }}>
          <span>Peso total</span>
          <span style={{ color: "var(--text-main)" }}>{pesoTotalKg.toFixed(2)} kg</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", ...microTextStyle }}>
          <span>Nº de chapas</span>
          <span style={{ color: "var(--text-main)" }}>{numeroChapas}</span>
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "4px 0 2px 0" }} />

        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-main)", marginBottom: 2 }}>
          Custos
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", ...microTextStyle }}>
          <span>Materiais</span>
          <span style={{ color: "var(--text-main)" }}>
            {custoMateriais !== null ? `${custoMateriais.toFixed(2)} €` : "--"}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", ...microTextStyle }}>
          <span>Peças</span>
          <span style={{ color: "var(--text-main)" }}>
            {custoPecas !== null ? `${custoPecas.toFixed(2)} €` : "--"}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", ...microTextStyle }}>
          <span>Ferragens</span>
          <span style={{ color: "var(--text-main)" }}>
            {custoFerragens !== null ? `${custoFerragens.toFixed(2)} €` : "--"}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", ...microTextStyle }}>
          <span>Montagem</span>
          <span style={{ color: "var(--text-main)" }}>
            {custoMontagem !== null ? `${custoMontagem.toFixed(2)} €` : "--"}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
          <span style={{ color: "var(--text-main)" }}>Total geral</span>
          <span style={{ color: "var(--blue-light)" }}>
            {precoTotal !== null ? `${precoTotal.toFixed(2)} €` : "--"}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", ...microTextStyle }}>
          <span>Preço por peça</span>
          <span style={{ color: "var(--text-main)" }}>
            {precoPorPeca !== null ? `${precoPorPeca.toFixed(2)} €` : "--"}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", ...microTextStyle }}>
          <span>Preço por caixa</span>
          <span style={{ color: "var(--text-main)" }}>
            {precoPorCaixa !== null ? `${precoPorCaixa.toFixed(2)} €` : "--"}
          </span>
        </div>
      </div>
    </Panel>
  );
}
