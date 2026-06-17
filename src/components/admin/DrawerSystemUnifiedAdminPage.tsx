import { useMemo, type CSSProperties } from "react";
import Panel from "../ui/Panel";
import { useSettings } from "../../context/SettingsContext";
import {
  DRAWER_LEGACY_PIPELINE,
  DRAWER_OFFICIAL_PIPELINE,
  DRAWER_SYSTEM_DOMAINS,
  DRAWER_SYSTEM_INCONSISTENCIES,
  DRAWER_PHASE_PROPOSALS,
  buildDrawerSystemReferenceReport,
  countDrawerReferenceStats,
  type DrawerInconsistency,
  type DrawerRuleEntry,
  type DrawerRuleSourceStatus,
} from "../../core/drawers/DrawerSystemReference";
import { AdminPageHeader, adminPageShellStyle } from "./AdminUi";

const STATUS_LABEL: Record<DrawerRuleSourceStatus, string> = {
  official: "Oficial",
  duplicate: "Duplicado",
  legacy: "Legado",
  migrate: "A migrar",
  remove_future: "Remover (futuro)",
};

const STATUS_COLOR: Record<DrawerRuleSourceStatus, string> = {
  official: "#34d399",
  duplicate: "#fbbf24",
  legacy: "#f87171",
  migrate: "#60a5fa",
  remove_future: "#a78bfa",
};

const SEVERITY_COLOR: Record<DrawerInconsistency["severity"], string> = {
  high: "#f87171",
  medium: "#fbbf24",
  low: "#94a3b8",
};

function StatusBadge({ status }: { status: DrawerRuleSourceStatus }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: 999,
        background: `${STATUS_COLOR[status]}22`,
        color: STATUS_COLOR[status],
        border: `1px solid ${STATUS_COLOR[status]}55`,
        whiteSpace: "nowrap",
      }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function RuleRow({ rule }: { rule: DrawerRuleEntry }) {
  return (
    <tr>
      <td style={cellStyle}>
        <StatusBadge status={rule.status} />
      </td>
      <td style={cellStyle}>
        <strong style={{ fontSize: 12 }}>{rule.label}</strong>
        {rule.formula ? (
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2, fontFamily: "monospace" }}>
            {rule.formula}
          </div>
        ) : null}
        {rule.notes ? (
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{rule.notes}</div>
        ) : null}
      </td>
      <td style={{ ...cellStyle, fontFamily: "monospace", fontSize: 11 }}>{rule.value}</td>
      <td style={cellStyle}>
        <code style={{ fontSize: 10, color: "#93c5fd" }}>
          {rule.sourceFile}
          {rule.sourceLines ? `:${rule.sourceLines}` : ""}
        </code>
      </td>
    </tr>
  );
}

const cellStyle: CSSProperties = {
  padding: "8px 10px",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  verticalAlign: "top",
};

function PipelineList({ title, items, accent }: { title: string; items: string[]; accent: string }) {
  return (
    <div style={{ flex: "1 1 280px", minWidth: 260 }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: accent }}>{title}</div>
      <ol style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6 }}>
        {items.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </div>
  );
}

