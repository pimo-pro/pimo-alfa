/**
 * Bloco de Estatisticas do Projeto — topo do Hub (hibrido A+C).
 * Visivel apenas na seccao "Documentacao atual".
 * Dados via loadHubStats (local) + contagem dinamica de projetos.
 */

import { useMemo } from "react";
import { AJUDA_PAGE_TOKENS as C } from "../ajuda/ajudaPageTokens";
import {
  loadHubStats,
  type HubStatCard,
  type HubStatIcon,
  type HubStatTone,
} from "./loadHubStats";
import {
  applyHubProjectCount,
  useHubProjectCount,
} from "./useHubProjectCount";

const TONE: Record<
  HubStatTone,
  { icon: string; chipBd: string; chipBg: string }
> = {
  neutral: {
    icon: C.muted,
    chipBd: C.border,
    chipBg: "transparent",
  },
  blue: {
    icon: C.accent,
    chipBd: C.accentBd,
    chipBg: C.accentBg,
  },
  green: {
    icon: "var(--status-done-color, var(--ci-success, #22c55e))",
    chipBd: "color-mix(in srgb, var(--status-done-color, var(--ci-success, #22c55e)) 35%, transparent)",
    chipBg: "color-mix(in srgb, var(--status-done-color, var(--ci-success, #22c55e)) 12%, transparent)",
  },
};

const UP_GREEN = "var(--status-done-color, var(--ci-success, #22c55e))";

export default function HubStatsContent() {
  const snapshot = useMemo(() => loadHubStats(), []);
  const totalProjects = useHubProjectCount();
  const cards = useMemo(
    () => applyHubProjectCount(snapshot.cards, totalProjects),
    [snapshot.cards, totalProjects]
  );

  return (
    <section
      data-hub-stats
      aria-label={"Estat\u00edsticas do Projeto"}
      style={{
        width: "100%",
        marginBottom: 24,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: C.muted,
          }}
        >
          {"Estat\u00edsticas do Projeto"}
        </h2>
        <span style={{ fontSize: 11, color: C.muted }}>{snapshot.sourceLabel}</span>
      </div>

      <div
        className="hub-stats-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 10,
          width: "100%",
        }}
      >
        {cards.map((card) => (
          <StatCard key={card.id} card={card} />
        ))}
      </div>

      <style>{`
        @media (max-width: 820px) {
          .hub-stats-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}

function StatCard({ card }: { card: HubStatCard }) {
  const tone = TONE[card.tone];
  return (
    <article
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px",
        borderRadius: 10,
        border: `1px solid ${C.border}`,
        background: C.surface,
        width: "100%",
        boxSizing: "border-box",
        minWidth: 0,
        minHeight: 0,
      }}
    >
      <span
        aria-hidden
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "0 0 auto",
          width: 36,
          height: 36,
          borderRadius: 8,
          border: `1px solid ${tone.chipBd}`,
          background: tone.chipBg,
          color: tone.icon,
        }}
      >
        <StatIcon name={card.icon} />
      </span>

      <div style={{ flex: "1 1 auto", minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            flexWrap: "wrap",
            gap: "4px 10px",
          }}
        >
          <span
            style={{
              fontSize: "clamp(1.15rem, 2.2vw, 1.4rem)",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: C.text,
              lineHeight: 1.1,
            }}
          >
            {card.value}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.text, lineHeight: 1.2 }}>
            {card.label}
          </span>
          {card.delta && card.delta.direction === "up" ? (
            <span
              style={{
                marginLeft: "auto",
                fontSize: 11,
                fontWeight: 700,
                color: UP_GREEN,
                letterSpacing: "0.02em",
                whiteSpace: "nowrap",
              }}
            >
              {"\u2191"} {card.delta.percentLabel}
            </span>
          ) : null}
        </div>
        {card.hint ? (
          <div
            style={{
              marginTop: 3,
              fontSize: 11,
              color: C.muted,
              lineHeight: 1.35,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {card.hint}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function StatIcon({ name }: { name: HubStatIcon }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "code":
      return (
        <svg {...common}>
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      );
    case "files":
      return (
        <svg {...common}>
          <path d="M3 7h5l2 2h11v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
        </svg>
      );
    case "projects":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "designer":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
        </svg>
      );
    case "dev":
      return (
        <svg {...common}>
          <rect x="2" y="4" width="20" height="14" rx="2" />
          <path d="M8 21h8" />
          <path d="M12 18v3" />
        </svg>
      );
    case "ai":
      return (
        <svg {...common}>
          <path d="M12 3v3" />
          <path d="M12 18v3" />
          <path d="M3 12h3" />
          <path d="M18 12h3" />
          <circle cx="12" cy="12" r="4.5" />
          <path d="M5.6 5.6l2.1 2.1" />
          <path d="M16.3 16.3l2.1 2.1" />
          <path d="M18.4 5.6l-2.1 2.1" />
          <path d="M7.7 16.3l-2.1 2.1" />
        </svg>
      );
    default:
      return null;
  }
}
