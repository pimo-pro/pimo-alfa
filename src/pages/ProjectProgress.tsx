/**
 * Página de Progresso do Projeto - Project Progress & Documentation
 * Exibe explicação completa sobre construção do projeto, recursos completados, em andamento e planejados
 */

import { useMemo, type ReactNode } from "react";
import { useProject } from "../context/useProject";
import { projectProgressStyles } from "./ProjectProgressStyles";
import { Icon } from "@/components/icons";

const PROJECT_SECTIONS = [
  {
    id: "core-foundation",
    title: "1. Fundação Principal do Projeto",
    description: "Infraestrutura básica do aplicativo",
    status: "completed" as const,
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
    status: "in-progress" as const,
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
    status: "in-progress" as const,
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
    status: "in-progress" as const,
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
    status: "in-progress" as const,
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
    status: "in-progress" as const,
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
    status: "in-progress" as const,
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
    status: "in-progress" as const,
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
    status: "in-progress" as const,
    items: [
      { label: "Salvamento de projetos em localStorage", status: "completed" },
      { label: "Carregamento de projetos salvos", status: "completed" },
      { label: "Exportação PDF técnico + cutlist + PDF unificado", status: "completed" },
      { label: "Layout de corte PRO em PDF", status: "completed" },
      { label: "Exportação CNC (TCN/KDT)", status: "completed" },
      { label: "Exportação Drill XML", status: "completed" },
      { label: "Pacote completo (ZIP) com múltiplos artefatos", status: "completed" },
      { label: "Exportação de imagens/snapshot do viewer", status: "in-progress" },
      { label: "Fix @PIMO-SOON: rotação de furos no Layout de Corte PRO quando peça roda 90°", status: "in-progress" },
      { label: "Exportação estruturada JSON para integrações externas", status: "planned" },
    ],
  },
  {
    id: "catalog",
    title: "10. Sistema de Catálogo e Modelos",
    description: "Biblioteca de módulos, templates e organização CAD",
    status: "in-progress" as const,
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
    status: "in-progress" as const,
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
    status: "in-progress" as const,
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
    status: "completed" as const,
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
    status: "in-progress" as const,
    items: [
      { label: "Hinge holes: DrillGeometryBuilder recebe face=\"B\" mas fluxo lateral espera \"direita\"/\"esquerda\"", status: "in-progress" },
      { label: "Rotação de furos no Layout de Corte PRO quando peça é rotacionada 90°", status: "in-progress" },
      { label: "Cavilha com sideOffset hardcoded em 9.5mm (deve ser espessura/2)", status: "planned" },
    ],
  },
];

const STATUS_CONFIG: Record<string, {
  label: ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  completed: {
    label: (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <Icon name="check" size={14} aria-hidden />
        <span>Concluído</span>
      </span>
    ),
    color: "var(--status-done-color, #22c55e)",
    bgColor: "var(--status-done-bg, rgba(34, 197, 94, 0.1))",
    borderColor: "var(--status-done-border, rgba(34, 197, 94, 0.3))",
  },
  "in-progress": {
    label: (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <Icon name="adminSettings" size={14} aria-hidden />
        <span>Em Andamento</span>
      </span>
    ),
    color: "var(--blue-light, #3b82f6)",
    bgColor: "var(--bg-selected, rgba(59, 130, 246, 0.1))",
    borderColor: "var(--border-selected, rgba(59, 130, 246, 0.3))",
  },
  planned: {
    label: (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <Icon name="chevronRight" size={14} aria-hidden />
        <span>Planejado</span>
      </span>
    ),
    color: "var(--status-progress-color, #f59e0b)",
    bgColor: "var(--status-progress-bg, rgba(245, 158, 11, 0.1))",
    borderColor: "var(--status-progress-border, rgba(245, 158, 11, 0.3))",
  },
};

