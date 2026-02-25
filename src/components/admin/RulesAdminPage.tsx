/**
 * Página de administração de Regras Dinâmicas.
 * Edita as regras do perfil ativo (project.rules).
 */

import { useEffect, useState } from "react";
import { useProject } from "../../context/useProject";
import { defaultRulesConfig } from "../../core/rules/rulesConfig";
import type { RulesConfig, PortaRange, PeRange } from "../../core/rules/rulesConfig";
import Panel from "../ui/Panel";
import { useToast } from "../../context/ToastContext";

export default function RulesAdminPage() {
  const { showToast } = useToast();
  const { project, actions } = useProject();
  const perfilAtivoId = project.rulesProfiles.perfilAtivoId;
  const [rules, setRules] = useState<RulesConfig>(project.rules);
  const [isSaved, setIsSaved] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  useEffect(() => {
    setRules(project.rules);
  }, [project.rules, perfilAtivoId]);

  const handleSave = () => {
    actions.updateRulesInProfile(perfilAtivoId, rules);
    setIsSaved(true);
    showToast("Regras do perfil guardadas com sucesso.", "info");
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleReset = () => {
    if (!confirmResetOpen) return;
    const defaults = JSON.parse(JSON.stringify(defaultRulesConfig)) as RulesConfig;
    setRules(defaults);
    actions.updateRulesInProfile(perfilAtivoId, defaults);
    setConfirmResetOpen(false);
    showToast("Regras repostas para o padrão.", "info");
  };

  const updatePortaRange = (index: number, field: keyof PortaRange, value: number) => {
    const nextRanges = [...rules.portas.ranges];
    nextRanges[index] = { ...nextRanges[index], [field]: value };
    setRules((prev) => ({ ...prev, portas: { ...prev.portas, ranges: nextRanges } }));
  };

  const addPortaRange = () => {
    const last = rules.portas.ranges[rules.portas.ranges.length - 1];
    const newRange: PortaRange = { min: (last?.max ?? 0) + 1, max: (last?.max ?? 0) + 50, dobradicas: 2 };
    setRules((prev) => ({ ...prev, portas: { ...prev.portas, ranges: [...prev.portas.ranges, newRange] } }));
  };

  const removePortaRange = (index: number) => {
    if (rules.portas.ranges.length <= 1) {
      showToast("Deve existir pelo menos um range.", "warning");
      return;
    }
    const next = rules.portas.ranges.filter((_, i) => i !== index);
    setRules((prev) => ({ ...prev, portas: { ...prev.portas, ranges: next } }));
  };

  const updatePeRange = (index: number, field: keyof PeRange, value: number) => {
    const nextRanges = [...rules.pes.ranges];
    nextRanges[index] = { ...nextRanges[index], [field]: value };
    setRules((prev) => ({ ...prev, pes: { ...prev.pes, ranges: nextRanges } }));
  };

  const addPeRange = () => {
    const last = rules.pes.ranges[rules.pes.ranges.length - 1];
    const newRange: PeRange = { min: (last?.max ?? 0) + 1, max: (last?.max ?? 0) + 50, pes: 4 };
    setRules((prev) => ({ ...prev, pes: { ...prev.pes, ranges: [...prev.pes.ranges, newRange] } }));
  };

  const removePeRange = (index: number) => {
    if (rules.pes.ranges.length <= 1) {
      showToast("Deve existir pelo menos um range.", "warning");
      return;
    }
    const next = rules.pes.ranges.filter((_, i) => i !== index);
    setRules((prev) => ({ ...prev, pes: { ...prev.pes, ranges: next } }));
  };

  const updateTecnico = <K extends keyof RulesConfig["furos"]["tecnicos"]>(
    key: K,
    patch: Partial<RulesConfig["furos"]["tecnicos"][K]>
  ) => {
    setRules((prev) => ({
      ...prev,
      furos: {
        ...prev.furos,
        tecnicos: {
          ...prev.furos.tecnicos,
          [key]: {
            ...prev.furos.tecnicos[key],
            ...patch,
          },
        },
      },
    }));
  };

  return (
    <div style={{ padding: 24, overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Regras do Perfil Ativo</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setConfirmResetOpen(true)} className="button button-ghost">
            Repor Defaults
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="button button-primary"
            style={{ background: isSaved ? "rgba(34,197,94,0.85)" : undefined }}
          >
            {isSaved ? "✓ Guardado" : "Guardar"}
          </button>
        </div>
      </div>

      {confirmResetOpen && (
        <Panel title="Confirmar reposição">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Repor as regras deste perfil para os valores padrão?
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="button" onClick={handleReset}>
                Confirmar
              </button>
              <button type="button" className="button button-ghost" onClick={() => setConfirmResetOpen(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </Panel>
      )}

      <div style={{ maxWidth: 900, display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Regras da Porta */}
        <Panel title="Regras da Porta" description="Altura (cm) → Número de dobradiças">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rules.portas.ranges.map((range, index) => (
              <div key={index} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}>
                <input
                  type="number"
                  value={range.min}
                  onChange={(e) => updatePortaRange(index, "min", Number(e.target.value))}
                  placeholder="Min"
                  className="input input-xs"
                  style={{ width: 80 }}
                />
                <span>–</span>
                <input
                  type="number"
                  value={range.max}
                  onChange={(e) => updatePortaRange(index, "max", Number(e.target.value))}
                  placeholder="Max"
                  className="input input-xs"
                  style={{ width: 80 }}
                />
                <span>cm →</span>
                <input
                  type="number"
                  value={range.dobradicas}
                  onChange={(e) => updatePortaRange(index, "dobradicas", Number(e.target.value))}
                  placeholder="Dobradiças"
                  className="input input-xs"
                  style={{ width: 80 }}
                />
                <button type="button" onClick={() => removePortaRange(index)} className="button button-ghost" style={{ padding: "4px 8px" }}>
                  Remover
                </button>
              </div>
            ))}
            <button type="button" onClick={addPortaRange} className="button button-ghost" style={{ marginTop: 4 }}>
              + Adicionar range
            </button>
          </div>
        </Panel>

        <Panel
          title="Configuração de Portas e Gavetas (Novo Sistema)"
          description="Parâmetros globais do sistema por camadas. Integração ativa com DoorsLayer/DrawersLayer."
        >
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Esta secção permanece como fonte de configuração global e está ligada ao novo sistema de camadas.
          </div>
        </Panel>

        {/* Regras da Prateleira */}
        <Panel title="Regras da Prateleira" description="Suportes por prateleira">
          <div className="panel-field-row">
            <span className="panel-label">Suportes por prateleira:</span>
            <input
              type="number"
              value={rules.prateleiras.suportesPorPrateleira}
              onChange={(e) => setRules((prev) => ({ ...prev, prateleiras: { ...prev.prateleiras, suportesPorPrateleira: Number(e.target.value) } }))}
              className="input input-xs"
              style={{ width: 80 }}
            />
          </div>
        </Panel>

        {/* Regras dos Pés */}
        <Panel title="Regras dos Pés" description="Largura (cm) → Número de pés">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rules.pes.ranges.map((range, index) => (
              <div key={index} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}>
                <input
                  type="number"
                  value={range.min}
                  onChange={(e) => updatePeRange(index, "min", Number(e.target.value))}
                  placeholder="Min"
                  className="input input-xs"
                  style={{ width: 80 }}
                />
                <span>–</span>
                <input
                  type="number"
                  value={range.max}
                  onChange={(e) => updatePeRange(index, "max", Number(e.target.value))}
                  placeholder="Max"
                  className="input input-xs"
                  style={{ width: 80 }}
                />
                <span>cm →</span>
                <input
                  type="number"
                  value={range.pes}
                  onChange={(e) => updatePeRange(index, "pes", Number(e.target.value))}
                  placeholder="Pés"
                  className="input input-xs"
                  style={{ width: 80 }}
                />
                <button type="button" onClick={() => removePeRange(index)} className="button button-ghost" style={{ padding: "4px 8px" }}>
                  Remover
                </button>
              </div>
            ))}
            <button type="button" onClick={addPeRange} className="button button-ghost" style={{ marginTop: 4 }}>
              + Adicionar range
            </button>
          </div>
        </Panel>

        {/* Regras de Altura */}
        <Panel title="Regras de Altura" description="Divisor transversal">
          <div className="panel-field-row">
            <span className="panel-label">Altura mínima para divisor (cm):</span>
            <input
              type="number"
              value={rules.altura.divisorTransversalMin}
              onChange={(e) => setRules((prev) => ({ ...prev, altura: { ...prev.altura, divisorTransversalMin: Number(e.target.value) } }))}
              className="input input-xs"
              style={{ width: 80 }}
            />
          </div>
        </Panel>

        {/* Regras de Largura */}
        <Panel title="Regras de Largura" description="Divisor longitudinal">
          <div className="panel-field-row">
            <span className="panel-label">Largura mínima para divisor (cm):</span>
            <input
              type="number"
              value={rules.largura.divisorLongitudinalMin}
              onChange={(e) => setRules((prev) => ({ ...prev, largura: { ...prev.largura, divisorLongitudinalMin: Number(e.target.value) } }))}
              className="input input-xs"
              style={{ width: 80 }}
            />
          </div>
        </Panel>

        {/* Regras de Furos */}
        <Panel title="Regras de Furos" description="Furação para prateleiras (mm)">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="panel-field-row">
              <span className="panel-label">Margem topo (mm):</span>
              <input
                type="number"
                value={rules.furos.margemTopo}
                onChange={(e) => setRules((prev) => ({ ...prev, furos: { ...prev.furos, margemTopo: Number(e.target.value) } }))}
                className="input input-xs"
                style={{ width: 80 }}
              />
            </div>
            <div className="panel-field-row">
              <span className="panel-label">Margem base (mm):</span>
              <input
                type="number"
                value={rules.furos.margemBase}
                onChange={(e) => setRules((prev) => ({ ...prev, furos: { ...prev.furos, margemBase: Number(e.target.value) } }))}
                className="input input-xs"
                style={{ width: 80 }}
              />
            </div>
            <div className="panel-field-row">
              <span className="panel-label">Recuo borda (mm):</span>
              <input
                type="number"
                value={rules.furos.recuoBorda}
                onChange={(e) => setRules((prev) => ({ ...prev, furos: { ...prev.furos, recuoBorda: Number(e.target.value) } }))}
                className="input input-xs"
                style={{ width: 80 }}
              />
            </div>
            <div className="panel-field-row">
              <span className="panel-label">Distância entre furos (mm):</span>
              <input
                type="number"
                value={rules.furos.distanciaEntreFuros}
                onChange={(e) => setRules((prev) => ({ ...prev, furos: { ...prev.furos, distanciaEntreFuros: Number(e.target.value) } }))}
                className="input input-xs"
                style={{ width: 80 }}
              />
            </div>
            <div className="panel-field-row">
              <span className="panel-label">Profundidade furo (mm):</span>
              <input
                type="number"
                value={rules.furos.profundidadeFuro}
                onChange={(e) => setRules((prev) => ({ ...prev, furos: { ...prev.furos, profundidadeFuro: Number(e.target.value) } }))}
                className="input input-xs"
                style={{ width: 80 }}
              />
            </div>
            <div className="panel-field-row">
              <span className="panel-label">Diâmetro furo (mm):</span>
              <input
                type="number"
                value={rules.furos.diametroFuro}
                onChange={(e) => setRules((prev) => ({ ...prev, furos: { ...prev.furos, diametroFuro: Number(e.target.value) } }))}
                className="input input-xs"
                style={{ width: 80 }}
              />
            </div>
          </div>
        </Panel>

        <Panel title="Furação Técnica – Component Types" description="Configuração completa dos tipos de furação técnica">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>Cavilha</div>
              <label style={{ fontSize: 12 }}><input type="checkbox" checked={rules.furos.tecnicos.cavilha.enabled} onChange={(e) => updateTecnico("cavilha", { enabled: e.target.checked })} /> Ativar</label>
              <div className="form-grid" style={{ gridTemplateColumns: "repeat(5, minmax(120px, 1fr))", gap: 8, marginTop: 8 }}>
                <label style={{ fontSize: 12 }}>Dist. frente <input className="input input-xs" type="number" value={rules.furos.tecnicos.cavilha.distanciaFrente} onChange={(e) => updateTecnico("cavilha", { distanciaFrente: Number(e.target.value) })} /></label>
                <label style={{ fontSize: 12 }}>Dist. fundo <input className="input input-xs" type="number" value={rules.furos.tecnicos.cavilha.distanciaFundo} onChange={(e) => updateTecnico("cavilha", { distanciaFundo: Number(e.target.value) })} /></label>
                <label style={{ fontSize: 12 }}>Offset lateral <input className="input input-xs" type="number" value={rules.furos.tecnicos.cavilha.offsetLateral} onChange={(e) => updateTecnico("cavilha", { offsetLateral: Number(e.target.value) })} /></label>
                <label style={{ fontSize: 12 }}>Diâmetro <input className="input input-xs" type="number" value={rules.furos.tecnicos.cavilha.diametro} onChange={(e) => updateTecnico("cavilha", { diametro: Number(e.target.value) })} /></label>
                <label style={{ fontSize: 12 }}>Profundidade <input className="input input-xs" type="number" value={rules.furos.tecnicos.cavilha.profundidade} onChange={(e) => updateTecnico("cavilha", { profundidade: Number(e.target.value) })} /></label>
              </div>
              <div style={{ marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12 }}>
                <label><input type="checkbox" checked={rules.furos.tecnicos.cavilha.aplicarEm.cima} onChange={(e) => updateTecnico("cavilha", { aplicarEm: { ...rules.furos.tecnicos.cavilha.aplicarEm, cima: e.target.checked } })} /> cima</label>
                <label><input type="checkbox" checked={rules.furos.tecnicos.cavilha.aplicarEm.fundo} onChange={(e) => updateTecnico("cavilha", { aplicarEm: { ...rules.furos.tecnicos.cavilha.aplicarEm, fundo: e.target.checked } })} /> fundo</label>
                <label><input type="checkbox" checked={rules.furos.tecnicos.cavilha.aplicarEm.lateralEsquerda} onChange={(e) => updateTecnico("cavilha", { aplicarEm: { ...rules.furos.tecnicos.cavilha.aplicarEm, lateralEsquerda: e.target.checked } })} /> lateral esquerda</label>
                <label><input type="checkbox" checked={rules.furos.tecnicos.cavilha.aplicarEm.lateralDireita} onChange={(e) => updateTecnico("cavilha", { aplicarEm: { ...rules.furos.tecnicos.cavilha.aplicarEm, lateralDireita: e.target.checked } })} /> lateral direita</label>
              </div>
            </div>

            <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>Parafuso</div>
              <label style={{ fontSize: 12 }}><input type="checkbox" checked={rules.furos.tecnicos.parafuso.enabled} onChange={(e) => updateTecnico("parafuso", { enabled: e.target.checked })} /> Ativar</label>
              <div className="form-grid" style={{ gridTemplateColumns: "repeat(5, minmax(120px, 1fr))", gap: 8, marginTop: 8 }}>
                <label style={{ fontSize: 12 }}>Dist. frente <input className="input input-xs" type="number" value={rules.furos.tecnicos.parafuso.distanciaFrente} onChange={(e) => updateTecnico("parafuso", { distanciaFrente: Number(e.target.value) })} /></label>
                <label style={{ fontSize: 12 }}>Dist. fundo <input className="input input-xs" type="number" value={rules.furos.tecnicos.parafuso.distanciaFundo} onChange={(e) => updateTecnico("parafuso", { distanciaFundo: Number(e.target.value) })} /></label>
                <label style={{ fontSize: 12 }}>Offset cavilha <input className="input input-xs" type="number" value={rules.furos.tecnicos.parafuso.offsetDaCavilha} onChange={(e) => updateTecnico("parafuso", { offsetDaCavilha: Number(e.target.value) })} /></label>
                <label style={{ fontSize: 12 }}>Diâmetro <input className="input input-xs" type="number" value={rules.furos.tecnicos.parafuso.diametro} onChange={(e) => updateTecnico("parafuso", { diametro: Number(e.target.value) })} /></label>
                <label style={{ fontSize: 12 }}>Profundidade <input className="input input-xs" type="number" value={rules.furos.tecnicos.parafuso.profundidade} onChange={(e) => updateTecnico("parafuso", { profundidade: Number(e.target.value) })} /></label>
              </div>
              <div style={{ marginTop: 8, display: "flex", gap: 12, fontSize: 12 }}>
                <label><input type="checkbox" checked={rules.furos.tecnicos.parafuso.aplicarEm.cima} onChange={(e) => updateTecnico("parafuso", { aplicarEm: { ...rules.furos.tecnicos.parafuso.aplicarEm, cima: e.target.checked } })} /> cima</label>
                <label><input type="checkbox" checked={rules.furos.tecnicos.parafuso.aplicarEm.fundo} onChange={(e) => updateTecnico("parafuso", { aplicarEm: { ...rules.furos.tecnicos.parafuso.aplicarEm, fundo: e.target.checked } })} /> fundo</label>
              </div>
            </div>

            <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>Dobradiça</div>
              <label style={{ fontSize: 12 }}><input type="checkbox" checked={rules.furos.tecnicos.dobradica.enabled} onChange={(e) => updateTecnico("dobradica", { enabled: e.target.checked })} /> Ativar</label>
              <div className="form-grid" style={{ gridTemplateColumns: "repeat(6, minmax(120px, 1fr))", gap: 8, marginTop: 8 }}>
                <label style={{ fontSize: 12 }}>Diâm. taça <input className="input input-xs" type="number" value={rules.furos.tecnicos.dobradica.diametro} onChange={(e) => updateTecnico("dobradica", { diametro: Number(e.target.value) })} /></label>
                <label style={{ fontSize: 12 }}>Prof. taça <input className="input input-xs" type="number" value={rules.furos.tecnicos.dobradica.profundidade} onChange={(e) => updateTecnico("dobradica", { profundidade: Number(e.target.value) })} /></label>
                <label style={{ fontSize: 12 }}>Dist. borda <input className="input input-xs" type="number" value={rules.furos.tecnicos.dobradica.distanciaBordaLateral} onChange={(e) => updateTecnico("dobradica", { distanciaBordaLateral: Number(e.target.value) })} /></label>
                <label style={{ fontSize: 12 }}>Offset sup. <input className="input input-xs" type="number" value={rules.furos.tecnicos.dobradica.offsetSuperior} onChange={(e) => updateTecnico("dobradica", { offsetSuperior: Number(e.target.value) })} /></label>
                <label style={{ fontSize: 12 }}>Offset inf. <input className="input input-xs" type="number" value={rules.furos.tecnicos.dobradica.offsetInferior} onChange={(e) => updateTecnico("dobradica", { offsetInferior: Number(e.target.value) })} /></label>
                <label style={{ fontSize: 12 }}>Qtd/porta <input className="input input-xs" type="number" value={rules.furos.tecnicos.dobradica.numeroPorPorta} onChange={(e) => updateTecnico("dobradica", { numeroPorPorta: Number(e.target.value) })} /></label>
              </div>
            </div>

            <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>Corrediça</div>
              <label style={{ fontSize: 12 }}><input type="checkbox" checked={rules.furos.tecnicos.corredica.enabled} onChange={(e) => updateTecnico("corredica", { enabled: e.target.checked })} /> Ativar</label>
              <div className="form-grid" style={{ gridTemplateColumns: "repeat(5, minmax(120px, 1fr))", gap: 8, marginTop: 8 }}>
                <label style={{ fontSize: 12 }}>Altura (mm) <input className="input input-xs" type="number" value={rules.furos.tecnicos.corredica.alturaRelativaFundo} onChange={(e) => updateTecnico("corredica", { alturaRelativaFundo: Number(e.target.value) })} /></label>
                <label style={{ fontSize: 12 }}>Dist. frente <input className="input input-xs" type="number" value={rules.furos.tecnicos.corredica.offsetFrente} onChange={(e) => updateTecnico("corredica", { offsetFrente: Number(e.target.value) })} /></label>
                <label style={{ fontSize: 12 }}>Dist. fundo <input className="input input-xs" type="number" value={rules.furos.tecnicos.corredica.offsetFundo} onChange={(e) => updateTecnico("corredica", { offsetFundo: Number(e.target.value) })} /></label>
                <label style={{ fontSize: 12 }}>Offset vertical <input className="input input-xs" type="number" value={rules.furos.tecnicos.corredica.offsetVerticalAdicional} onChange={(e) => updateTecnico("corredica", { offsetVerticalAdicional: Number(e.target.value) })} /></label>
                <label style={{ fontSize: 12 }}>Diâmetro <input className="input input-xs" type="number" value={rules.furos.tecnicos.corredica.diametro} onChange={(e) => updateTecnico("corredica", { diametro: Number(e.target.value) })} /></label>
              </div>
            </div>

            <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>Prateleira</div>
              <label style={{ fontSize: 12 }}><input type="checkbox" checked={rules.furos.tecnicos.prateleira.enabled} onChange={(e) => updateTecnico("prateleira", { enabled: e.target.checked })} /> Ativar</label>
              <div className="form-grid" style={{ gridTemplateColumns: "repeat(6, minmax(120px, 1fr))", gap: 8, marginTop: 8 }}>
                <label style={{ fontSize: 12 }}>Diâmetro <input className="input input-xs" type="number" value={rules.furos.tecnicos.prateleira.diametro} onChange={(e) => updateTecnico("prateleira", { diametro: Number(e.target.value) })} /></label>
                <label style={{ fontSize: 12 }}>Profundidade <input className="input input-xs" type="number" value={rules.furos.tecnicos.prateleira.profundidade} onChange={(e) => updateTecnico("prateleira", { profundidade: Number(e.target.value) })} /></label>
                <label style={{ fontSize: 12 }}>Espaçamento <input className="input input-xs" type="number" value={rules.furos.tecnicos.prateleira.espacamento} onChange={(e) => updateTecnico("prateleira", { espacamento: Number(e.target.value) })} /></label>
                <label style={{ fontSize: 12 }}>Recuo superior <input className="input input-xs" type="number" value={rules.furos.tecnicos.prateleira.margemTopo} onChange={(e) => updateTecnico("prateleira", { margemTopo: Number(e.target.value) })} /></label>
                <label style={{ fontSize: 12 }}>Recuo inferior <input className="input input-xs" type="number" value={rules.furos.tecnicos.prateleira.margemBase} onChange={(e) => updateTecnico("prateleira", { margemBase: Number(e.target.value) })} /></label>
                <label style={{ fontSize: 12 }}>Furos/coluna <input className="input input-xs" type="number" value={rules.furos.tecnicos.prateleira.numeroFurosPorColuna} onChange={(e) => updateTecnico("prateleira", { numeroFurosPorColuna: Number(e.target.value) })} /></label>
              </div>
            </div>
          </div>
        </Panel>

        {/* Regras de Madeira / Estrutura */}
        <Panel title="Regras de Madeira / Estrutura" description="COSTA, laterais, profundidade">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="panel-field-row">
              <span className="panel-label">Espessura COSTA (mm):</span>
              <input
                type="number"
                value={rules.madeira.espessuraCosta}
                onChange={(e) => setRules((prev) => ({ ...prev, madeira: { ...prev.madeira, espessuraCosta: Number(e.target.value) } }))}
                className="input input-xs"
                style={{ width: 80 }}
              />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
              <input
                type="checkbox"
                checked={rules.madeira.calcularAlturaLaterais}
                onChange={(e) => setRules((prev) => ({ ...prev, madeira: { ...prev.madeira, calcularAlturaLaterais: e.target.checked } }))}
              />
              Calcular altura laterais = altura_total - (espessura_cima + espessura_fundo)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
              <input
                type="checkbox"
                checked={rules.madeira.profundidadeFixa}
                onChange={(e) => setRules((prev) => ({ ...prev, madeira: { ...prev.madeira, profundidadeFixa: e.target.checked } }))}
              />
              Profundidade fixa (não muda com dimensões)
            </label>
          </div>
        </Panel>

        <Panel title="Etiquetas Oficiais (Brother QL-1060N)" description="Configuração da etiqueta 100x50mm para impressão industrial">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="form-grid" style={{ gridTemplateColumns: "repeat(4, minmax(140px, 1fr))", gap: 8 }}>
              <label style={{ fontSize: 12 }}>Largura (mm)
                <input className="input input-xs" type="number" value={rules.etiqueta.larguraMm} onChange={(e) => setRules((prev) => ({ ...prev, etiqueta: { ...prev.etiqueta, larguraMm: Number(e.target.value) } }))} />
              </label>
              <label style={{ fontSize: 12 }}>Altura (mm)
                <input className="input input-xs" type="number" value={rules.etiqueta.alturaMm} onChange={(e) => setRules((prev) => ({ ...prev, etiqueta: { ...prev.etiqueta, alturaMm: Number(e.target.value) } }))} />
              </label>
              <label style={{ fontSize: 12 }}>Borda (px)
                <input className="input input-xs" type="number" value={rules.etiqueta.bordaPx} onChange={(e) => setRules((prev) => ({ ...prev, etiqueta: { ...prev.etiqueta, bordaPx: Number(e.target.value) } }))} />
              </label>
              <label style={{ fontSize: 12 }}>Margem interna (mm)
                <input className="input input-xs" type="number" value={rules.etiqueta.margemInternaMm} onChange={(e) => setRules((prev) => ({ ...prev, etiqueta: { ...prev.etiqueta, margemInternaMm: Number(e.target.value) } }))} />
              </label>
              <label style={{ fontSize: 12 }}>Tamanho QR (mm)
                <input className="input input-xs" type="number" value={rules.etiqueta.tamanhoQr} onChange={(e) => setRules((prev) => ({ ...prev, etiqueta: { ...prev.etiqueta, tamanhoQr: Number(e.target.value) } }))} />
              </label>
              <label style={{ fontSize: 12 }}>Tamanho texto
                <input className="input input-xs" type="number" value={rules.etiqueta.tamanhoTexto} onChange={(e) => setRules((prev) => ({ ...prev, etiqueta: { ...prev.etiqueta, tamanhoTexto: Number(e.target.value) } }))} />
              </label>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12 }}>
              <label><input type="checkbox" checked={rules.etiqueta.mostrarLogo} onChange={(e) => setRules((prev) => ({ ...prev, etiqueta: { ...prev.etiqueta, mostrarLogo: e.target.checked } }))} /> Mostrar logo</label>
              <label><input type="checkbox" checked={rules.etiqueta.mostrarMaterial} onChange={(e) => setRules((prev) => ({ ...prev, etiqueta: { ...prev.etiqueta, mostrarMaterial: e.target.checked } }))} /> Mostrar material</label>
              <label><input type="checkbox" checked={rules.etiqueta.mostrarDimensoes} onChange={(e) => setRules((prev) => ({ ...prev, etiqueta: { ...prev.etiqueta, mostrarDimensoes: e.target.checked } }))} /> Mostrar dimensões</label>
              <label><input type="checkbox" checked={rules.etiqueta.mostrarReferencia} onChange={(e) => setRules((prev) => ({ ...prev, etiqueta: { ...prev.etiqueta, mostrarReferencia: e.target.checked } }))} /> Mostrar referência</label>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
