/**
 * Secoes de progresso migradas do antigo ProjectProgress.tsx (Fase 9).
 * Conteudo 1:1  sem reescrita. Gravado UTF-8 sem BOM.
 */

export type ProgressoItemStatus = "completed" | "in-progress" | "planned";

export type ProgressoSectionItem = {
  label: string;
  status: ProgressoItemStatus;
};

export type ProgressoSection = {
  id: string;
  title: string;
  description: string;
  status: ProgressoItemStatus;
  items: ProgressoSectionItem[];
};

export const PROGRESSO_SECTIONS: ProgressoSection[] = [
  {
    id: "core-foundation",
    title: "1. Fundação Principal do Projeto",
    description: "Infraestrutura básica do aplicativo",
    status: "completed",
    items: [
      { label: "React 19 + TypeScript", status: "completed" },
      { label: "Vite como ferramenta de compilação", status: "completed" },
      { label: "Sistema de estado híbrido (Context API + Zustand)", status: "completed" },
      { label: "Armazenamento de dados em localStorage", status: "completed" },
      { label: "Guards defensivos @PIMO-KEEP em páginas/API para respostas incompletas", status: "completed" },
      { label: "Roteamento interno para páginas técnicas (/project-progress, /painel-referencia, /admin)", status: "completed" },
    ],
  },
  {
    id: "viewer-3d",
    title: "2. Motor de Visualização 3D (3D Viewer)",
    description: "Sistema de visualização e interação com modelos tridimensionais",
    status: "in-progress",
    items: [
      { label: "Three.js como motor de renderização", status: "completed" },
      { label: "Exibição de modelos GLB", status: "completed" },
      { label: "Iluminação e sombras básicas", status: "completed" },
      { label: "Ferramentas de controle (Move, Rotate, Select)", status: "completed" },
      { label: "Sistema de materiais PBR (Physically Based Rendering)", status: "in-progress" },
      { label: "HDRI, exposição e consistência visual entre módulos", status: "in-progress" },
      { label: "Modo Apresentação Realista (DOF/Bloom/Turntable)", status: "in-progress" },
      { label: "Modo Performance otimizado para edição rápida", status: "in-progress" },
    ],
  },
  {
    id: "glb-cad-pipeline",
    title: "3. Pipeline GLB/CAD e Multi-Model",
    description: "Integração de modelos CAD, extração de peças e composição híbrida com paramétrico",
    status: "in-progress",
    items: [
      { label: "Extração automática de peças a partir de GLB (bounding box/rotação/material)", status: "completed" },
      { label: "Adaptador GLB -> CutListItem com merge no cálculo de preços", status: "completed" },
      { label: "Callback de carregamento de modelo no Viewer para sincronização de estado", status: "completed" },
      { label: "Suporte a múltiplos modelos por caixa (models[])", status: "completed" },
      { label: "Categorias CAD e gestão por instância (renomear/remover/material/categoria)", status: "completed" },
      { label: "Unificação total do configurador 3D com o pipeline multi-model", status: "in-progress" },
    ],
  },
  {
    id: "multibox",
    title: "4. Arquitetura Multi-Box",
    description: "Gestão de múltiplas caixas no viewer e sincronização com módulos de negócio",
    status: "in-progress",
    items: [
      { label: "Módulo core/multibox com APIs tipadas", status: "completed" },
      { label: "Integração do MultiBoxManager no Workspace", status: "completed" },
      { label: "Operações de caixas (add/remove/update/setIndex/setGap/select)", status: "completed" },
      { label: "Documentação técnica de arquitetura multibox", status: "completed" },
      { label: "UI avançada de manipulação multi-box (reorder/propriedades em lote)", status: "in-progress" },
      { label: "Integração completa MultiBox <-> Calculator em todos os fluxos", status: "in-progress" },
      { label: "TODO: Expor manager via MultiBoxManagerContext para a UI", status: "planned" },
      { label: "TODO: Gap configurável no MultiBoxManager (hoje fixo em 0)", status: "planned" },
    ],
  },
  {
    id: "layout-rules",
    title: "5. Layout Inteligente e Regras Dinâmicas",
    description: "Auto-arrange, validações, perfis de regras e avisos em tempo real",
    status: "in-progress",
    items: [
      { label: "Auto-positioning no Viewer e API de layout", status: "completed" },
      { label: "Detecção de colisões e limites (layoutWarnings)", status: "completed" },
      { label: "Painel com alertas de violações de regras e layout", status: "completed" },
      { label: "Sistema de regras dinâmicas por perfil (rulesProfiles)", status: "completed" },
      { label: "Snapping e reset de layout na UI de modelos", status: "completed" },
      { label: "Heurísticas avançadas de otimização de layout", status: "in-progress" },
    ],
  },
  {
    id: "ui-components",
    title: "6. Interface do Usuário (UI Components)",
    description: "Interfaces, painéis, documentação navegável e componentes visuais",
    status: "in-progress",
    items: [
      { label: "Painel esquerdo com abas especializadas", status: "completed" },
      { label: "Barra de ferramentas superior + toolbar 3D", status: "completed" },
      { label: "Right tools e ações industriais", status: "completed" },
      { label: "Página Painel de Referência com navegação por secções", status: "completed" },
      { label: "Página de Documentação funcional integrada ao app", status: "completed" },
      { label: "Responsividade e consistência visual total em todos os painéis", status: "in-progress" },
    ],
  },
  {
    id: "materials",
    title: "7. Sistema de Materiais e Fabricação",
    description: "Materiais CRUD, presets PBR e integração com manufatura",
    status: "in-progress",
    items: [
      { label: "CRUD de materiais com resolução por materialId", status: "completed" },
      { label: "Integração de materiais reais em PDF/Cutlist/CNC", status: "completed" },
      { label: "Fallback seguro para projetos legados", status: "completed" },
      { label: "Presets de materiais (madeira/metal/vidro)", status: "in-progress" },
      { label: "Fix @PIMO-SOON: cavilha sideOffset dinâmico (espessura/2) no drillingAdapter", status: "planned" },
      { label: "Editor de materiais PBR em tempo real", status: "planned" },
    ],
  },
  {
    id: "calculations",
    title: "8. Cálculos de Corte e Custos",
    description: "Cutlist, preço, ferragens, acessórios e dados para produção",
    status: "in-progress",
    items: [
      { label: "Algoritmo de cálculo de peças paramétricas", status: "completed" },
      { label: "Merge de peças paramétricas + peças GLB na cutlist", status: "completed" },
      { label: "Cálculo automático de preços por material e componentes", status: "completed" },
      { label: "Cálculo de ferragens e acessórios", status: "completed" },
      { label: "Análise de desperdício e otimização de aproveitamento", status: "in-progress" },
    ],
  },
  {
    id: "export-import",
    title: "9. Exportação e Importação",
    description: "Saídas técnicas para documentação, produção e partilha",
    status: "in-progress",
    items: [
      { label: "Salvamento de projetos em localStorage", status: "completed" },
      { label: "Carregamento de projetos salvos", status: "completed" },
      { label: "Exportação PDF técnico + cutlist + PDF unificado", status: "completed" },
      { label: "Layout de corte PRO em PDF", status: "completed" },
      { label: "Exportação CNC (TCN/KDT)", status: "completed" },
      { label: "Exportação Drill XML", status: "completed" },
      { label: "Pacote completo (ZIP) com múltiplos artefatos", status: "completed" },
      {
        label:
          "Fase 1 — Análise arquivo completo: páginas online read-only (/PROJETOS/:project/analise), 9 docs industriais, flag industrialOnlineAnalysis off; ZIP/CNC/etiquetas intactos",
        status: "completed",
      },
      {
        label:
          "Fase 2 — Edição online + industrialDocumentOverrides + highlight; ZIP PDFs usam rows efetivas; etiquetas/CNC intocados",
        status: "completed",
      },
      {
        label:
          "Fase 3 — Histórico documental append-only (industrialDocumentHistory) + jump-to-cell; UI doc/global; pipeline CNC/etiquetas intacto",
        status: "completed",
      },
      {
        label:
          "Fase 4 — Re-geração seletiva / multi-download PDFs industriais (effective/canonical); ZIP documental; ZIP clássico intacto",
        status: "completed",
      },
      {
        label:
          "Fase 5 — Overrides.cutlist → etiquetas UEE (whitelist documental); CNC/TCN/drill/nesting intocados",
        status: "completed",
      },
      {
        label:
          "Fase 6 — Robustez: validações/sanitize, testes P0+P1, polish UI/encoding, aviso export com flag off",
        status: "completed",
      },
      { label: "Exportação de imagens/snapshot do viewer", status: "in-progress" },
      { label: "Fix @PIMO-SOON: rotação de furos no Layout de Corte PRO quando peça roda 90°", status: "in-progress" },
      { label: "Exportação estruturada JSON para integrações externas", status: "planned" },
    ],
  },
  {
    id: "catalog",
    title: "10. Sistema de Catálogo e Modelos",
    description: "Biblioteca de módulos, templates e organização CAD",
    status: "in-progress",
    items: [
      { label: "Catálogo base e tipos de dados para produtos", status: "completed" },
      { label: "Templates/modelos prontos de móveis", status: "completed" },
      { label: "Catálogo CAD expandido (lotes de modelos gerados)", status: "completed" },
      { label: "Gestão de modelos personalizados por caixa", status: "completed" },
      { label: "Biblioteca avançada de acessórios e distribuição", status: "planned" },
    ],
  },
  {
    id: "admin-deploy",
    title: "11. Sistema de Administração e Publicação",
    description: "Ferramentas de administração e atualizações automáticas",
    status: "in-progress",
    items: [
      { label: "Painel de controle administrativo (Admin Panel)", status: "completed" },
      { label: "Admin de materiais, regras, perfis, templates e CAD", status: "completed" },
      { label: "Sistema de versionamento (Versioning)", status: "completed" },
      { label: "Histórico de publicação (Deploy Log)", status: "completed" },
      { label: "Backups e rotinas de recuperação", status: "in-progress" },
      { label: "Publicação automática (CI/CD)", status: "in-progress" },
      { label: "Monitoramento de erros e atualizações", status: "in-progress" },
    ],
  },
  {
    id: "quality",
    title: "12. Qualidade e Testes",
    description: "Cobertura de regras críticas e validação de regressões",
    status: "in-progress",
    items: [
      { label: "Suíte Vitest configurada e operacional", status: "completed" },
      { label: "Testes de regras (rules.test.ts)", status: "completed" },
      { label: "Testes de estado do projeto (projectState.test.ts)", status: "completed" },
      { label: "Testes de exportação (export.test.ts)", status: "completed" },
      { label: "Ampliação de cobertura para fluxos end-to-end", status: "in-progress" },
    ],
  },
  {
    id: "documentation",
    title: "13. Documentação e Referências",
    description: "Referências abrangentes sobre o sistema e engenharia",
    status: "completed",
    items: [
      { label: "Painel de referências (Painel de Referência)", status: "completed" },
      { label: "Página Ajuda com catálogo completo de ícones do sistema", status: "completed" },
      { label: "Explicação da arquitetura do programa", status: "completed" },
      { label: "Roadmap técnico com fases, tarefas e dependências", status: "completed" },
      { label: "Documentação da API do Viewer", status: "in-progress" },
      { label: "Exemplos práticos e casos de uso", status: "planned" },
    ],
  },
  {
    id: "known-bugs",
    title: "14. Bugs Conhecidos e Pendências",
    description: "Itens mapeados no código como pendentes e em correção",
    status: "in-progress",
    items: [
      { label: "Hinge holes: DrillGeometryBuilder recebe face=\"B\" mas fluxo lateral espera \"direita\"/\"esquerda\"", status: "in-progress" },
      { label: "Rotação de furos no Layout de Corte PRO quando peça é rotacionada 90°", status: "in-progress" },
      { label: "Cavilha com sideOffset hardcoded em 9.5mm (deve ser espessura/2)", status: "planned" },
    ],
  },
  {
    id: "p39-financeiro-industrial",
    title: "15. P3.9 — Sistema Financeiro Industrial",
    description: "Orçamentos, unificação ferragens, ops CNC/Drill, desperdício/serragem, chapas/MO/logística e ops avançadas",
    status: "completed",
    items: [
      { label: "F1 concluída: Orçamentos base (schema + Admin)", status: "completed" },
      { label: "F2 concluída: Unificação ferragens A→B", status: "completed" },
      { label: "F3a concluída: Operações CNC/Drill (SSOT)", status: "completed" },
      { label: "F3b concluída: Desperdício/Serragem (€)", status: "completed" },
      { label: "F3c concluída: Chapas reais / MO / logística (modos exclusivos)", status: "completed" },
      { label: "F4 concluída: Operações industriais avançadas (tarifas tipadas)", status: "completed" },
      { label: "Fase 5 concluída: activação Chapas Reais (derivado + nesting + Admin only)", status: "completed" },
      { label: "Estado P3.9 F1–F4 + Fase 5: default por_peca; activação controlada via Admin", status: "completed" },
    ],
  },
];
