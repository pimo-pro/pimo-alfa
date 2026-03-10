import logoPimo from "../../../assets/logo-pi.png";
import { useTheme } from "../../../context/ThemeContext";

function ThemeIconSun() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function ThemeIconMoon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

interface HeaderProps {
  onTogglePainelReferencia: () => void;
  painelReferenciaOpen: boolean;
  onToggleProjectProgress?: () => void;
  projectProgressOpen?: boolean;
}

export default function Header({
  onTogglePainelReferencia,
  painelReferenciaOpen,
  onToggleProjectProgress,
  projectProgressOpen,
}: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header
      style={{
        flexShrink: 0,
        height: "56px",
        background: `linear-gradient(90deg, var(--black), var(--navy))`,
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
      }}
    >
      {/* Logótipo oficial */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          cursor: "pointer",
          background: "transparent",
          border: "none",
          boxShadow: "none",
          outline: "none",
        }}
        onClick={() => {
          window.history.pushState({}, "", "/");
          window.dispatchEvent(new PopStateEvent("popstate"));
        }}
      >
        <img
          src={logoPimo}
          alt="PIMO"
          style={{
            height: 42,
            width: "auto",
            display: "block",
            objectFit: "contain",
            background: "transparent",
            border: "none",
            boxShadow: "none",
            outline: "none",
          }}
        />
        <div style={{ background: "transparent", border: "none", boxShadow: "none", outline: "none" }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>PIMO-Criativo</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Configurador paramétrico
          </div>
        </div>
      </div>

      {/* Área Direita */}
      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          fontSize: 13,
        }}
      >
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === "dark" ? "Usar tema claro" : "Usar tema escuro"}
          aria-label={theme === "dark" ? "Alternar para tema claro" : "Alternar para tema escuro"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            background: "var(--button-ghost-bg)",
            color: "var(--text-main)",
            cursor: "pointer",
          }}
        >
          {theme === "dark" ? <ThemeIconSun /> : <ThemeIconMoon />}
        </button>
        <span style={{ color: "var(--text-muted)" }}>🌐 Idioma: PT</span>
        <span style={{ color: "var(--text-main)" }}>📁 Projetos</span>
        <button
          onClick={onToggleProjectProgress}
          style={{
            background: projectProgressOpen ? "rgba(139,92,246,0.25)" : "var(--button-ghost-bg)",
            border: "1px solid var(--button-ghost-border)",
            color: "var(--text-main)",
            padding: "6px 10px",
            borderRadius: "var(--radius)",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {projectProgressOpen ? "Voltar ao App" : "Progresso do Projeto"}
        </button>
        <button
          onClick={onTogglePainelReferencia}
          style={{
            background: painelReferenciaOpen ? "var(--accent-button-bg)" : "var(--button-ghost-bg)",
            border: "1px solid var(--button-ghost-border)",
            color: "var(--text-main)",
            padding: "6px 10px",
            borderRadius: "var(--radius)",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {painelReferenciaOpen ? "Voltar ao App" : "Painel de Referência"}
        </button>
      </div>
    </header>
  );
}
