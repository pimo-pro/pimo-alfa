/**
 * ADMIN — Informacoes de deploy / versao publicada.
 * Rota: /admin/system/deploy-info
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import versionDataUrl from "../../../version.json?url";
import {
  fetchPublishedVersion,
  PUBLISHED_VERSION_FALLBACK,
  type PublishedVersionInfo,
} from "../../core/deploy/publishedVersion";
import Panel from "../../components/ui/Panel";

const rowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "160px 1fr",
  gap: 8,
  fontSize: 13,
  padding: "6px 0",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
};

const labelStyle: React.CSSProperties = { color: "var(--text-muted)" };
const valueStyle: React.CSSProperties = {
  color: "var(--text-main)",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  wordBreak: "break-all",
};

export default function DeployInfoPage() {
  const [info, setInfo] = useState<PublishedVersionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const fromAsset = await fetchPublishedVersion(versionDataUrl);
      if (cancelled) return;
      if (fromAsset) {
        setInfo(fromAsset);
        return;
      }
      const fromPublic = await fetchPublishedVersion("/version.json");
      if (cancelled) return;
      if (fromPublic) {
        setInfo(fromPublic);
        return;
      }
      setError("Nao foi possivel ler version.json");
      setInfo({ version: PUBLISHED_VERSION_FALLBACK });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const buildStamp =
    typeof __PIMO_VERSION__ === "string" ? __PIMO_VERSION__ : undefined;

  return (
    <div style={{ padding: 24, overflowY: "auto", height: "100%" }}>
      <div style={{ marginBottom: 16 }}>
        <Link to="/admin" style={{ fontSize: 12, color: "var(--text-muted)" }}>
          ? Admin
        </Link>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "8px 0 0" }}>
          Deploy Info
        </h1>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "6px 0 0" }}>
          Versao publicada no site (sincronizada com a tag GitHub Actions).
        </p>
      </div>

      <div style={{ maxWidth: 640 }}>
        <Panel title="Versao actual publicada">
          {error ? (
            <p style={{ fontSize: 12, color: "#f59e0b", margin: "0 0 8px" }}>{error}</p>
          ) : null}
          <div style={rowStyle}>
            <span style={labelStyle}>Versao</span>
            <span style={valueStyle}>{info?.version ?? "…"}</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Tag</span>
            <span style={valueStyle}>{info?.tag || info?.version || "—"}</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Commit</span>
            <span style={valueStyle}>{info?.commit || "—"}</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>updatedAt</span>
            <span style={valueStyle}>{info?.updatedAt || "—"}</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>deployedAt</span>
            <span style={valueStyle}>{info?.deployedAt || "—"}</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Build stamp</span>
            <span style={valueStyle}>{buildStamp || "—"}</span>
          </div>
        </Panel>
      </div>
    </div>
  );
}
