// pimo-kep-fix-001 — protegido, não modificar sem autorização

import { useEffect, useState } from "react";
import {
  RELEASE_PUBLICATIONS_URL,
  type ReleasePublicationEntry,
  type ReleasePublicationsFile,
} from "@/industrial/release/releaseNotesTypes";

export default function IndustrialReleaseNotesPage() {
  const [entries, setEntries] = useState<ReleasePublicationEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(RELEASE_PUBLICATIONS_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json() as Promise<ReleasePublicationsFile>;
      })
      .then((data) => setEntries(Array.isArray(data.publications) ? data.publications : []))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Erro ao carregar release notes.");
      });
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>Release Notes internas</h1>
      {error ? <p style={{ color: "var(--text-muted)", fontSize: 14 }}>{error}</p> : null}
      {!error && entries.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Sem publicações registadas.</p>
      ) : null}
      {!error && entries.length > 0 ? (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {entries.map((entry, index) => (
            <li
              key={`${entry.version}-${entry.publishedAt}-${index}`}
              style={{
                borderBottom: "1px solid var(--border, #334155)",
                padding: "12px 0",
              }}
            >
              <strong>{entry.version}</strong>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                {new Date(entry.publishedAt).toLocaleString("pt-PT")} · {entry.author}
              </div>
              <div style={{ fontSize: 14, marginTop: 6 }}>{entry.commitMessage}</div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
