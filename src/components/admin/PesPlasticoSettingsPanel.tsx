/**
 * Admin ? Ferragens ? Pés de Plástico Ajustáveis
 * Controla preço, medida/altura, ref e ativação usados no PDF e nas páginas online.
 */

import { useEffect, useState } from "react";
import { usePesPlasticoConfig } from "../../hooks/usePesPlasticoConfig";
import { useFerragens } from "../../hooks/useFerragens";
import { useToast } from "../../context/ToastContext";
import {
  PE_PLASTICO_ID,
  PE_PLASTICO_NOME,
  type PesPlasticoConfig,
} from "../../core/ferragens/pesPlasticoConfig";
import { formatCurrency } from "../../utils/formatting";

export default function PesPlasticoSettingsPanel() {
  const { showToast } = useToast();
  const { config, setConfig } = usePesPlasticoConfig();
  const { ferragens, setFerragens } = useFerragens();
  const [draft, setDraft] = useState<PesPlasticoConfig>(config);

  useEffect(() => {
    setDraft(config);
  }, [config]);

  const syncCatalog = (cfg: PesPlasticoConfig) => {
    setFerragens((prev) => {
      const exists = prev.some((f) => f.id === PE_PLASTICO_ID);
      const entry = {
        id: PE_PLASTICO_ID,
        nome: PE_PLASTICO_NOME,
        categoria: "acessorio" as const,
        medidas: `${Math.round(cfg.alturaMm)}mm`,
        descricao: "Pé de plástico ajustável",
        precoUnitario: cfg.precoUnitario,
      };
      if (exists) {
        return prev.map((f) => (f.id === PE_PLASTICO_ID ? { ...f, ...entry } : f));
      }
      return [...prev, entry];
    });
  };

  const handleSave = () => {
    const next: PesPlasticoConfig = {
      ativo: draft.ativo,
      precoUnitario: Math.max(0, Number(draft.precoUnitario) || 0),
      alturaMm: Math.max(1, Number(draft.alturaMm) || 100),
      ref: draft.ref.trim() || "Pé-Plástico",
    };
    setConfig(next);
    syncCatalog(next);
    showToast("Configuração de Pés de Plástico guardada.", "info");
  };

  const labelStyle = { fontSize: 11, color: "var(--text-muted)", marginBottom: 4 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
        Valores usados no PDF ferragens_totais, nas páginas online e no custo do projeto.
        {ferragens.some((f) => f.id === PE_PLASTICO_ID)
          ? ` Catálogo sincronizado: ${PE_PLASTICO_NOME}.`
          : " A ferragem será criada no catálogo ao guardar."}
      </p>

      <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <div style={labelStyle}>Preço unitário (—)</div>
          <input
            className="input"
            type="number"
            min={0}
            step="0.01"
            value={draft.precoUnitario}
            onChange={(e) =>
              setDraft((p) => ({ ...p, precoUnitario: Number(e.target.value) }))
            }
          />
        </div>
        <div>
          <div style={labelStyle}>Medida / altura (mm)</div>
          <input
            className="input"
            type="number"
            min={1}
            step="1"
            value={draft.alturaMm}
            onChange={(e) => setDraft((p) => ({ ...p, alturaMm: Number(e.target.value) }))}
          />
        </div>
        <div>
          <div style={labelStyle}>Ref</div>
          <input
            className="input"
            value={draft.ref}
            onChange={(e) => setDraft((p) => ({ ...p, ref: e.target.value }))}
            placeholder="Pé-Plástico"
          />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, paddingBottom: 4 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <input
              type="checkbox"
              checked={draft.ativo}
              onChange={(e) => setDraft((p) => ({ ...p, ativo: e.target.checked }))}
            />
            Ativar pés no projeto
          </label>
        </div>
      </div>

      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
        Pré-visualização: {PE_PLASTICO_NOME} — Ref {draft.ref || "—"} — {Math.round(draft.alturaMm || 0)}mm —{" "}
        {formatCurrency(draft.precoUnitario || 0)} / un — {draft.ativo ? "ativo" : "desativado"}
      </div>

      <div>
        <button type="button" className="button" onClick={handleSave}>
          Guardar configuração
        </button>
      </div>
    </div>
  );
}
