/**
 * Banner ADMIN: alerta se texto carregado / labels tiverem acentuacao partida.
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { encodingAlertMessage, scanPortugueseEncoding } from "@/core/encoding/portugueseEncodingGuard";

type Props = {
  /** Textos a validar (labels de menu, titulos, payloads carregados). */
  texts: readonly string[];
  sourceLabel?: string;
};

export function EncodingIntegrityBanner({ texts, sourceLabel = "ADMIN" }: Props): ReactNode {
  const [dismissed, setDismissed] = useState(false);

  const joined = useMemo(() => texts.filter(Boolean).join("\n"), [texts]);
  const alert = useMemo(() => encodingAlertMessage(joined, sourceLabel), [joined, sourceLabel]);

  useEffect(() => {
    setDismissed(false);
  }, [alert]);

  if (!alert || dismissed) return null;

  const scan = scanPortugueseEncoding(joined);

  return (
    <div
      role="alert"
      data-encoding-alert="true"
      style={{
        marginBottom: 12,
        padding: "10px 12px",
        borderRadius: 8,
        border: "1px solid rgba(220, 38, 38, 0.45)",
        background: "rgba(220, 38, 38, 0.08)",
        color: "var(--admin-text, var(--text-main))",
        fontSize: 12,
        lineHeight: 1.45,
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        justifyContent: "space-between",
      }}
    >
      <div>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Acentuacao portuguesa invalida</div>
        <div>{alert}</div>
        <div style={{ marginTop: 4, opacity: 0.85 }}>
          Corrija o texto para UTF-8 sem BOM (ver src/core/rules/linguagem-portuguesa.md). Detalhe:{" "}
          {scan.replacementCount} U+FFFD, {scan.mojibakeCount} mojibake.
        </div>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        style={{
          flexShrink: 0,
          fontSize: 11,
          padding: "4px 8px",
          cursor: "pointer",
          borderRadius: 6,
          border: "1px solid rgba(0,0,0,0.15)",
          background: "transparent",
          color: "inherit",
        }}
      >
        Dispensar
      </button>
    </div>
  );
}

/**
 * Hook opcional: regista texto dinamico carregado (JSON/import) e expoe alerta.
 */
export function useLoadedTextEncodingAlert(text: string | null | undefined, sourceLabel?: string) {
  return useMemo(() => {
    if (!text) return null;
    return encodingAlertMessage(text, sourceLabel);
  }, [text, sourceLabel]);
}
