/**
 * Exportacao PDF do Relatorio Final via jsPDF + jspdf-autotable (ja no projeto).
 * Nao usa html2canvas; nao altera fluxos industriais.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { buildChartMetrics } from "./chartMetrics";
import type { ProjectReport } from "./types";

function safeName(name: string): string {
  return (name || "projeto")
    .replace(/[^\w\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 60);
}

function sectionTitle(doc: jsPDF, text: string, y: number): number {
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(text, 14, y);
  return y + 6;
}

function ensureSpace(doc: jsPDF, y: number, need = 30): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + need > pageH - 14) {
    doc.addPage();
    return 16;
  }
  return y;
}

export function exportProjectReportPdf(report: ProjectReport): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = 16;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Relatorio Final do Projeto", 14, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Projeto: ${report.gerais.nomeProjeto || report.projectId}`, 14, y);
  y += 5;
  doc.text(`Designer: ${report.gerais.designer || "-"}`, 14, y);
  y += 5;
  doc.text(`Empresa: ${report.gerais.empresa || "-"}`, 14, y);
  y += 5;
  doc.text(
    `Execucao: ${report.gerais.dataInicioExecucao || "-"} -> ${report.gerais.dataConclusaoExecucao || "-"}`,
    14,
    y
  );
  y += 8;

  y = sectionTitle(doc, "Metricas", y);
  const metrics = buildChartMetrics(report.metricas);
  autoTable(doc, {
    startY: y,
    head: [["Indicador", "Valor"]],
    body: metrics.map((m) => [m.label, String(m.value)]),
    styles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
  });
  y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 8;

  y = ensureSpace(doc, y);
  y = sectionTitle(doc, "Design", y);
  autoTable(doc, {
    startY: y,
    head: [["Campo", "Valor"]],
    body: [
      ["Inicio", report.design.dataInicio || "-"],
      ["Conclusao", report.design.dataConclusao || "-"],
      ["Revisoes antes", String(report.design.revisoesAntesProducao)],
      ["Revisoes apos", String(report.design.revisoesAposProducao)],
      ["Erros", report.design.errosDesign || "-"],
      ["Solucoes", report.design.solucoesAplicadas || "-"],
      ["Melhorias propostas", report.design.melhoriasPropostas || "-"],
      ["Melhorias implementadas", report.design.melhoriasImplementadas || "-"],
    ],
    styles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
  });
  y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 8;

  y = ensureSpace(doc, y);
  y = sectionTitle(doc, "Producao", y);
  autoTable(doc, {
    startY: y,
    head: [["Campo", "Valor"]],
    body: [
      ["Operadores", String(report.producao.operadores.length)],
      ["Caixas", String(report.producao.caixas.length)],
      ["Pecas", String(report.producao.pecas.length)],
      ["Inicio", report.producao.dataInicio || "-"],
      ["Fim", report.producao.dataFim || "-"],
      ["Horas efetivas", String(report.producao.horasEfetivas)],
      ["Re-producoes", String(report.producao.reProducoes)],
      ["Erros", report.producao.erros || "-"],
    ],
    styles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
  });
  y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 8;

  y = ensureSpace(doc, y);
  y = sectionTitle(doc, "Montagem", y);
  autoTable(doc, {
    startY: y,
    head: [["Campo", "Valor"]],
    body: [
      ["Envio", report.montagem.dataEnvio || "-"],
      ["Instaladores", String(report.montagem.instaladores.length)],
      ["Inicio", report.montagem.dataInicio || "-"],
      ["Fim", report.montagem.dataFim || "-"],
      ["Intervencoes pos", String(report.montagem.intervencoesPos)],
    ],
    styles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
  });
  y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 8;

  y = ensureSpace(doc, y, 40);
  y = sectionTitle(doc, "Materiais / ferragens", y);
  autoTable(doc, {
    startY: y,
    head: [["Tipo", "Qtd", "Obs", "Erro", "Substituicao"]],
    body:
      report.materiais.length > 0
        ? report.materiais.map((m) => [
            m.tipo,
            String(m.quantidade),
            m.observacoes || "",
            m.temErro ? "Sim" : "",
            m.substituicao || "",
          ])
        : [["-", "0", "Sem linhas", "", ""]],
    styles: { fontSize: 7 },
    margin: { left: 14, right: 14 },
  });
  y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 8;

  y = ensureSpace(doc, y, 40);
  y = sectionTitle(doc, "Financeiro", y);
  autoTable(doc, {
    startY: y,
    head: [["Linha", "Qtd", "Preco unit.", "Total"]],
    body: report.financeiro.linhas.map((l) => [
      l.label,
      l.quantidade == null ? "-" : String(l.quantidade),
      l.precoUnitario == null ? "-" : l.precoUnitario.toFixed(2),
      l.total.toFixed(2),
    ]),
    styles: { fontSize: 7 },
    margin: { left: 14, right: 14 },
  });
  y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 8;

  y = ensureSpace(doc, y);
  y = sectionTitle(doc, "Notas do projeto", y);
  autoTable(doc, {
    startY: y,
    head: [["Autor", "Data", "Texto"]],
    body:
      (report.notas ?? []).length > 0
        ? report.notas.map((n) => [
            n.autor,
            n.timestamp.slice(0, 19).replace("T", " "),
            n.texto,
          ])
        : [["-", "-", "Sem notas"]],
    styles: { fontSize: 7 },
    margin: { left: 14, right: 14 },
  });
  y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 8;

  y = ensureSpace(doc, y);
  y = sectionTitle(doc, "Avaliacao de qualidade", y);
  const q = report.qualidade ?? { rating: 3, observacoes: [] };
  autoTable(doc, {
    startY: y,
    head: [["Campo", "Valor"]],
    body: [
      ["Rating", `${q.rating} / 5`],
      ...((q.observacoes ?? []).length
        ? q.observacoes.map((o, i) => [`Obs ${i + 1}`, o])
        : [["Observacoes", "Nenhuma"]]),
    ],
    styles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
  });

  const file = `Relatorio_Final_${safeName(report.gerais.nomeProjeto || report.projectId)}.pdf`;
  doc.save(file);
}
