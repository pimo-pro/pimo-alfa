interface FooterProps {
  onShowAbout?: () => void;
  onShowSystemDocs?: () => void;
  onShowAdmin?: () => void;
}

export default function Footer({ onShowAbout, onShowSystemDocs, onShowAdmin }: FooterProps) {
  return (
    <footer
      style={{
        flexShrink: 0,
        minHeight: 32,
        background: "#050816",
        borderTop: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        rowGap: 3,
        columnGap: 10,
        padding: "3px 12px",
        fontSize: "clamp(10px, 1.3vw, 11px)",
        lineHeight: 1.2,
        color: "var(--text-muted)",
      }}
    >
      <span style={{ whiteSpace: "nowrap" }}>© 2026 PIMO Studio — Crafted by Khaled</span>

      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          flexWrap: "wrap",
          rowGap: 3,
          columnGap: 8,
        }}
      >
        <span style={{ cursor: "pointer" }}>Ajuda</span>
        <span style={{ cursor: "pointer" }}>Contacto</span>
        <span style={{ cursor: "pointer" }}>Documentação</span>
        <span
          style={{ cursor: "pointer" }}
          onClick={onShowSystemDocs}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              onShowSystemDocs?.();
            }
          }}
        >
          Documentação do Sistema
        </span>
        <span
          style={{ cursor: "pointer" }}
          onClick={onShowAdmin}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              onShowAdmin?.();
            }
          }}
        >
          Admin
        </span>
        <span
          style={{ cursor: "pointer" }}
          onClick={onShowAbout}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              onShowAbout?.();
            }
          }}
        >
          Sobre Nós
        </span>
      </span>
    </footer>
  );
}
