import { useMemo } from "react";
import type { WorkspaceBox } from "../../../core/types";
import type { ProjectActions } from "../../../context/projectTypes";
import Panel from "../../ui/Panel";
import { NumericInput } from "../../ui/NumericInput";
import {
  getDivSepInternalDims,
  resolveDivisorDimensions,
  resolveSeparadorDimensions,
} from "../../../core/divSep/dimensions";
import type {
  DivisorPrateleiraLado,
  DivisorReferenceEdge,
  SeparadorReferenceEdge,
} from "../../../core/divSep/types";

type DivSepPanelProps = {
  box: WorkspaceBox;
  actions: Pick<
    ProjectActions,
    "addSeparador" | "addDivisor" | "removeSeparador" | "removeDivisor" | "updateSeparador" | "updateDivisor"
  >;
  /** Sem Panel wrapper (ex.: dentro de UnifiedPopover). */
  embedded?: boolean;
};

export default function DivSepPanel({ box, actions, embedded = false }: DivSepPanelProps) {
  const internal = useMemo(() => getDivSepInternalDims(box), [box]);
  const separadores = box.separadores ?? [];
  const divisores = box.divisores ?? [];
  const hasShelves = Math.max(0, Math.floor(box.prateleiras ?? 0)) > 0;

  const content = (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <button type="button" className="button button-ghost button-sm" onClick={() => actions.addSeparador()}>
          Adicionar SEPARADOR
        </button>
        <button type="button" className="button button-ghost button-sm" onClick={() => actions.addDivisor()}>
          Adicionar DIVISÓRIO
        </button>
      </div>

      {separadores.length === 0 && divisores.length === 0 ? (
        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
          Nenhum separador ou divisório. As peças herdam material e espessura da caixa.
        </p>
      ) : null}

      {separadores.map((sep, index) => {
        const dims = resolveSeparadorDimensions(box, sep);
        const maxPos = internal.alturaInterna - dims.alturaMm / 2;
        return (
          <div
            key={sep.id}
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              padding: 10,
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>SEP {index + 1}</div>
            <label style={{ display: "block", fontSize: 11, marginBottom: 6 }}>
              Referência
              <select
                className="input input-sm"
                value={sep.referenceEdge}
                onChange={(e) =>
                  actions.updateSeparador(sep.id, {
                    referenceEdge: e.target.value as SeparadorReferenceEdge,
                  })
                }
              >
                <option value="bottom">A partir do FUNDO</option>
                <option value="top">A partir do CIMA</option>
              </select>
            </label>
            <label style={{ display: "block", fontSize: 11, marginBottom: 6 }}>
              Posição (mm)
              <input
                type="range"
                min={dims.alturaMm / 2}
                max={maxPos}
                step={1}
                value={sep.positionMm}
                onChange={(e) => actions.updateSeparador(sep.id, { positionMm: Number(e.target.value) })}
                style={{ width: "100%" }}
              />
              <NumericInput
                value={sep.positionMm}
                onChange={(v) => actions.updateSeparador(sep.id, { positionMm: v })}
                min={dims.alturaMm / 2}
                max={maxPos}
              />
            </label>
            <label style={{ display: "block", fontSize: 11, marginBottom: 6 }}>
              Profundidade (mm)
              <NumericInput
                value={sep.profundidadeMm ?? dims.profundidadeMm}
                onChange={(v) => actions.updateSeparador(sep.id, { profundidadeMm: v })}
                min={50}
                max={internal.profundidadeInterna}
              />
            </label>
            <label style={{ display: "block", fontSize: 11, marginBottom: 8 }}>
              Largura (mm)
              <NumericInput
                value={sep.larguraMm ?? dims.larguraMm}
                onChange={(v) => actions.updateSeparador(sep.id, { larguraMm: v })}
                min={50}
                max={internal.larguraInterna}
              />
            </label>
            <button
              type="button"
              className="button button-ghost button-sm"
              onClick={() => actions.removeSeparador(sep.id)}
            >
              Remover
            </button>
          </div>
        );
      })}

      {divisores.map((div, index) => {
        const dims = resolveDivisorDimensions(box, div);
        const maxPos = internal.larguraInterna - dims.larguraMm / 2;
        const linked = Boolean(div.linkedSeparadorId);
        return (
          <div
            key={div.id}
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              padding: 10,
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>DIV {index + 1}</div>
            <label style={{ display: "block", fontSize: 11, marginBottom: 6 }}>
              Referência
              <select
                className="input input-sm"
                value={div.referenceEdge}
                onChange={(e) =>
                  actions.updateDivisor(div.id, {
                    referenceEdge: e.target.value as DivisorReferenceEdge,
                  })
                }
              >
                <option value="left">A partir da ESQ</option>
                <option value="right">A partir da DIR</option>
              </select>
            </label>
            <label style={{ display: "block", fontSize: 11, marginBottom: 6 }}>
              Posição (mm)
              <input
                type="range"
                min={dims.larguraMm / 2}
                max={maxPos}
                step={1}
                value={div.positionMm}
                onChange={(e) => actions.updateDivisor(div.id, { positionMm: Number(e.target.value) })}
                style={{ width: "100%" }}
              />
              <NumericInput
                value={div.positionMm}
                onChange={(v) => actions.updateDivisor(div.id, { positionMm: v })}
                min={dims.larguraMm / 2}
                max={maxPos}
              />
            </label>
            {separadores.length > 0 ? (
              <label style={{ display: "block", fontSize: 11, marginBottom: 6 }}>
                Ligar ao SEP
                <select
                  className="input input-sm"
                  value={div.linkedSeparadorId ?? ""}
                  onChange={(e) => {
                    const linkedSeparadorId = e.target.value || undefined;
                    actions.updateDivisor(div.id, {
                      linkedSeparadorId,
                      alturaMm: linkedSeparadorId ? undefined : div.alturaMm,
                    });
                  }}
                >
                  <option value="">Nenhum (altura livre)</option>
                  {separadores.map((sep, sepIndex) => (
                    <option key={sep.id} value={sep.id}>
                      SEP {sepIndex + 1}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label style={{ display: "block", fontSize: 11, marginBottom: 6 }}>
              Profundidade (mm)
              <NumericInput
                value={div.profundidadeMm ?? dims.profundidadeMm}
                onChange={(v) => actions.updateDivisor(div.id, { profundidadeMm: v })}
                min={50}
                max={internal.profundidadeInterna}
              />
            </label>
            <label style={{ display: "block", fontSize: 11, marginBottom: hasShelves ? 6 : 8 }}>
              Altura (mm)
              {linked ? (
                <span style={{ display: "block", fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>
                  Altura ajustada automaticamente ao SEP ligado: {dims.alturaMm} mm
                </span>
              ) : (
                <NumericInput
                  value={dims.alturaMm}
                  onChange={(v) => actions.updateDivisor(div.id, { alturaMm: v, linkedSeparadorId: undefined })}
                  min={50}
                  max={internal.alturaInterna}
                />
              )}
            </label>
            {hasShelves ? (
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <button
                  type="button"
                  className={`button button-sm ${(div.prateleiraLado ?? "direita") === "esquerda" ? "button-primary" : "button-ghost"}`}
                  onClick={() => actions.updateDivisor(div.id, { prateleiraLado: "esquerda" as DivisorPrateleiraLado })}
                >
                  Prateleiras Esquerda
                </button>
                <button
                  type="button"
                  className={`button button-sm ${(div.prateleiraLado ?? "direita") === "direita" ? "button-primary" : "button-ghost"}`}
                  onClick={() => actions.updateDivisor(div.id, { prateleiraLado: "direita" as DivisorPrateleiraLado })}
                >
                  Prateleiras Direita
                </button>
              </div>
            ) : null}
            <button
              type="button"
              className="button button-ghost button-sm"
              onClick={() => actions.removeDivisor(div.id)}
            >
              Remover
            </button>
          </div>
        );
      })}
    </>
  );

  if (embedded) return content;

  return <Panel title="DIVISÓRIOS E SEPARADORES">{content}</Panel>;
}
