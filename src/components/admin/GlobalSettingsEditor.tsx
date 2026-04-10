import { useMemo } from "react";

import "../ui/ui.css";

export type GlobalSettingsEditorProps = {
  /** Texto JSON completo do documento em disco (version, updatedAt, settings). */
  value: string;
  onChange: (next: string) => void;
  validationErrors: string[];
  disabled?: boolean;
};

/**
 * Editor só de UI: textarea, erros e pré-visualização segura do parse.
 * A lógica de validação/guardar fica na página (`GlobalSettingsAdminPage`).
 */
export default function GlobalSettingsEditor({
  value,
  onChange,
  validationErrors,
  disabled,
}: GlobalSettingsEditorProps) {
  const preview = useMemo(() => safeJsonPreview(value), [value]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <label htmlFor="pimo-global-settings-json" style={{ display: "block", fontWeight: 600, marginBottom: 8 }}>
          Documento global-settings.json (JSON)
        </label>
        <textarea
          id="pimo-global-settings-json"
          className="ui-input"
          spellCheck={false}
          rows={22}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%",
            minHeight: 360,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: 13,
            lineHeight: 1.45,
            resize: "vertical",
          }}
        />
      </div>

      {validationErrors.length > 0 ? (
        <div
          role="alert"
          className="ui-text-danger"
          style={{ fontSize: 14, margin: 0, whiteSpace: "pre-wrap" }}
        >
          {validationErrors.map((e) => (
            <div key={e}>• {e}</div>
          ))}
        </div>
      ) : null}

      <div
        style={{
          fontSize: 13,
          color: "var(--text-muted, #71717a)",
          borderLeft: "3px solid var(--border-subtle, #e4e4e7)",
          paddingLeft: 12,
        }}
      >
        <strong style={{ color: "var(--text, inherit)" }}>Pré-visualização (parse seguro):</strong>{" "}
        {preview}
      </div>
    </div>
  );
}

/** Resumo legível sem assumir estrutura além de JSON.parse. */
function safeJsonPreview(text: string): string {
  const trimmed = text.trim();
  if (trimmed === "") return "— (vazio)";
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return "JSON válido, mas a raiz deve ser um objeto.";
    }
    const o = parsed as Record<string, unknown>;
    const v = o.version;
    const hasSettings = "settings" in o;
    const st = o.settings;
    const settingsKind =
      st === null || st === undefined
        ? "settings em falta"
        : Array.isArray(st)
          ? "settings é array (deve ser objeto)"
          : typeof st === "object"
            ? `settings: objeto (${Object.keys(st as object).length} chaves no 1.º nível)`
            : `settings: ${typeof st}`;
    return [
      typeof v === "string" ? `version: "${v}"` : "version: (definir string)",
      typeof o.updatedAt === "string" ? `updatedAt: presente` : "updatedAt: opcional no ficheiro",
      hasSettings ? settingsKind : "settings: em falta",
    ].join(" · ");
  } catch {
    return "JSON inválido — corrija a sintaxe antes de validar.";
  }
}
