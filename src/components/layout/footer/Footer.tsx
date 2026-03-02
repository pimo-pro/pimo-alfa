interface FooterProps {
  onShowAbout?: () => void;
  onShowSystemDocs?: () => void;
  onShowAdmin?: () => void;
}

export default function Footer({ onShowAbout, onShowSystemDocs, onShowAdmin }: FooterProps) {
  return (
    <footer
      style={{
        minHeight: 40,
        background: "#050816",
        borderTop: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 18px",
        fontSize: 11,
        color: "var(--text-muted)",
      }}
    >
      <span>© 2026 PIMO Studio — Crafted by Khaled</span>

      <span style={{ display: "flex", gap: "12px", alignItems: "center" }}>
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
