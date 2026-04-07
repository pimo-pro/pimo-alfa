import { useRef, useState } from "react";
import type { UserEntry } from "./userEntriesUtils";

type Props = {
  users: UserEntry[];
  activeOwnerId: string | null;
  onSelectOwner: (_ownerId: string | null) => void;
};

const TAG_COLORS = {
  ready: "#22c55e",
  review: "#f59e0b",
  error: "#ef4444",
  sent: "#3b82f6",
} as const;

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div
      aria-hidden
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: "var(--ui-color-primary, #3b82f6)",
        color: "#fff",
        fontSize: 11,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {initials || "?"}
    </div>
  );
}

export function UsersSidebar({ users, activeOwnerId, onSelectOwner }: Props) {
  const [hovered, setHovered] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setHovered(true);
  };

  const handleMouseLeave = () => {
    leaveTimer.current = setTimeout(() => setHovered(false), 250);
  };

  const expanded = hovered || activeOwnerId !== null;

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: "fixed",
        left: 0,
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 200,
        width: expanded ? 220 : 10,
        minHeight: 0,
        transition: "width 0.22s ease",
        overflow: "hidden",
        background: "var(--ui-color-surface, #f4f4f5)",
        border: expanded ? "1px solid var(--border, #e4e4e7)" : "none",
        borderRadius: "0 12px 12px 0",
        boxShadow: expanded ? "2px 0 16px rgba(0,0,0,0.10)" : "none",
      }}
    >
      <div
        style={{
          width: 220,
          padding: expanded ? "14px 12px" : 0,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          opacity: expanded ? 1 : 0,
          transition: "opacity 0.18s ease",
          pointerEvents: expanded ? "auto" : "none",
        }}
      >
        <p
          style={{
            margin: "0 0 8px",
            fontSize: 11,
            fontWeight: 700,
            color: "var(--ui-color-muted, #71717a)",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          Utilizadores
        </p>

        <button
          type="button"
          onClick={() => onSelectOwner(null)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 8px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            background:
              activeOwnerId === null
                ? "var(--ui-color-primary, #3b82f6)"
                : "transparent",
            color:
              activeOwnerId === null
                ? "#fff"
                : "var(--ui-color-text, #18181b)",
            fontSize: 13,
            fontWeight: 500,
            textAlign: "left",
            width: "100%",
            transition: "background 0.12s",
          }}
        >
          <span style={{ flex: 1 }}>Mostrar Todos</span>
          <span
            style={{
              fontSize: 11,
              background: "rgba(0,0,0,0.08)",
              borderRadius: 10,
              padding: "1px 6px",
            }}
          >
            {users.reduce((s, u) => s + u.total, 0)}
          </span>
        </button>

        {users.map((u) => (
          <button
            key={u.ownerId}
            type="button"
            onClick={() => onSelectOwner(u.ownerId)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 8px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              background:
                activeOwnerId === u.ownerId
                  ? "var(--ui-color-primary, #3b82f6)"
                  : "transparent",
              color:
                activeOwnerId === u.ownerId
                  ? "#fff"
                  : "var(--ui-color-text, #18181b)",
              fontSize: 13,
              textAlign: "left",
              width: "100%",
              transition: "background 0.12s",
            }}
          >
            <Avatar name={u.ownerName} />
            <span
              style={{
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: 12,
              }}
            >
              {u.ownerName}
            </span>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
              <span
                style={{
                  fontSize: 11,
                  background: "rgba(0,0,0,0.08)",
                  borderRadius: 10,
                  padding: "1px 6px",
                }}
              >
                {u.total}
              </span>
              <div style={{ display: "flex", gap: 3 }}>
                {u.ready > 0 && (
                  <span
                    title={`${u.ready} prontos`}
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: TAG_COLORS.ready,
                      display: "inline-block",
                    }}
                  />
                )}
                {u.sent > 0 && (
                  <span
                    title={`${u.sent} enviados`}
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: TAG_COLORS.sent,
                      display: "inline-block",
                    }}
                  />
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
