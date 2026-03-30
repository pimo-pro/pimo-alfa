/**
 * Exibe avisos de violação de regras dinâmicas para a caixa selecionada.
 */

import { memo, useMemo } from "react";
import type { RuleViolation } from "../../core/rules/types";
import { Icon } from "@/components/icons";

type Props = {
  violations: RuleViolation[];
  boxId: string | null;
  onEditRules?: () => void;
};

const severityStyle: Record<string, { bg: string; border: string; iconName: "alertError" | "alertWarning" | "alertInfo" }> = {
  error: { bg: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.4)", iconName: "alertError" },
  warning: { bg: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.4)", iconName: "alertWarning" },
  info: { bg: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.4)", iconName: "alertInfo" },
};

function RuleViolationsAlertComponent({ violations, boxId, onEditRules }: Props) {
  const forBox = useMemo(
    () => (boxId ? violations.filter((v) => v.boxId === boxId) : []),
    [boxId, violations]
  );
  if (forBox.length === 0) return null;

  return (
    <div
      className="panel"
      style={{
        marginTop: 8,
        padding: 10,
        background: "var(--surface)",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-main)" }}>
          Regras do modelo
        </span>
        {onEditRules && (
          <button
            type="button"
            onClick={onEditRules}
            className="panel-button"
            style={{ padding: "2px 8px", fontSize: 11 }}
          >
            Editar regras
          </button>
        )}
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        {forBox.map((v) => {
          const style = severityStyle[v.severity] ?? severityStyle.info;
          return (
            <li
              key={v.id}
              style={{
                padding: "6px 8px",
                background: style.bg,
                border: style.border,
                borderRadius: 6,
                fontSize: 12,
                color: "var(--text-main)",
              }}
            >
              <span style={{ marginRight: 6 }} aria-hidden>
                <Icon name={style.iconName} size={16} aria-hidden />
              </span>
              {v.message}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default memo(RuleViolationsAlertComponent);