export default function ProjectProgress() {
  const { project } = useProject();

  const stats = useMemo(() => {
    let completed = 0;
    let inProgress = 0;
    let planned = 0;

    PROJECT_SECTIONS.forEach((section) => {
      section.items.forEach((item) => {
        if (item.status === "completed") completed++;
        else if (item.status === "in-progress") inProgress++;
        else if (item.status === "planned") planned++;
      });
    });

    const total = completed + inProgress + planned;
    const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, inProgress, planned, total, completionPercent };
  }, []);

  const formattedChangelog = useMemo(
    () => {
      const asTime = (value: unknown): number => {
        const parsed = new Date(value as string | number | Date).getTime();
        return Number.isFinite(parsed) ? parsed : 0;
      };
      return project.changelog
        .slice(0, 15)
        .map((entry) => ({
          ...entry,
          timestamp: entry.timestamp ?? Date.now(),
        }))
        .sort((a, b) => {
          const ta = asTime(a.timestamp);
          const tb = asTime(b.timestamp);
          return tb - ta;
        })
        .map((entry) => ({
          ...entry,
          time: new Date(entry.timestamp).toLocaleString("pt-PT"),
        }));
    },
    [project.changelog]
  );

  return (
    <main style={projectProgressStyles.main}>
      {/* Header Section */}
      <section style={projectProgressStyles.header}>
        <div style={projectProgressStyles.headerContent}>
          <h1 style={projectProgressStyles.title}>Progresso do Projeto</h1>
          <p style={projectProgressStyles.subtitle}>
            Acompanhamento abrangente da construção e desenvolvimento do PIMO Studio
          </p>
        </div>

        {/* Progress Stats */}
        <div style={projectProgressStyles.statsContainer}>
          <div style={projectProgressStyles.statBox}>
            <div style={{ ...projectProgressStyles.statNumber, color: "var(--status-done-color, #22c55e)" }}>
              {stats.completed}
            </div>
            <div style={projectProgressStyles.statLabel}>Concluído</div>
          </div>
          <div style={projectProgressStyles.statBox}>
            <div style={{ ...projectProgressStyles.statNumber, color: "var(--blue-light, #3b82f6)" }}>
              {stats.inProgress}
            </div>
            <div style={projectProgressStyles.statLabel}>Em Andamento</div>
          </div>
          <div style={projectProgressStyles.statBox}>
            <div style={{ ...projectProgressStyles.statNumber, color: "var(--status-progress-color, #f59e0b)" }}>
              {stats.planned}
            </div>
            <div style={projectProgressStyles.statLabel}>Planejado</div>
          </div>
          <div style={projectProgressStyles.statBox}>
            <div style={{ ...projectProgressStyles.statNumber, color: "var(--blue-light, #3b82f6)" }}>
              {stats.completionPercent}%
            </div>
            <div style={projectProgressStyles.statLabel}>Conclusão</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={projectProgressStyles.progressBar}>
          <div
            style={{
              ...projectProgressStyles.progressFill,
              width: `${stats.completionPercent}%`,
            }}
          />
        </div>
      </section>

      {/* Sections */}
      <section style={projectProgressStyles.sectionsContainer}>
        {PROJECT_SECTIONS.map((section) => (
          <div key={section.id} style={projectProgressStyles.sectionCard}>
            <div style={projectProgressStyles.sectionHeader}>
              <h2 style={projectProgressStyles.sectionTitle}>{section.title}</h2>
              <p style={projectProgressStyles.sectionDesc}>{section.description}</p>
            </div>

            <div style={projectProgressStyles.itemsList}>
              {section.items.map((item, idx) => {
                const config = STATUS_CONFIG[item.status];
                return (
                  <div
                    key={idx}
                    style={{
                      ...projectProgressStyles.item,
                      borderLeftColor: config.color,
                      backgroundColor: config.bgColor,
                    }}
                  >
                    <div style={projectProgressStyles.itemContent}>
                      <div style={projectProgressStyles.itemLabel}>{item.label}</div>
                      <div
                        style={{
                          ...projectProgressStyles.itemStatus,
                          color: config.color,
                        }}
                      >
                        {config.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* Changelog Section */}
      <section style={projectProgressStyles.changelogSection}>
        <h2 style={projectProgressStyles.changelogTitle}>Últimas Atualizações Automáticas</h2>
        <div style={projectProgressStyles.changelogList}>
          {formattedChangelog.length > 0 ? (
            formattedChangelog.map((entry, idx) => (
              <div key={idx} style={projectProgressStyles.changelogItem}>
                <div style={projectProgressStyles.changelogTime}>{entry.time}</div>
                <div style={projectProgressStyles.changelogMessage}>{entry.message}</div>
              </div>
            ))
          ) : (
            <div style={projectProgressStyles.noChangelog}>Nenhuma atualização ainda</div>
          )}
        </div>
      </section>

      {/* Footer Info */}
      <section style={projectProgressStyles.footerInfo}>
        <div style={projectProgressStyles.infoBox}>
          <h3 style={projectProgressStyles.infoTitle}>
            <span aria-hidden style={{ display: "inline-flex", marginRight: 6, verticalAlign: "middle" }}>
              <Icon name="send" size={16} aria-hidden />
            </span>
            Sobre o Projeto
          </h3>
          <p style={projectProgressStyles.infoText}>
            PIMO Studio é um sistema integrado para design e planejamento de móveis tridimensionais com cálculos detalhados de custos e materiais.
            Foi construído usando as tecnologias mais modernas como React 19, Three.js e TypeScript, com foco em desempenho e facilidade de uso.
          </p>
        </div>
        <div style={projectProgressStyles.infoBox}>
          <h3 style={projectProgressStyles.infoTitle}>
            <span aria-hidden style={{ display: "inline-flex", marginRight: 6, verticalAlign: "middle" }}>
              <Icon name="adminChart" size={16} aria-hidden />
            </span>
            Estatísticas
          </h3>
          <p style={projectProgressStyles.infoText}>
            Total de recursos: {stats.total} | Funcional: {stats.completed} | Em desenvolvimento: {stats.inProgress} |
            Planejado: {stats.planned}
          </p>
        </div>
      </section>
    </main>
  );
}
