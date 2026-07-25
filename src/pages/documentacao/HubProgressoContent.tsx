/**
 * Secção Progresso do Projeto — dados via loadHubProgresso (local).
 */

import { useMemo } from "react";
import {
  loadHubProgresso,
  type ProgressoItemStatus,
} from "@/core/docs/progresso";
import { AJUDA_PAGE_TOKENS as C } from "../ajuda/ajudaPageTokens";

const STATUS_LABEL: Record<ProgressoItemStatus, string> = {
  completed: "Concluído",
  "in-progress": "Em andamento",
  planned: "Planejado",
};

const STATUS_COLOR: Record<ProgressoItemStatus, string> = {
  completed: "var(--status-done-color, var(--ci-success, #22c55e))",
  "in-progress": "var(--ci-prussian-600, var(--blue-light, #3b82f6))",
  planned: "var(--status-progress-color, var(--ci-sienna-400, #f59e0b))",
};

export default function HubProgressoContent() {
  const data = useMemo(() => loadHubProgresso(), []);
  const { counters, sections, roadmap, concluidas, emAndamento, proximas } = data;

  return (
    <div data-hub-progresso style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
      <p style={{ margin: 0, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
        Progresso do projeto — secções migradas + roadmap + resumo.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 110px), 1fr))",
          gap: 8,
          width: "100%",
        }}
      >
        <StatBox label="Concluído" value={String(counters.completed)} color={STATUS_COLOR.completed} />
        <StatBox label="Em andamento" value={String(counters.inProgress)} color={STATUS_COLOR["in-progress"]} />
        <StatBox label="Planejado" value={String(counters.planned)} color={STATUS_COLOR.planned} />
        <StatBox label="Progresso" value={`${counters.completionPercent}%`} color={C.accent} />
        <StatBox label="Roadmap" value={`${roadmap.progress}%`} color={C.accent} />
      </div>

      {roadmap.currentPhaseTitle ? (
        <p style={{ margin: 0, fontSize: 12, color: C.text }}>
          Phase atual: <strong>{roadmap.currentPhaseTitle}</strong>
          {"  "}
          {roadmap.doneTasks}/{roadmap.totalTasks} tarefas
        </p>
      ) : null}

      <ChecklistBlock title={`Tarefas concluídas`} items={concluidas.map((t) => t.titulo)} />
      <ChecklistBlock title="Em andamento" items={emAndamento.map((t) => t.titulo)} />
      <ChecklistBlock title={`Próximas etapas`} items={proximas.map((t) => t.titulo)} />

      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
        {sections.map((section) => (
          <article
            key={section.id}
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              background: C.bg,
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                marginBottom: 6,
                flexWrap: "wrap",
              }}
            >
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text }}>
                {section.title}
              </h3>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: STATUS_COLOR[section.status],
                }}
              >
                {STATUS_LABEL[section.status]}
              </span>
            </div>
            <p style={{ margin: "0 0 8px", fontSize: 12, color: C.muted }}>{section.description}</p>
            <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
              {section.items.map((item) => (
                <li key={item.label} style={{ fontSize: 12, color: C.text, lineHeight: 1.4 }}>
                  <span style={{ color: STATUS_COLOR[item.status], fontWeight: 600 }}>
                    [{STATUS_LABEL[item.status]}]
                  </span>{" "}
                  {item.label}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        padding: "10px 8px",
        borderRadius: 8,
        border: `1px solid ${C.border}`,
        background: C.bg,
        textAlign: "center",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function ChecklistBlock({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 8,
        border: `1px solid ${C.border}`,
        background: C.bg,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <h3 style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: C.text }}>{title}</h3>
      <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map((item) => (
          <li key={item} style={{ fontSize: 12, color: C.muted, lineHeight: 1.4 }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
