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
          <span style={{ fontWeight: 600 }}>Páginas Internas (Dev)</span>
          <span style={{ display: "grid", gridTemplateColumns: "repeat(2, auto)", gap: "2px 12px" }}>
            <a style={{ color: "#94a3b8", textDecoration: "none" }} href="/admin">• Admin Panel</a>
            <a style={{ color: "#94a3b8", textDecoration: "none" }} href="/documentacao">• Documentação</a>
            <a style={{ color: "#94a3b8", textDecoration: "none" }} href="/">• Workspace</a>
            <a style={{ color: "#94a3b8", textDecoration: "none" }} href="/cutlist">• Cutlist</a>
            <a style={{ color: "#94a3b8", textDecoration: "none" }} href="/settings">• Settings</a>
            <a style={{ color: "#94a3b8", textDecoration: "none" }} href="/templates">• Templates</a>
            <a style={{ color: "#94a3b8", textDecoration: "none" }} href="/cad-models">• CAD Models</a>
            <a style={{ color: "#94a3b8", textDecoration: "none" }} href="/pricing">• Pricing</a>
            <a style={{ color: "#94a3b8", textDecoration: "none" }} href="/system-settings">• System Settings</a>
            <a style={{ color: "#94a3b8", textDecoration: "none" }} href="/users">• Users</a>
          </span>
        </span>
      </span>
    </footer>
  );
}
