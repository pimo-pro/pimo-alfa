import { useMemo } from "react";
import { useProject } from "../../../context/useProject";
import UnifiedPopover, { StepperPopover } from "../../ui/UnifiedPopover";
import { usePimoViewerContext } from "../../../hooks/usePimoViewerContext";
import Panel from "../../ui/Panel";
import { NumericInput } from "../../ui/NumericInput";
import BoxLayersPanel from "./BoxLayersPanel";
import { useToast } from "../../../context/ToastContext";
import { getMaterialByIdOrLabel } from "../../../core/materials";
import type { UseMaterialsForPickerResult } from "./hooks/useMaterialsForPicker";
import { isPiBaseCabinetId } from "../../../data/moveisUnificados/pi/models";
import { computeBoxProfundidadeLeituraMm } from "../../../utils/boxProfundidadeLeituraUi";
import { Icon } from "@/components/icons";
import SelecionarMaterialSection from "../../settings/material/SelecionarMaterialSection";

export type HomeLeftPanelSelectedProps = {
  materialsPicker: UseMaterialsForPickerResult;
};

export function HomeLeftPanelSelected({ materialsPicker }: HomeLeftPanelSelectedProps) {
  const { project, actions } = useProject();
  const { showToast } = useToast();
  const selectedBox = project.workspaceBoxes.find(
    (box) => box.id === project.selectedWorkspaceBoxId
  );
  const selectedPrateleiras = selectedBox?.prateleiras ?? 0;
  const selectedGavetas = selectedBox?.gavetas ?? 0;
  void materialsPicker;
  const { viewerApi } = usePimoViewerContext();

  const profundidadeLeitura = useMemo(
    () => (selectedBox ? computeBoxProfundidadeLeituraMm(selectedBox, project.rules) : null),
    [selectedBox, project.rules]
  );

  return (
    <div className="left-panel-content">
      <div className="left-panel-scroll">
        <aside className="panel-content panel-content--side">
          <div className="design-panel-header">
            <div className="section-title">Início</div>
            <p className="design-panel-subtitle">Controles principais da caixa selecionada e definição inicial do projeto.</p>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
            Crie novas caixas a partir daqui para começar o seu projeto.
          </p>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => actions.addWorkspaceBox()}
              className="button button-primary"
              style={{ flex: 1, minWidth: 140 }}
            >
              Adicionar Caixote
            </button>
            {selectedBox && (
              <button
                type="button"
                onClick={() => actions.duplicateWorkspaceBox()}
                className="button button-ghost"
                style={{ flex: 1, minWidth: 140 }}
              >
                Duplicar Caixa
              </button>
            )}
          </div>

          {selectedBox && (
            <Panel title="NOME DA CAIXA">
              <input
                type="text"
                value={selectedBox.nome}
                onChange={(e) => actions.setWorkspaceBoxNome(selectedBox.id, e.target.value)}
                placeholder="Nome da caixa"
                className="input input-sm"
              />
            </Panel>
          )}

          {!selectedBox && (
            <div className="section-title" style={{ marginTop: 20 }}>Definições</div>
          )}

          {!selectedBox && (
            <Panel title="NOME DE PROJETO">
              <input
                type="text"
                value={project.projectName}
                onChange={(e) => actions.setProjectName(e.target.value)}
                placeholder="Nome do projeto"
                className="input input-sm"
              />
            </Panel>
          )}

          {!selectedBox && (
            <Panel title="Material do projeto" description="Material padrão (somente leitura)">
              <div style={{ fontSize: 12, color: "var(--text-main)" }}>
                {project.materialId
                  ? (getMaterialByIdOrLabel(project.materialId)?.label ?? project.material.tipo)
                  : project.material.tipo}
              </div>
            </Panel>
          )}

          <Panel title="Dimensões" description="Valores em milímetros">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div className="panel-field-row">
                <span className="panel-label">Largura:</span>
                <NumericInput
                  value={selectedBox?.dimensoes.largura ?? project.dimensoes.largura}
                  onChange={(value) => {
                    actions.setDimensoes({ largura: value });
                  }}
                  className="input input-xs"
                  unit="mm"
                />
              </div>
              <div className="panel-field-row">
                <span className="panel-label">Altura:</span>
                <NumericInput
                  value={selectedBox?.dimensoes.altura ?? project.dimensoes.altura}
                  onChange={(value) => {
                    actions.setDimensoes({ altura: value });
                  }}
                  className="input input-xs"
                  unit="mm"
                />
              </div>
              <div className="panel-field-row">
                <span className="panel-label">Profundidade:</span>
                <NumericInput
                  value={selectedBox?.dimensoes.profundidade ?? project.dimensoes.profundidade}
                  onChange={(value) => {
                    actions.setDimensoes({ profundidade: value });
                  }}
                  className="input input-xs"
                  unit="mm"
                />
              </div>
            </div>
          </Panel>

          {selectedBox && profundidadeLeitura && (
            <details
              style={{
                marginTop: 10,
                padding: "12px 12px",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                fontSize: 12,
              }}
            >
              <summary
                style={{
                  cursor: "pointer",
                  fontWeight: 600,
                  color: "var(--text-main)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Icon name="ruler" size={16} aria-hidden />
                Profundidade da caixa (referência)
              </summary>
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    paddingLeft: 10,
                    borderLeft: "3px solid #38bdf8",
                    color: "var(--text-main)",
                    lineHeight: 1.45,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Externa
                  </div>
                  <div style={{ fontWeight: 600 }}>{profundidadeLeitura.profundidadeExternaMm} mm</div>
                </div>
                <div
                  style={{
                    paddingLeft: 10,
                    borderLeft: "3px solid #c4b5fd",
                    color: "var(--text-main)",
                    lineHeight: 1.45,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Útil interna
                  </div>
                  <div style={{ fontWeight: 600 }}>{profundidadeLeitura.profundidadeInternaUtilMm} mm</div>
                </div>
              </div>
            </details>
          )}

          {selectedBox && (
            <SelecionarMaterialSection
              boxId={selectedBox.id}
              onViewerMaterialChange={(boxId, materialName) => {
                viewerApi?.updateBox(boxId, { materialName });
                showToast("Material aplicado à caixa.", "info");
              }}
            />
          )}

          {selectedBox && (
            <Panel title="Pés">
              {(() => {
                const feetHeightMm = Math.max(40, selectedBox.feetHeight ?? ((selectedBox.pe_cm ?? 10) * 10));
                const feetOffsetFrontMm = Math.max(0, selectedBox.feetOffsetFront ?? 100);
                const shouldLockY = selectedBox.cabinetType === "lower";
                const feetEnabled = selectedBox.feetEnabled !== false;
                return (
                  <>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 12,
                        color: "var(--text-main)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={feetEnabled}
                        onChange={(e) => {
                          const nextEnabled = e.target.checked;
                          const partial: {
                            feetEnabled: boolean;
                            y_mm?: number;
                            manualPosition?: boolean;
                          } = { feetEnabled: nextEnabled };
                          if (nextEnabled && shouldLockY) {
                            partial.y_mm = feetHeightMm + selectedBox.dimensoes.altura / 2;
                            partial.manualPosition = true;
                          } else if (!nextEnabled && shouldLockY) {
                            partial.manualPosition = true;
                          }
                          actions.updateWorkspaceBoxTransform(selectedBox.id, partial);
                        }}
                      />
                      Ativar pés
                    </label>

                    {feetEnabled && (
                      <>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                          <div className="panel-field-row">
                            <label className="panel-label" style={{ minWidth: 110 }}>Altura (mm)</label>
                            <NumericInput
                              value={feetHeightMm}
                              min={40}
                              onChange={(clamped) => {
                                const partial: {
                                  feetHeight: number;
                                  y_mm?: number;
                                  manualPosition?: boolean;
                                } = { feetHeight: clamped };
                                if (selectedBox.feetEnabled !== false && shouldLockY) {
                                  partial.y_mm = clamped + selectedBox.dimensoes.altura / 2;
                                  partial.manualPosition = true;
                                }
                                actions.updateWorkspaceBoxTransform(selectedBox.id, partial);
                              }}
                              className="input input-sm"
                              style={{ width: 110 }}
                            />
                          </div>

                          <div className="panel-field-row">
                            <label className="panel-label" style={{ minWidth: 110 }}>Recuo frontal (mm)</label>
                            <NumericInput
                              value={feetOffsetFrontMm}
                              min={0}
                              onChange={(value) => {
                                actions.updateWorkspaceBoxTransform(selectedBox.id, {
                                  feetOffsetFront: Math.max(0, Math.round(value)),
                                });
                              }}
                              className="input input-sm"
                              style={{ width: 110 }}
                            />
                          </div>
                        </div>

                        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
                          Pés fixos em 4 unidades por caixa (controle de quantidade reservado para futura versão).
                        </p>
                      </>
                    )}
                  </>
                );
              })()}
            </Panel>
          )}

          {selectedBox && (
            <Panel title="Opções do box" description="Prateleiras, portas e gavetas no mesmo local.">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <StepperPopover
                  id="prateleiras-popover"
                  label="Prateleiras"
                  value={selectedPrateleiras}
                  onChange={(v) => actions.setPrateleiras(v)}
                />
                <StepperPopover
                  id="gavetas-popover"
                  label="Gavetas"
                  value={selectedGavetas}
                  onChange={(v) => actions.setGavetas(v)}
                />
                <UnifiedPopover trigger={<span>Tipo de porta: <strong>{selectedBox?.portaTipo === "sem_porta" ? "Sem" : selectedBox?.portaTipo === "porta_simples" ? "Simples" : selectedBox?.portaTipo === "porta_correr" ? "Correr" : "Dupla"}</strong></span>}>
                  <select
                    value={selectedBox?.portaTipo ?? "sem_porta"}
                    onChange={(e) => actions.setPortaTipo(e.target.value as "sem_porta" | "porta_simples" | "porta_dupla" | "porta_correr")}
                    className="select"
                    style={{ width: "100%" }}
                  >
                    <option value="sem_porta">Sem porta</option>
                    <option value="porta_simples">Porta simples</option>
                    <option value="porta_dupla">Porta dupla</option>
                    <option value="porta_correr">Porta de correr</option>
                  </select>
                </UnifiedPopover>
              </div>

              <BoxLayersPanel embedded />
            </Panel>
          )}

          {selectedBox && isPiBaseCabinetId(selectedBox.baseCabinetId) && (
            <Panel
              title="Furação PI (laterais)"
              description="A grelha 32 mm e os furos de dobradiça são fixos do módulo. Opcional: ocultar só corrediça na visualização e na lista."
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                  color: "var(--text-main)",
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedBox.piHideDrawerHoles === true}
                  onChange={(e) =>
                    actions.setWorkspaceBoxPiHideDrawerHoles(selectedBox.id, e.target.checked)
                  }
                />
                Ocultar furos de corrediça (laterais)
              </label>
            </Panel>
          )}

        </aside>
      </div>
    </div>
  );
}
