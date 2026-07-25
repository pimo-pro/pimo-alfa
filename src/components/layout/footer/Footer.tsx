import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import versionDataUrl from "../../../../version.json?url";
import {
  fetchPublishedVersion,
  PUBLISHED_VERSION_FALLBACK,
} from "../../../core/deploy/publishedVersion";

interface FooterProps {
  onShowAjuda?: () => void;
  onShowUserProjects?: () => void;
  onShowLanding?: () => void;
}

export default function Footer({
  onShowAjuda,
  onShowUserProjects,
  onShowLanding,
}: FooterProps) {
  const navigate = useNavigate();
  const [version, setVersion] = useState(PUBLISHED_VERSION_FALLBACK);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const fromAsset = await fetchPublishedVersion(versionDataUrl);
      if (cancelled) return;
      if (fromAsset?.version) {
        setVersion(fromAsset.version);
        return;
      }
      const fromPublic = await fetchPublishedVersion("/version.json");
      if (cancelled) return;
      if (fromPublic?.version) setVersion(fromPublic.version);
    })();
    return () => {
      cancelled = true;
    };
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
      <span style={{ whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span>© 2026 PiMo-Criativo Configurador paramétrico — Crafted by Khaled</span>
        <span style={{ color: "var(--text-main)", fontWeight: "inherit" }}>{version}</span>
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
          onClick={onShowLanding}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") onShowLanding?.();
          }}
        >
          Apresentação
        </span>
        <span
          style={{ cursor: "pointer" }}
          onClick={onShowUserProjects}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              onShowUserProjects?.();
            }
          }}
        >
          Meus Projetos
        </span>
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
        <span
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/documentacao")}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              navigate("/documentacao");
            }
          }}
        >
          Documentação interna
        </span>
        <span
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/admin")}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              navigate("/admin");
            }
          }}
        >
          Admin
        </span>
      </span>
    </footer>
  );
}
