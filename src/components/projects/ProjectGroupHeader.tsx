type Props = {
  ownerName: string;
  count: number;
};

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
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: "var(--ui-color-primary, #3b82f6)",
        color: "#fff",
        fontSize: 13,
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

export function ProjectGroupHeader({ ownerName, count }: Props) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 0 8px",
        borderBottom: "1px solid var(--border, #e4e4e7)",
        marginBottom: 4,
      }}
    >
      <Avatar name={ownerName} />
      <div style={{ flex: 1 }}>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 700,
            color: "var(--ui-color-text, #18181b)",
          }}
        >
          {ownerName}
        </p>
      </div>
      <span
        style={{
          fontSize: 12,
          color: "var(--ui-color-muted, #71717a)",
          background: "var(--ui-color-surface, #f4f4f5)",
          border: "1px solid var(--border, #e4e4e7)",
          borderRadius: 12,
          padding: "2px 10px",
          fontWeight: 500,
        }}
      >
        {count} {count === 1 ? "projeto" : "projetos"}
      </span>
    </div>
  );
}
