import logoPimo from "../../../assets/logo-pi.png";
import { useRef, type ReactNode } from "react";
import { useTheme } from "../../../context/ThemeContext";
import { Icon } from "@/components/icons";
import HeaderUndoRedoButtons from "./HeaderUndoRedoButtons";

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
        minHeight: 29,
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
        height: "45px",
        background: `linear-gradient(90deg, var(--black), var(--navy))`,
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
      }}
    >
      {/* Logótipo + título + desfazer/refazer (handlers registados pelo Workspace no LegacyApp) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
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
            <div style={{ fontSize: 16, fontWeight: 600 }}>PiMo Studio</div>
          </div>
        </div>
        <HeaderUndoRedoButtons />
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
          <Icon name="user" size={18} aria-hidden />
        </HeaderActionButton>
        <HeaderActionButton
          onClick={() => navigateInternal("/definicoes")}
          title="Abrir definições"
          ariaLabel="Abrir definições"
        >
          <Icon name="settings" size={18} aria-hidden />
        </HeaderActionButton>
        <HeaderActionButton
          onClick={() => navigateInternal("/meus-projetos")}
          title="Abrir meus projetos"
          ariaLabel="Abrir meus projetos"
        >
          <Icon name="projects" size={18} aria-hidden />
        </HeaderActionButton>
        <HeaderActionButton
          onClick={handleProjectUpload}
          title="Selecionar ficheiro de projeto"
          ariaLabel="Selecionar ficheiro de projeto"
        >
          <Icon name="upload" size={18} aria-hidden />
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
          {theme === "dark" ? <Icon name="themeSun" size={18} aria-hidden /> : <Icon name="themeMoon" size={18} aria-hidden />}
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
