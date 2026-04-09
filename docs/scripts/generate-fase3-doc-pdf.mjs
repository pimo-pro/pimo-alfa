/**
 * Gera docs/pimo-criativo-documentacao-fase3.pdf (documentação Fase 3).
 * Não usa os geradores de PDF do produto — apenas jsPDF (dependência existente).
 *
 * Uso (na raiz do repositório):
 *   node docs/scripts/generate-fase3-doc-pdf.mjs
 */

import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "pimo-criativo-documentacao-fase3.pdf");

const margin = 18;
const lineH = 6;
const pageW = 210;
const maxW = pageW - margin * 2;

function newDoc() {
  return new jsPDF({ unit: "mm", format: "a4" });
}

function addWrapped(doc, yRef, text, fontSize = 10) {
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(text, maxW);
  for (const line of lines) {
    if (yRef.y > 280) {
      doc.addPage();
      yRef.y = margin;
    }
    doc.text(line, margin, yRef.y);
    yRef.y += lineH;
  }
  yRef.y += 2;
}

function heading(doc, yRef, title, level = 1) {
  const size = level === 1 ? 16 : level === 2 ? 13 : 11;
  if (yRef.y > 265) {
    doc.addPage();
    yRef.y = margin;
  }
  doc.setFont("helvetica", "bold");
  addWrapped(doc, yRef, title, size);
  doc.setFont("helvetica", "normal");
}

