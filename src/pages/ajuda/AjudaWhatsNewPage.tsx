import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AJUDA_PATH } from "@/routes/ajudaRoutes";
import { AJUDA_PAGE_TOKENS as C, ajudaPageFont as font } from "./ajudaPageTokens";
import { loadWhatsNewNews, type WhatsNewEntry, type WhatsNewType } from "./loadWhatsNewNews";

const TYPE_LABEL: Record<WhatsNewType, string> = {
  feature: "Feature",
  fix: "Fix",
  update: "Update",
  docs: "Docs",
};

const TYPE_COLOR: Record<WhatsNewType, string> = {
  feature: "var(--status-done-color, var(--ci-success, #34d399))",
  fix: "var(--status-progress-color, var(--ci-sienna-400, #fbbf24))",
  update: C.accent,
  docs: "var(--ci-prussian-200, var(--blue-light, #a78bfa))",
};

export default function AjudaWhatsNewPage() {
  const [entries, setEntries] = useState<WhatsNewEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadWhatsNewNews()
      .then((publications) => {
        if (!cancelled) setEntries(publications);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erro ao carregar novidades.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: font }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 20px 80px" }}>
        <div style={{ padding: "48px 0 36px", borderBottom: `1px solid ${C.border}`, marginBottom: 36 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 12,
              padding: "3px 10px",
              borderRadius: 999,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              background: C.accentBg,
              color: C.accent,
              border: `1px solid ${C.accentBd}`,
            }}
          >
            Documentação
          </div>
          <h1 style={{ fontSize: "clamp(1.7rem, 4vw, 2.3rem)", fontWeight: 800, margin: "0 0 10px", letterSpacing: "-0.02em" }}>
            Novidades do Sistema
          </h1>
          <p style={{ fontSize: "0.98rem", color: C.muted, maxWidth: 640, margin: 0, lineHeight: 1.6 }}>
            Release notes de todas as versões publicadas do PIMO Criativo — versão, data, mensagem e commit.
          </p>
          <Link
            to={AJUDA_PATH}
            style={{
              marginTop: 16,
              display: "inline-block",
              padding: "8px 14px",
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: C.surface,
              color: C.accent,
              fontSize: 12,
              textDecoration: "none",
            }}
          >
            ← Voltar ao Centro de Ajuda
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "198px 1fr", gap: 28, alignItems: "start" }}>
          <nav
            style={{
              position: "sticky",
              top: 16,
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: "8px 6px",
            }}
          >
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                color: C.muted,
                padding: "4px 10px 8px",
                margin: 0,
              }}
            >
              Conteúdo
            </p>
            <Link
              to={AJUDA_PATH}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "6px 10px",
                borderRadius: 7,
                fontSize: 12,
                color: C.muted,
                textDecoration: "none",
                fontFamily: font,
              }}
            >
              Guias de utilizador
            </Link>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "6px 10px",
                borderRadius: 7,
                fontSize: 12,
                fontWeight: 600,
                color: C.accent,
                background: C.accentBg,
                border: `1px solid ${C.accentBd}`,
                fontFamily: font,
              }}
            >
              <span aria-hidden>🆕</span>
              Novidades do Sistema
            </div>
          </nav>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {loading ? (
              <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>A carregar novidades…</p>
            ) : null}
            {error ? (
              <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>{error}</p>
            ) : null}
            {!loading && !error && entries.length === 0 ? (
              <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>Sem publicações registadas.</p>
            ) : null}
            {!loading && !error && entries.length > 0 ? (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                {entries.map((entry, index) => (
                  <li
                    key={`${entry.version}-${entry.publishedAt}-${index}`}
                    style={{
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 14,
                      padding: "16px 20px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span aria-hidden style={{ fontSize: 18, lineHeight: 1 }}>
                        {entry.icon ?? "⚙️"}
                      </span>
                      <strong style={{ fontSize: 15, color: C.text }}>{entry.version}</strong>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          padding: "2px 8px",
                          borderRadius: 999,
                          color: TYPE_COLOR[entry.type],
                          border: `1px solid ${TYPE_COLOR[entry.type]}55`,
                          background: `${TYPE_COLOR[entry.type]}14`,
                        }}
                      >
                        {TYPE_LABEL[entry.type]}
                      </span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginTop: 8, color: C.text }}>
                      {entry.title}
                    </div>
                    <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>
                      {new Date(entry.publishedAt).toLocaleString("pt-PT")}
                      {entry.author ? ` · ${entry.author}` : ""}
                      {entry.commit ? ` · ${entry.commit}` : ""}
                    </div>
                    {entry.description && entry.description !== entry.title ? (
                      <div style={{ fontSize: 14, marginTop: 8, color: C.text, lineHeight: 1.6 }}>
                        {entry.description}
                      </div>
                    ) : null}
                    {entry.actionUrl ? (
                      <a
                        href={entry.actionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-block",
                          marginTop: 10,
                          fontSize: 12,
                          color: C.accent,
                          textDecoration: "none",
                        }}
                      >
                        Ver GitHub Action →
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