export default function DrawerSystemUnifiedAdminPage() {
  const { settings } = useSettings();
  const report = useMemo(() => buildDrawerSystemReferenceReport(), []);
  const stats = useMemo(() => countDrawerReferenceStats(), []);

  const liveSettings = settings.gavetas;

  return (
    <div style={{ ...adminPageShellStyle, maxWidth: 1200 }}>
      <AdminPageHeader
        title="Configurações das Gavetas (Sistema Unificado)"
        subtitle={`FASE 1 — Centro oficial de referência. Documentação e mapeamento sem alterar comportamento industrial. Relatório gerado: ${new Date(report.generatedAt).toLocaleString("pt-PT")}`}
      />

      <Panel
        title="Resumo do sistema"
        description="Estatísticas do mapeamento em DrawerSystemReference.ts"
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {[
            { label: "Domínios", value: stats.domains },
            { label: "Regras mapeadas", value: stats.rules },
            { label: "Oficiais", value: stats.official, color: STATUS_COLOR.official },
            { label: "Legado", value: stats.legacy, color: STATUS_COLOR.legacy },
            { label: "Duplicadas", value: stats.duplicate, color: STATUS_COLOR.duplicate },
            { label: "A migrar", value: stats.migrate, color: STATUS_COLOR.migrate },
            { label: "Inconsistências", value: stats.inconsistencies },
            { label: "Alta severidade", value: stats.highSeverity, color: SEVERITY_COLOR.high },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.1)",
                minWidth: 100,
              }}
            >
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{item.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: item.color ?? "var(--text-main)" }}>{item.value}</div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Pipelines" description="Oficial (alvo) vs legado (a deprecar gradualmente)">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
          <PipelineList title="Pipeline oficial" items={DRAWER_OFFICIAL_PIPELINE} accent={STATUS_COLOR.official} />
          <PipelineList title="Pipeline legado" items={DRAWER_LEGACY_PIPELINE} accent={STATUS_COLOR.legacy} />
        </div>
      </Panel>

      <Panel
        title="settings.gavetas — valores atuais vs defaults"
        description="Fonte oficial de parâmetros industriais. Editável em «Regras das Gavetas»."
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--text-muted)" }}>
                <th style={cellStyle}>Chave</th>
                <th style={cellStyle}>Valor atual (projeto)</th>
                <th style={cellStyle}>Default sistema</th>
              </tr>
            </thead>
            <tbody>
              {report.settingsKeys.map(({ key, defaultValue }) => {
                const current = liveSettings[key];
                const currentStr = Array.isArray(current) ? current.join(", ") : String(current);
                const diverges = currentStr !== defaultValue;
                return (
                  <tr key={key}>
                    <td style={cellStyle}>
                      <code style={{ fontSize: 10 }}>{key}</code>
                    </td>
                    <td style={{ ...cellStyle, color: diverges ? "#fbbf24" : undefined }}>{currentStr}</td>
                    <td style={{ ...cellStyle, color: "var(--text-muted)" }}>{defaultValue}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {DRAWER_SYSTEM_DOMAINS.map((domain) => (
        <Panel
          key={domain.id}
          title={domain.title}
          description={`${domain.description} — Ficheiros: ${domain.primaryFiles.join(", ")}`}
        >
          <div style={{ marginBottom: 10 }}>
            <StatusBadge status={domain.status} />
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", fontSize: 10, color: "var(--text-muted)" }}>
                  <th style={cellStyle}>Estado</th>
                  <th style={cellStyle}>Regra</th>
                  <th style={cellStyle}>Valor / fórmula</th>
                  <th style={cellStyle}>Ficheiro</th>
                </tr>
              </thead>
              <tbody>
                {domain.rules.map((rule) => (
                  <RuleRow key={rule.id} rule={rule} />
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ))}

      <Panel title="Inconsistências e avisos" description="Contradições entre sistema moderno e legado — resolver nas fases indicadas">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {DRAWER_SYSTEM_INCONSISTENCIES.map((item) => (
            <div
              key={item.id}
              style={{
                padding: 12,
                borderRadius: 10,
                border: `1px solid ${SEVERITY_COLOR[item.severity]}44`,
                background: `${SEVERITY_COLOR[item.severity]}11`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: SEVERITY_COLOR[item.severity],
                  }}
                >
                  {item.severity}
                </span>
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>FASE {item.resolveInPhase}</span>
                <strong style={{ fontSize: 13 }}>{item.title}</strong>
              </div>
              <p style={{ margin: "0 0 6px", fontSize: 12, color: "var(--text-muted)" }}>{item.description}</p>
              {item.modernSource ? (
                <div style={{ fontSize: 10 }}>
                  <span style={{ color: STATUS_COLOR.official }}>Moderno: </span>
                  <code>{item.modernSource}</code>
                </div>
              ) : null}
              {item.legacySource ? (
                <div style={{ fontSize: 10, marginTop: 2 }}>
                  <span style={{ color: STATUS_COLOR.legacy }}>Legado: </span>
                  <code>{item.legacySource}</code>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Roadmap — Fases 2–6 (referência)" description="Não executado nesta fase; apenas planeamento">
        {DRAWER_PHASE_PROPOSALS.map((phase) => (
          <div key={phase.phase} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
              FASE {phase.phase} — {phase.title}
            </div>
            <ul style={{ margin: "0 0 6px", paddingLeft: 18, fontSize: 11, color: "var(--text-muted)" }}>
              {phase.actions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
            <div style={{ fontSize: 10, color: "#93c5fd" }}>
              Ficheiros: {phase.files.join(" · ")}
            </div>
          </div>
        ))}
      </Panel>

      <Panel title="Ficheiro centralizador" description="Toda a lógica de referência vive aqui (somente leitura de dados)">
        <code style={{ fontSize: 12, color: "#93c5fd" }}>src/core/drawers/DrawerSystemReference.ts</code>
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, marginBottom: 0 }}>
          Documentação complementar: <code>docs/drawers-system.md</code> (parcialmente desatualizada — este painel é a fonte
          viva para o Master Plan).
        </p>
      </Panel>
    </div>
  );
}
