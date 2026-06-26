type PieceObservacoesEditorProps = {
  observacoes: string[];
  draft: string;
  onDraftChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  compact?: boolean;
};

export default function PieceObservacoesEditor({
  observacoes,
  draft,
  onDraftChange,
  onAdd,
  onRemove,
  compact = false,
}: PieceObservacoesEditorProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? 6 : 8 }}>
      {observacoes.length === 0 ? (
        <p className="muted-text" style={{ margin: 0, fontSize: 11 }}>
          Sem observações.
        </p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: "var(--text-main)" }}>
          {observacoes.map((obs, index) => (
            <li key={`${obs}-${index}`} style={{ marginBottom: 4, display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ flex: 1 }}>{obs}</span>
              <button
                type="button"
                className="button button-ghost"
                style={{ fontSize: 10, padding: "2px 6px" }}
                onClick={() => onRemove(index)}
                aria-label="Remover observação"
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <input
          className="input input-sm"
          style={{ flex: 1, minWidth: 120 }}
          placeholder="Nova observação"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd();
            }
          }}
        />
        <button
          type="button"
          className="button button-primary"
          style={{ fontSize: 11 }}
          disabled={!draft.trim()}
          onClick={onAdd}
        >
          Adicionar Observação
        </button>
      </div>
    </div>
  );
}
