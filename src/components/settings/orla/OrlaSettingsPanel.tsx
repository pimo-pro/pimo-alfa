import { useState } from "react";
import { useProject } from "../../../context/useProject";
import Panel from "../../ui/Panel";
import type { OrlaMaterialTipo, OrlaPreset } from "../../../core/orla/orlaTypes";
import { formatCurrency } from "../../../utils/formatting";

const TIPOS: OrlaMaterialTipo[] = ["PVC", "ABS", "MELAMINA", "OUTRO"];

function slugId(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
}

export default function OrlaSettingsPanel() {
  const { project, actions } = useProject();
  const presets = project.orlaPresets ?? [];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<OrlaPreset>>({});

  const startNew = () => {
    setEditingId("__new__");
    setDraft({
      nome: "Nova orla",
      tipo: "PVC",
      espessuraMm: 0.8,
      larguraMm: 23,
      cor: "#f4f4f2",
      precoPorMetro: 1.25,
    });
  };

  const startEdit = (preset: OrlaPreset) => {
    setEditingId(preset.id);
    setDraft({ ...preset });
  };

  const saveDraft = () => {
    if (!draft.nome?.trim()) return;
    const id =
      editingId === "__new__"
        ? `${slugId(draft.nome)}_${Date.now().toString(36)}`
        : editingId!;
    const preset: OrlaPreset = {
      id,
      nome: draft.nome.trim(),
      tipo: draft.tipo ?? "PVC",
      espessuraMm: draft.espessuraMm ?? 0.8,
      larguraMm: draft.larguraMm ?? 23,
      cor: draft.cor ?? "#ffffff",
      texturaUrl: draft.texturaUrl,
      precoPorMetro: draft.precoPorMetro ?? 0,
      precoPorM2: draft.precoPorM2,
    };
    actions.upsertOrlaPreset(preset);
    setEditingId(null);
    setDraft({});
  };

  return (
    <aside className="panel-content panel-content--side">
      <div className="section-title">Orlas — Catálogo</div>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
        Presets de orla disponíveis no projeto. Usados no caixote, peças e ferragem.
      </p>

      <Panel title="Presets">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {presets.map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                border: "1px solid var(--border-subtle)",
                borderRadius: 6,
              }}
            >
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 3,
                  background: p.cor,
                  border: "1px solid rgba(0,0,0,0.15)",
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{p.nome}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {p.tipo} · {p.espessuraMm}×{p.larguraMm} mm · {formatCurrency(p.precoPorMetro)}/m
                </div>
              </div>
              <button type="button" className="button button-sm" onClick={() => startEdit(p)}>
                Editar
              </button>
              <button
                type="button"
                className="button button-sm button-ghost"
                onClick={() => actions.removeOrlaPreset(p.id)}
              >
                Remover
              </button>
            </div>
          ))}
          <button type="button" className="button button-primary" onClick={startNew}>
            Nova orla
          </button>
        </div>
      </Panel>

      {editingId && (
        <Panel title={editingId === "__new__" ? "Criar orla" : "Editar orla"}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label className="panel-field-row">
              <span className="panel-label">Nome</span>
              <input
                className="input input-sm"
                value={draft.nome ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, nome: e.target.value }))}
              />
            </label>
            <label className="panel-field-row">
              <span className="panel-label">Tipo</span>
              <select
                className="select input-sm"
                value={draft.tipo ?? "PVC"}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, tipo: e.target.value as OrlaMaterialTipo }))
                }
              >
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="panel-field-row">
              <span className="panel-label">Espessura</span>
              <input
                type="number"
                step={0.1}
                min={0.1}
                className="input input-sm"
                value={draft.espessuraMm ?? 0.8}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, espessuraMm: Number.parseFloat(e.target.value) || 0.8 }))
                }
              />
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>mm</span>
            </label>
            <label className="panel-field-row">
              <span className="panel-label">Largura</span>
              <input
                type="number"
                step={1}
                min={1}
                className="input input-sm"
                value={draft.larguraMm ?? 23}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, larguraMm: Number.parseFloat(e.target.value) || 23 }))
                }
              />
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>mm</span>
            </label>
            <label className="panel-field-row">
              <span className="panel-label">Cor</span>
              <input
                type="color"
                value={draft.cor ?? "#ffffff"}
                onChange={(e) => setDraft((d) => ({ ...d, cor: e.target.value }))}
              />
            </label>
            <label className="panel-field-row">
              <span className="panel-label">Preço/m</span>
              <input
                type="number"
                step={0.01}
                min={0}
                className="input input-sm"
                value={draft.precoPorMetro ?? 0}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    precoPorMetro: Number.parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="button button-primary" onClick={saveDraft}>
                Guardar
              </button>
              <button
                type="button"
                className="button button-ghost"
                onClick={() => {
                  setEditingId(null);
                  setDraft({});
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </Panel>
      )}

      {project.ferragemOrla && project.ferragemOrla.linhas.length > 0 && (
        <Panel title="Resumo no projeto">
          <div style={{ fontSize: 12 }}>
            <div>Total: {project.ferragemOrla.metrosTotal.toFixed(2)} m</div>
            <div>Custo: {formatCurrency(project.ferragemOrla.custoTotal)}</div>
          </div>
        </Panel>
      )}
    </aside>
  );
}
