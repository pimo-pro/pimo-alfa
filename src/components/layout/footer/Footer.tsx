import { useEffect, useRef, useState } from "react";
import versionDataUrl from "../../../../version.json?url";

interface FooterProps {
  onShowAbout?: () => void;
  onShowSystemDocs?: () => void;
  onShowAdmin?: () => void;
  onShowAjuda?: () => void;
}

export default function Footer({ onShowAbout, onShowSystemDocs, onShowAdmin, onShowAjuda }: FooterProps) {
  const [versionInfo, setVersionInfo] = useState({
    version: "V4.1.0.2.6",
    updatedAt: "12.03.2026 12:08",
  });
  const [isVersionPopupOpen, setIsVersionPopupOpen] = useState(false);
  const versionBlockRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    fetch(versionDataUrl)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (
          data &&
          typeof data.version === "string" &&
          typeof data.updatedAt === "string"
        ) {
          setVersionInfo({ version: data.version, updatedAt: data.updatedAt });
        }
      })
      .catch(() => {
        // Mantem fallback caso a leitura do ficheiro falhe.
      });
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!versionBlockRef.current) return;
      if (!versionBlockRef.current.contains(event.target as Node)) {
        setIsVersionPopupOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

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
      <span
        ref={versionBlockRef}
        style={{
          whiteSpace: "nowrap",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          position: "relative",
        }}
      >
        <span style={{ color: "var(--text-main)", fontWeight: 600 }}>{versionInfo.version}</span>
        <button
          type="button"
          onClick={() => setIsVersionPopupOpen((open) => !open)}
          aria-label="Abrir detalhes da versao"
          aria-expanded={isVersionPopupOpen}
          style={{
            border: "none",
            background: "transparent",
            color: "var(--text-muted)",
            cursor: "pointer",
            padding: 0,
            lineHeight: 1,
            fontSize: "inherit",
          }}
        >
          →
        </button>
        {isVersionPopupOpen && (
          <span
            role="dialog"
            aria-label="Detalhes da versao"
            style={{
              position: "absolute",
              left: 0,
              bottom: "calc(100% + 6px)",
              background: "rgba(5, 8, 22, 0.96)",
              border: "1px solid var(--button-ghost-border)",
              borderRadius: 6,
              padding: "6px 8px",
              boxShadow: "0 6px 16px rgba(0, 0, 0, 0.28)",
              minWidth: 190,
              display: "flex",
              flexDirection: "column",
              gap: 2,
              zIndex: 20,
            }}
          >
            <span>Versao: {versionInfo.version}</span>
            <span>Atualizado em: {versionInfo.updatedAt}</span>
          </span>
        )}
        <span>© 2026 PIMO Studio — Crafted by Khaled</span>
      </span>

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
        <span
          style={{ cursor: "pointer" }}
          onClick={onShowAjuda}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              onShowAjuda?.();
            }
          }}
        >
          Ajuda
        </span>
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
