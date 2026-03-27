import logoPimo from "../../../assets/logo-pi.png";
import { useRef, type ReactNode } from "react";
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

function IconUser() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}

function IconUpload() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M20 16v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3" />
    </svg>
  );
}

function IconProjects() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 7h18" />
      <path d="M3 7l2-3h14l2 3" />
      <rect x="3" y="7" width="18" height="14" rx="2" ry="2" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V22a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H2a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01A1.65 1.65 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01A1.65 1.65 0 0 0 19.4 15z" />
    </svg>
  );
}

type HeaderActionButtonProps = {
  title: string;
  ariaLabel: string;
  onClick?: () => void;
  children: ReactNode;
};

function HeaderActionButton({ title, ariaLabel, onClick, children }: HeaderActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        minHeight: 36,
        padding: "0 10px",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        background: "var(--button-ghost-bg)",
        color: "var(--text-main)",
        cursor: "pointer",
        fontSize: 13,
      }}
    >
      {children}
    </button>
  );
}

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const navigateInternal = (path: string) => {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const handleLanguageControl = () => {
    // Comportamento atual: app fixo em PT (sem troca ativa de idioma).
  };

  const handleProjectUpload = () => {
    fileInputRef.current?.click();
    console.log("[Header] Upload de projeto ainda não implementado.");
  };

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
        <HeaderActionButton
          onClick={() => navigateInternal("/login")}
          title="Abrir página de login"
          ariaLabel="Abrir página de login"
        >
          <IconUser />
        </HeaderActionButton>
        <HeaderActionButton
          onClick={() => navigateInternal("/definicoes")}
          title="Abrir definições"
          ariaLabel="Abrir definições"
        >
          <IconSettings />
        </HeaderActionButton>
        <HeaderActionButton
          onClick={() => navigateInternal("/meus-projetos")}
          title="Abrir meus projetos"
          ariaLabel="Abrir meus projetos"
        >
          <IconProjects />
        </HeaderActionButton>
        <HeaderActionButton
          onClick={handleProjectUpload}
          title="Selecionar ficheiro de projeto"
          ariaLabel="Selecionar ficheiro de projeto"
        >
          <IconUpload />
        </HeaderActionButton>
        <HeaderActionButton
          onClick={handleLanguageControl}
          title="Idioma atual: PT"
          ariaLabel="Idioma atual PT"
        >
          🌐 PT
        </HeaderActionButton>
        <HeaderActionButton
          onClick={toggleTheme}
          title={theme === "dark" ? "Usar tema claro" : "Usar tema escuro"}
          ariaLabel={theme === "dark" ? "Alternar para tema claro" : "Alternar para tema escuro"}
        >
          {theme === "dark" ? <ThemeIconSun /> : <ThemeIconMoon />}
        </HeaderActionButton>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: "none" }}
        aria-hidden
        tabIndex={-1}
      />
    </header>
  );
}