function main() {
  const doc = newDoc();
  const yRef = { y: margin };

  heading(doc, yRef, "PIMO Criativo — Documentação técnica oficial (Fase 3)", 1);
  addWrapped(
    doc,
    yRef,
    "Documento gerado a partir dos comentários JSDoc marcados com @stable, @internal e @deprecated " +
      "no código-fonte, mais secções estáticas de arquitetura e anexos. " +
      "Não substitui docs/PIMO-CRIATIVO-MASTER-PLAN.md nem as regras em .cursor/rules.",
    10
  );

  heading(doc, yRef, "1. Introdução ao projeto", 1);
  addWrapped(
    doc,
    yRef,
    "Objetivo geral: aplicação web de desenho de móveis (configurador + viewer 3D), com estado central em React Context, " +
      "regras dinâmicas, exportação para fabrico (PDF, CNC, etc.) e evolução por fases descrita no Master Plan."
  );
  addWrapped(
    doc,
    yRef,
    "Filosofia PIMO: roles fixos (visitor, pro, ultra, ultra+, admin), permissões efetivas, fábrica como âmbito lógico, " +
      "compatibilidade incremental entre fases e terminologia alinhada à documentação oficial."
  );
  addWrapped(
    doc,
    yRef,
    "Convenções de comentários no código: @stable — superfície pública documentada e estável (evitar refactors sem decisão de produto); " +
      "@internal — implementado mas não exposto como API de UI; @deprecated — legado ou substituído, candidato a remoção ou migração."
  );

  heading(doc, yRef, "2. Arquitetura geral", 1);
  addWrapped(
    doc,
    yRef,
    "Módulos principais: src/context (ProjectProvider, actions compostas), src/project (estado), src/viewer e src/3d (viewer legado/engine), " +
      "src/core (domínio: caixas, cutlist, PDF de produto, CNC, regras, materiais), src/components (UI), src/pages, src/stores (Zustand para UI)."
  );
  addWrapped(
    doc,
    yRef,
    "Fluxo de dados: ProjectState é a fonte única; mutações via actions.*; hooks sincronizam com o viewer; persistência e I/O em hooks dedicados."
  );
  addWrapped(
    doc,
    yRef,
    "Interações entre contextos: ProjectContext + PimoViewerContext + MaterialContext + Toast; routing manual via history no App."
  );

  heading(doc, yRef, "3. API pública (@stable)", 1);
  addWrapped(doc, yRef, "Apenas métodos ProjectActions documentados com @stable na interface (src/context/projectTypes.ts).", 10);

  heading(doc, yRef, "3.1 exportarPDF: () => void", 2);
  addWrapped(
    doc,
    yRef,
    "@stable. Gera o PDF simples do projeto. Características: não inclui PDF técnico; não inclui cutlist; " +
      "não inclui detalhes de furação ou medidas técnicas; mantém o layout atual do PDF simples. " +
      "Uso: botão principal de exportação na UI; entrega rápida para cliente; visualização geral sem fabrico. " +
      "Importante: não alterar comportamento sem decisão explícita de produto; não unificar automaticamente com PDF técnico."
  );

  heading(doc, yRef, "3.2 exportarPdfTecnico: () => void", 2);
  addWrapped(
    doc,
    yRef,
    "@stable. Gera o PDF técnico do projeto. Características: medidas técnicas; detalhes de furação; informação de fabrico; " +
      "pode incluir vistas técnicas específicas. Uso: produção e fabricação; documentação técnica; medidas exatas. " +
      "Importante: não alterar sem decisão de produto; não misturar com PDF simples automaticamente."
  );

  heading(doc, yRef, "3.3 exportarPdfUnificado: () => void", 2);
  addWrapped(
    doc,
    yRef,
    "@stable. PDF unificado: PDF técnico + cutlist completa num único ficheiro. Características: documento completo para produção; " +
      "evita múltiplos ficheiros; mantém ordem e estrutura atuais. Uso: produção final; fábrica; clientes com técnico + lista de corte. " +
      "Importante: não alterar sem decisão de produto; não dividir novamente em múltiplos PDFs."
  );

  heading(doc, yRef, "4. API interna (@internal)", 1);
  addWrapped(
    doc,
    yRef,
    "Os métodos abaixo existem em ProjectActions e estão implementados em hooks, mas não devem ser tratados como API pública da UI."
  );
  const internal = [
    "gerarDesign () => void — useDesignActions; não chamado diretamente pela UI via actions.*.",
    "updateRules (rules) — useRulesActions; a UI admin usa updateRulesInProfile, não actions.updateRules.",
    "setProjectRulesProfile (id) — useRulesActions; perfil por projeto; UI ainda não ativada.",
    "recalculateAllBoxes () — useDesignActions; não chamado diretamente pela UI via actions.*.",
    "saveProjectSnapshot () — useProjectIoActions; mecanismo interno (não via actions.* na UI).",
    "saveManualBackupSnapshot () — useProjectIoActions; backup manual; não exposto na UI atual.",
  ];
  for (const row of internal) addWrapped(doc, yRef, "• " + row);

  heading(doc, yRef, "5. API e campos depreciados (@deprecated)", 1);
  const deprecated = [
    "projectTypes.ts / ProjectActions — setProjectMaterial: LEGADO sem implementação; alternativa: setMaterial (Material completo).",
    "projectTypes.ts — setQuantidade: LEGADO sem implementação; candidato a remoção.",
    "projectTypes.ts — addModelToBox, addCadModelAsNewBox, removeModelFromBox, updateModelInBox, updateCaixaModelId, selectModelInstance: CAD removido; sem implementação em runtime.",
    "projectTypes.ts — setExtractedPartsForBox, clearExtractedPartsForBox, setModelPositionInBox: CAD removido; sem implementação.",
    "projectTypes.ts — loadProjectFromTemplate: templates não implementados; sem implementação.",
    "rulesConfig.ts — distanciaDaBorda?, distanciaEntreFuros?: usar distanciaDaBordaCalco e distanciaEntreFurosCalco.",
    "ViewerCore.ts — API de sala legada: preferir createRoomWithDimensions no fluxo UI (Painel Sala).",
    "boxLayersService.ts — símbolo legado: usar generateDrawerGroup do domínio drawers.",
    "materials.ts — campo legado: usar materialPbrId.",
    "drillingService.ts — constantes legadas: usar SENSYS_8645I_DOOR e SENSYS_BASE_C00.",
  ];
  for (const row of deprecated) addWrapped(doc, yRef, "• " + row);
  addWrapped(
    doc,
    yRef,
    "Nota de manutenção: addTemplateAsNewBox permanece na interface sem @deprecated; na UI está desativado (@PIMO-SOON) até definição de templates."
  );

  heading(doc, yRef, "6. Anexos técnicos", 1);
  addWrapped(
    doc,
    yRef,
    "Estrutura resumida: src/App.tsx, src/context/, src/components/, src/core/, src/viewer/, src/3d/, src/pages/, src/stores/, scripts/, docs/."
  );
  addWrapped(
    doc,
    yRef,
    "Build: npm run build (tsc -b && vite build && copyDeployApiToDist). Dev: npm run dev. Testes: npm run test. Lint: npm run lint."
  );
  addWrapped(
    doc,
    yRef,
    "Regeneração: executar novamente este script após alterações aos JSDoc; atualizar o conteúdo embutido se a lista @stable/@internal/@deprecated mudar."
  );

  const buf = Buffer.from(doc.output("arraybuffer"));
  fs.writeFileSync(OUT, buf);
  console.log("[generate-fase3-doc-pdf] Escrito:", OUT, "(" + buf.length + " bytes)");
}

main();
