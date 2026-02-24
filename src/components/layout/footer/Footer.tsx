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
          Configurações
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
          Projetos
        </span>
        <span
          style={{
            width: 1,
            height: 18,
            background: "rgba(148,163,184,0.35)",
            display: "inline-block",
          }}
        />
        <span
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            fontSize: 10,
            color: "#94a3b8",
          }}
        >
          <span style={{ fontWeight: 600 }}>Navegação Principal</span>
          <span style={{ display: "grid", gridTemplateColumns: "repeat(2, auto)", gap: "2px 12px" }}>
            <a style={{ color: "#94a3b8", textDecoration: "none" }} href="/projects">• Projetos</a>
            <a style={{ color: "#94a3b8", textDecoration: "none" }} href="/settings">• Configurações</a>
            <a style={{ color: "#94a3b8", textDecoration: "none" }} href="/design/active">• Design</a>
            <a style={{ color: "#94a3b8", textDecoration: "none" }} href="/projects">• Dashboard</a>
            <a style={{ color: "#94a3b8", textDecoration: "none" }} href="/settings">• Settings</a>
            <a style={{ color: "#94a3b8", textDecoration: "none" }} href="/design/active">• Workspace</a>
          </span>
        </span>
      </span>
    </footer>
  );
}
