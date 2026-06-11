import { useCallback, useState } from "react";
import Panel from "../../ui/Panel";
import { useProject } from "../../../context/useProject";
import { usePimoViewerContext } from "../../../hooks/usePimoViewerContext";

type EngineQuickAction = "moreSpace" | "moreSymmetry" | "minimal" | "optimizeWall" | "variations";
type StyleQuickAction =
  | "styleModern"
  | "styleNordic"
  | "styleIndustrial"
  | "styleClassic"
  | "styleJapandi"
  | "styleLuxury";
type QuickAction = EngineQuickAction | StyleQuickAction;

const QUICK_BUTTONS: Array<{ action: QuickAction; label: string }> = [
  { action: "moreSpace", label: "Mais espaço" },
  { action: "moreSymmetry", label: "Mais simetria" },
  { action: "minimal", label: "Minimalista" },
  { action: "optimizeWall", label: "Otimizar parede" },
  { action: "variations", label: "Variações" },
  { action: "styleModern", label: "Moderno" },
  { action: "styleNordic", label: "Nórdico" },
  { action: "styleIndustrial", label: "Industrial" },
  { action: "styleClassic", label: "Clássico" },
  { action: "styleJapandi", label: "Japandi" },
  { action: "styleLuxury", label: "Luxo" },
];

export function ConversationalDesignerPanel() {
  const { project } = useProject();
  const { viewerApi } = usePimoViewerContext();
  const seedBoxId = project.selectedWorkspaceBoxId ?? project.workspaceBoxes[0]?.id ?? "";
  const [input, setInput] = useState("");
  const [history, setHistory] = useState(() => viewerApi?.conversationalDesigner?.getHistory?.() ?? []);
  const [lastSuggestion, setLastSuggestion] = useState<string | null>(null);

  const refreshHistory = useCallback(() => {
    setHistory(viewerApi?.conversationalDesigner?.getHistory?.() ?? []);
  }, [viewerApi]);

  const runTurn = useCallback(
    (fn: () => ReturnType<NonNullable<typeof viewerApi>["conversationalDesigner"]["sendMessage"]> | undefined) => {
      if (!seedBoxId) return;
      const result = fn();
      if (!result) return;
      refreshHistory();
      setLastSuggestion(result.suggestion ?? null);
    },
    [seedBoxId, refreshHistory]
  );

  const onSend = () => {
    const text = input.trim();
    if (!text || !viewerApi?.conversationalDesigner) return;
    runTurn(() => viewerApi.conversationalDesigner!.sendMessage(text, seedBoxId));
    setInput("");
  };

  const onQuick = (action: QuickAction) => {
    if (!viewerApi?.conversationalDesigner) return;
    const stylePhrases: Partial<Record<QuickAction, string>> = {
      styleModern: "quero estilo moderno",
      styleNordic: "quero algo nórdico",
      styleIndustrial: "faz versão industrial",
      styleClassic: "quero estilo clássico",
      styleJapandi: "quero japandi",
      styleLuxury: "quero luxo",
    };
    const phrase = stylePhrases[action];
    if (phrase) {
      runTurn(() => viewerApi.conversationalDesigner!.sendMessage(phrase, seedBoxId));
      return;
    }
    runTurn(() => viewerApi.conversationalDesigner!.quickAction(action as EngineQuickAction, seedBoxId));
  };

  return (
    <Panel title="Designer Inteligente — Conversação">
      <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 8px" }}>
        Descreva o que pretende (ex.: «quero mais espaço», «design B», «porquê?», «aceitar»).
      </p>

      {!seedBoxId && (
        <p style={{ fontSize: 11, color: "var(--warning, #f59e0b)", marginBottom: 8 }}>
          Selecione um módulo na sala para servir de base ao layout.
        </p>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          maxHeight: 140,
          overflowY: "auto",
          marginBottom: 8,
          padding: 8,
          borderRadius: 6,
          background: "var(--surface-elevated, rgba(15,23,42,0.4))",
        }}
      >
        {history.length === 0 && (
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Sem mensagens ainda.</span>
        )}
        {history.map((entry, i) => (
          <div
            key={`${entry.timestamp}-${i}`}
            style={{
              fontSize: 11,
              lineHeight: 1.45,
              color: entry.role === "user" ? "var(--text-main)" : "var(--text-muted)",
              whiteSpace: "pre-wrap",
            }}
          >
            <strong>{entry.role === "user" ? "Você" : "Designer"}:</strong> {entry.text}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <input
          type="text"
          className="input input-sm"
          style={{ flex: 1 }}
          placeholder="Ex.: quero estilo minimalista"
          value={input}
          disabled={!seedBoxId}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSend();
          }}
        />
        <button type="button" className="button button-primary button-sm" disabled={!seedBoxId} onClick={onSend}>
          Enviar
        </button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {QUICK_BUTTONS.map((btn) => (
          <button
            key={btn.action}
            type="button"
            className="button button-sm"
            disabled={!seedBoxId}
            onClick={() => onQuick(btn.action)}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {lastSuggestion && (
        <p style={{ fontSize: 11, color: "var(--accent, #38bdf8)", margin: 0, whiteSpace: "pre-wrap" }}>
          Sugestão: {lastSuggestion}
        </p>
      )}
    </Panel>
  );
}
