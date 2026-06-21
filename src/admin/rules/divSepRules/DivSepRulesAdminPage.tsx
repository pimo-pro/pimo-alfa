import { useEffect, useState } from "react";
import Panel from "../../../components/ui/Panel";
import { AdminPageHeader, AdminStickyActionBar, adminPageShellStyle } from "../../../components/admin/AdminUi";
import { divSepRulesStore } from "./rulesStore";
import type { CavilhaLengthRule, DivSepRules } from "./rulesDefaults";
import { DIV_SEP_RULES_DEFAULTS } from "./rulesDefaults";

export function DivSepRulesAdminPage() {
  const [draft, setDraft] = useState<DivSepRules>(() => divSepRulesStore.get());
  const [saved, setSaved] = useState(false);

  useEffect(() => divSepRulesStore.subscribe(() => setDraft(divSepRulesStore.get())), []);

  const updateRule = (index: number, patch: Partial<CavilhaLengthRule>) => {
    setDraft((prev) => {
      const next = [...prev.cavilhaLengthRules];
      next[index] = { ...next[index], ...patch };
      return { ...prev, cavilhaLengthRules: next };
    });
  };

  const addRule = () => {
    setDraft((prev) => ({
      ...prev,
      cavilhaLengthRules: [...prev.cavilhaLengthRules, { minMm: 0, maxMm: 0, offsetFromEdgeMm: 15 }],
    }));
  };

  const removeRule = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      cavilhaLengthRules: prev.cavilhaLengthRules.filter((_, i) => i !== index),
    }));
  };

  const onSave = () => {
    divSepRulesStore.set(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const onReset = () => {
    divSepRulesStore.reset();
    setDraft(DIV_SEP_RULES_DEFAULTS);
  };

  return (
    <div style={adminPageShellStyle}>
      <AdminPageHeader
        title="DIV/SEP Rules"
        subtitle="Regras de cavilha e parafuso para divisórios verticais e separadores horizontais."
      />
      <AdminStickyActionBar>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
          {saved ? "Regras guardadas." : "Alterações pendentes até guardar."}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="button button-sm" onClick={onReset}>
            Repor padrão
          </button>
          <button type="button" className="button button-primary button-sm" onClick={onSave}>
            Guardar
          </button>
        </div>
      </AdminStickyActionBar>

      <Panel title="Cavilha — parâmetros globais">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600 }}>Diâmetro (mm)</span>
            <input
              type="number"
              className="input input-sm"
              value={draft.cavilhaDiameterMm}
              onChange={(e) => setDraft((p) => ({ ...p, cavilhaDiameterMm: Number(e.target.value) }))}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600 }}>Profundidade padrão (mm)</span>
            <input
              type="number"
              className="input input-sm"
              value={draft.cavilhaDepthMm}
              onChange={(e) => setDraft((p) => ({ ...p, cavilhaDepthMm: Number(e.target.value) }))}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600 }}>Distância parafuso ↔ cavilha (mm)</span>
            <input
              type="number"
              className="input input-sm"
              value={draft.parafusoDistanceFromCavilhaMm}
              onChange={(e) =>
                setDraft((p) => ({ ...p, parafusoDistanceFromCavilhaMm: Number(e.target.value) }))
              }
            />
          </label>
        </div>
      </Panel>

      <Panel title="Tabela de regras de cavilha (comprimento → distância da borda)">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                <th style={{ padding: 8 }}>Min (mm)</th>
                <th style={{ padding: 8 }}>Max (mm)</th>
                <th style={{ padding: 8 }}>Distância da borda (mm)</th>
                <th style={{ padding: 8 }} />
              </tr>
            </thead>
            <tbody>
              {draft.cavilhaLengthRules.map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <td style={{ padding: 8 }}>
                    <input
                      type="number"
                      className="input input-sm"
                      value={row.minMm}
                      onChange={(e) => updateRule(i, { minMm: Number(e.target.value) })}
                    />
                  </td>
                  <td style={{ padding: 8 }}>
                    <input
                      type="number"
                      className="input input-sm"
                      value={row.maxMm}
                      onChange={(e) => updateRule(i, { maxMm: Number(e.target.value) })}
                    />
                  </td>
                  <td style={{ padding: 8 }}>
                    <input
                      type="number"
                      className="input input-sm"
                      value={row.offsetFromEdgeMm}
                      onChange={(e) => updateRule(i, { offsetFromEdgeMm: Number(e.target.value) })}
                    />
                  </td>
                  <td style={{ padding: 8 }}>
                    <button type="button" className="button button-ghost button-sm" onClick={() => removeRule(i)}>
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className="button button-sm" style={{ marginTop: 12 }} onClick={addRule}>
          Adicionar linha
        </button>
      </Panel>

      <Panel title="Opções futuras">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <input
              type="checkbox"
              checked={draft.enableShelfHoles}
              onChange={(e) => setDraft((p) => ({ ...p, enableShelfHoles: e.target.checked }))}
            />
            Furos de prateleira (reservado)
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <input
              type="checkbox"
              checked={draft.enableDivSepCombinations}
              onChange={(e) => setDraft((p) => ({ ...p, enableDivSepCombinations: e.target.checked }))}
            />
            Combinações DIV + SEP (reservado)
          </label>
        </div>
      </Panel>
    </div>
  );
}
