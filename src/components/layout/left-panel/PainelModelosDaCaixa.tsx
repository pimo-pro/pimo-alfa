/**
 * Painel Modelos = Instâncias dentro da caixa atual.
 * Mostra apenas: lista de instâncias (modelInstanceId), nome/material/categoria editáveis,
 * remover, RuleViolationsAlert, LayoutWarningsAlert, secção Layout (Auto‑Organizar, Snap, Reset).
 * Sem catálogo CAD nem "adicionar modelo" (isso fica no tab Móveis).
 */

import { useState } from "react";
import { useProject } from "../../../context/useProject";
import { usePimoViewerContext } from "../../../hooks/usePimoViewerContext";
import Panel from "../../ui/Panel";
import { mmToM } from "../../../utils/units";
import RuleViolationsAlert from "../../ui/RuleViolationsAlert";
import LayoutWarningsAlert from "../../ui/LayoutWarningsAlert";
import { getViewerMaterialId } from "../../../core/materials/service";
import { listOfficialMaterials } from "../../../core/materials/materials.api";
import { Icon } from "@/components/icons";

const OFFICIAL_WOOD_OPTIONS = listOfficialMaterials();
const VISUAL_WOOD_OPTIONS = OFFICIAL_WOOD_OPTIONS.filter((m) => m.visual);
export default function PainelModelosDaCaixa() {
  const { project, actions } = useProject();
  const { viewerApi } = usePimoViewerContext();
  const selectedBox = project.workspaceBoxes.find(
    (box) => box.id === project.selectedWorkspaceBoxId
  );
  const [accordionOpen, setAccordionOpen] = useState(false);

  if (!selectedBox) {
    return (
      <aside className="panel-content panel-content--side">
        <div className="section-title">Modelos</div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
          Selecione uma caixa no tab <strong>Calculadora</strong> para gerir os modelos dentro dela.
        </p>
      </aside>
    );
  }

  return (
    <aside className="panel-content panel-content--side">
      <div className="section-title">Modelos na caixa</div>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
        Configuração do módulo <strong>{selectedBox.nome}</strong>. O fluxo CAD/GLB legado foi removido.
      </p>

      <Panel
        title="Opções da caixa"
        description="Tipo de projeto, material, borda e fundo."
      >
        <button
          type="button"
          onClick={() => setAccordionOpen((o) => !o)}
          style={{
            width: "100%",
            padding: "8px 10px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            color: "var(--text-main)",
            fontSize: 12,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span
            aria-hidden
            style={{
              display: "inline-flex",
              marginRight: 6,
              transform: accordionOpen ? "rotate(90deg)" : undefined,
            }}
          >
            <Icon name="chevronRight" size={14} aria-hidden />
          </span>
          {accordionOpen ? "Ocultar" : "Mostrar"} tipo, material, borda e fundo
        </button>
        {accordionOpen && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Tipo de Projeto</div>
              <select
                value={project.tipoProjeto}
                onChange={(e) => {
                  const value = e.target.value;
                  actions.setTipoProjeto(value);
                  if (value === "Caixa com porta") actions.setPortaTipo("porta_simples");
                  else if (value === "Guarda-roupa com porta de correr") actions.setPortaTipo("porta_correr");
                  else if (value === "Caixa sem porta") actions.setPortaTipo("sem_porta");
                }}
                className="select"
                style={{ width: "100%" }}
              >
                <option value="Caixa sem porta">Caixa sem porta</option>
                <option value="Caixa com porta">Caixa com porta</option>
                <option value="Guarda-roupa com porta de correr">Guarda-roupa com porta de correr</option>
                <option value="Caixa de canto esquerda">Caixa de canto esquerda</option>
                <option value="Caixa de canto direita">Caixa de canto direita</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Material</div>
              <select
                value={project.material.tipo}
                onChange={(e) => {
                  const value = e.target.value;
                  actions.setMaterial({ ...project.material, tipo: value });
                  if (project.selectedWorkspaceBoxId) {
                    viewerApi?.updateBox(project.selectedWorkspaceBoxId, {
                      materialName: getViewerMaterialId(value),
                    });
                  }
                }}
                className="select"
                style={{ width: "100%" }}
              >
                {VISUAL_WOOD_OPTIONS.map((m) => (
                  <option key={m.canonicalId} value={m.canonicalId}>{m.label}</option>
                ))}
              </select>
              <select
                value={selectedBox?.espessura ?? project.material.espessura}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  actions.setEspessura(value);
                  if (project.selectedWorkspaceBoxId) viewerApi?.updateBox(project.selectedWorkspaceBoxId, { thickness: mmToM(value) });
                }}
                className="select"
                style={{ width: "100%", marginTop: 4 }}
              >
                <option value={15}>15mm</option>
                <option value={18}>18mm</option>
                <option value={19}>19mm</option>
                <option value={25}>25mm</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Tipo de borda</div>
              <select
                value={selectedBox?.tipoBorda ?? "reta"}
                onChange={(e) => actions.setTipoBorda(e.target.value as "reta" | "biselada" | "arredondada")}
                className="select"
                style={{ width: "100%" }}
              >
                <option value="reta">Reta</option>
                <option value="biselada">Biselada</option>
                <option value="arredondada">Arredondada</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Tipo de fundo</div>
              <select
                value={selectedBox?.tipoFundo ?? "recuado"}
                onChange={(e) => actions.setTipoFundo(e.target.value as "integrado" | "recuado" | "sem_fundo")}
                className="select"
                style={{ width: "100%" }}
              >
                <option value="integrado">Integrado</option>
                <option value="recuado">Recuado</option>
                <option value="sem_fundo">Sem fundo</option>
              </select>
            </div>
          </div>
        )}
      </Panel>

      <RuleViolationsAlert
        violations={project.ruleViolations ?? []}
        boxId={project.selectedWorkspaceBoxId}
      />

      <LayoutWarningsAlert
        warnings={project.layoutWarnings ?? { collisions: [], outOfBounds: [] }}
        boxId={project.selectedWorkspaceBoxId}
      />

      <Panel title="Instâncias" description="Integração CAD/GLB descontinuada.">
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
          A caixa usa apenas o motor paramétrico. Utilize o painel <strong>Móveis</strong> para adicionar módulos do catálogo.
        </p>
      </Panel>
    </aside>
  );
}
