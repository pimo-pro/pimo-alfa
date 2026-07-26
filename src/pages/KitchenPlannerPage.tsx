/**
 * KitchenPlannerPage — Modo cliente (Fase 19).
 * Configurador visual sobre a Kitchen Library. Não altera Admin.
 */

import { useCallback, useMemo, useState, type CSSProperties, type DragEvent } from "react";
import { Link } from "react-router-dom";
import PageContainer from "../components/ui/PageContainer";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import "../components/ui/ui.css";
import {
  createPlannerState,
  downloadPlannerExportJson,
  plannerAddModule,
  plannerAutoAlign,
  plannerBuildExport,
  plannerMoveModule,
  plannerRemoveModule,
  plannerSelectModule,
  type PlannerState,
} from "../core/planner";

const SCALE = 0.12; // px per mm

const shell: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(220px, 280px) 1fr minmax(240px, 300px)",
  gap: 16,
  minHeight: "70vh",
  alignItems: "stretch",
};

const catalogBtn = (active: boolean): CSSProperties => ({
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "8px 10px",
  marginBottom: 6,
  borderRadius: 6,
  border: active ? "1px solid rgba(45, 106, 79, 0.55)" : "1px solid rgba(0,0,0,0.12)",
  background: active ? "rgba(45, 106, 79, 0.12)" : "rgba(255,255,255,0.6)",
  cursor: "grab",
  fontSize: 12,
  color: "var(--text, #1a1a1a)",
});

const sidePanel: CSSProperties = {
  padding: 14,
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.1)",
  background:
    "linear-gradient(165deg, rgba(245,242,235,0.95) 0%, rgba(232,236,230,0.9) 100%)",
  fontSize: 12,
  lineHeight: 1.45,
  overflow: "auto",
};

export default function KitchenPlannerPage() {
  const [state, setState] = useState<PlannerState>(() => createPlannerState());
  const [dragModuleId, setDragModuleId] = useState<string | null>(null);
  const [exportText, setExportText] = useState<string | null>(null);

  const gridPx = useMemo(
    () => ({
      w: state.grid.config.widthMm * SCALE,
      h: state.grid.config.depthMm * SCALE + 40,
    }),
    [state.grid.config.widthMm, state.grid.config.depthMm]
  );

  const catalog = state.library.modules.all;

  const onDropGrid = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      const id = e.dataTransfer.getData("text/module-id") || dragModuleId;
      if (!id) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const xMm = (e.clientX - rect.left) / SCALE;
      const yMm = (e.clientY - rect.top) / SCALE;
      setState((s) => plannerAddModule(s, id, { xMm, yMm }));
      setDragModuleId(null);
    },
    [dragModuleId]
  );

  const selected = state.modules.find((m) => m.instanceId === state.selectedInstanceId);

  const handleExport = () => {
    const pkg = plannerBuildExport(state);
    setExportText(pkg.text);
    downloadPlannerExportJson(pkg);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Kitchen Planner"
        subtitle="Modo cliente — montar cozinha a partir da Kitchen Library industrial"
      />
      <div style={{ marginBottom: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <Link to="/dashboard" style={{ fontSize: 13 }}>
          ? Dashboard
        </Link>
        <span style={{ fontSize: 12, color: "var(--text-muted, #666)" }}>
          {state.report.status} — {state.modules.length} módulos ×{" "}
          {state.pricing.priceFinal} {state.pricing.currency}
        </span>
        <Button type="button" onClick={() => setState(plannerAutoAlign(state))}>
          Alinhar base
        </Button>
        <Button type="button" onClick={handleExport}>
          Exportar Cozinha
        </Button>
      </div>

      <div style={shell}>
        {/* Catálogo */}
        <aside style={sidePanel}>
          <strong style={{ fontSize: 13 }}>Módulos</strong>
          <p style={{ margin: "6px 0 12px", color: "#555", fontSize: 11 }}>
            Arraste para a grelha (snap {state.grid.config.snapMm} mm)
          </p>
          <div style={{ maxHeight: "62vh", overflow: "auto" }}>
            {catalog.map((m) => (
              <button
                key={m.id}
                type="button"
                draggable
                style={catalogBtn(false)}
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/module-id", m.id);
                  setDragModuleId(m.id);
                }}
                onClick={() =>
                  setState((s) =>
                    plannerAddModule(s, m.id, {
                      xMm: s.modules.reduce((acc, x) => acc + x.widthMm, 0),
                      yMm: 0,
                    })
                  )
                }
              >
                <div style={{ fontWeight: 600 }}>{m.id}</div>
                <div style={{ opacity: 0.75, fontSize: 10 }}>
                  {m.widthMm}–{m.heightMm}–{m.depthMm} — {m.metadata.industrialCode}
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Grelha */}
        <section
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDropGrid}
          style={{
            position: "relative",
            width: gridPx.w,
            height: Math.max(gridPx.h, 280),
            maxWidth: "100%",
            margin: "0 auto",
            borderRadius: 8,
            border: "1px solid rgba(0,0,0,0.15)",
            background: `
              linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px),
              linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px),
              linear-gradient(180deg, #e8efe9 0%, #d5e0d6 40%, #c5b8a5 40%, #c5b8a5 100%)
            `,
            backgroundSize: `${state.grid.config.snapMm * SCALE}px ${state.grid.config.snapMm * SCALE}px, ${state.grid.config.snapMm * SCALE}px ${state.grid.config.snapMm * SCALE}px, 100% 100%`,
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.3)",
          }}
          aria-label="Grelha da cozinha"
        >
          {/* Zona rodapé */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: state.grid.rodapeBandMm * SCALE * 0.35,
              background: "rgba(90,70,50,0.25)",
              pointerEvents: "none",
              fontSize: 9,
              padding: 2,
              color: "#4a3728",
            }}
          >
            rodapé
          </div>

          {state.modules.map((m) => {
            const active = m.instanceId === state.selectedInstanceId;
            return (
              <div
                key={m.instanceId}
                role="button"
                tabIndex={0}
                draggable
                onClick={() => setState((s) => plannerSelectModule(s, m.instanceId))}
                onDragEnd={(e) => {
                  const parent = (e.target as HTMLElement).parentElement;
                  if (!parent) return;
                  const rect = parent.getBoundingClientRect();
                  const xMm = (e.clientX - rect.left) / SCALE;
                  const yMm = (e.clientY - rect.top) / SCALE;
                  setState((s) => plannerMoveModule(s, m.instanceId, { xMm, yMm }));
                }}
                style={{
                  position: "absolute",
                  left: m.xMm * SCALE,
                  top: m.yMm * SCALE,
                  width: m.widthMm * SCALE,
                  height: Math.max(24, m.depthMm * SCALE * 0.85),
                  borderRadius: 4,
                  border: active ? "2px solid #2d6a4f" : "1px solid rgba(0,0,0,0.35)",
                  background:
                    m.kind === "upper"
                      ? "rgba(70, 110, 140, 0.85)"
                      : m.kind === "tall"
                        ? "rgba(60, 80, 70, 0.88)"
                        : m.kind === "corner"
                          ? "rgba(120, 90, 60, 0.88)"
                          : "rgba(55, 90, 70, 0.9)",
                  color: "#f5f5f0",
                  fontSize: 10,
                  padding: 4,
                  cursor: "move",
                  boxSizing: "border-box",
                  overflow: "hidden",
                }}
                title={`${m.name} (${m.industrialCode})`}
              >
                {m.moduleId}
              </div>
            );
          })}
        </section>

        {/* Painel lateral */}
        <aside style={sidePanel}>
          <strong style={{ fontSize: 13 }}>Medidas</strong>
          <ul style={{ margin: "8px 0 14px", paddingLeft: 16 }}>
            <li>Planta: {state.measurements.totalWidthMm} — {state.measurements.totalDepthMm} mm</li>
            <li>Ocupado: {state.measurements.occupiedWidthMm} mm</li>
            <li>Gaps: {state.measurements.gaps.length}</li>
            {state.measurements.overlayInternal ? (
              <li>
                Overlay: {state.measurements.overlayInternal.status} — aberturas{" "}
                {state.measurements.overlayInternal.aberturaCount}
              </li>
            ) : null}
          </ul>

          <strong style={{ fontSize: 13 }}>Preço</strong>
          <ul style={{ margin: "8px 0 14px", paddingLeft: 16 }}>
            <li>
              Total: {state.pricing.priceFinal} {state.pricing.currency}
            </li>
            <li>
              Custo industrial: {state.pricing.costIndustrial} {state.pricing.currency}
            </li>
            <li>
              /módulo: {state.pricing.pricePerModule} — /gaveta: {state.pricing.pricePerDrawer}
            </li>
            <li>Margem: {Math.round(state.pricing.marginPercent * 100)}%</li>
          </ul>

          <strong style={{ fontSize: 13 }}>Vistas / DXF / CNC</strong>
          <ul style={{ margin: "8px 0 14px", paddingLeft: 16 }}>
            <li>Vistas: {(state.library.drawers.modeloB.viewIds || []).join(", ") || "—"}</li>
            <li>DXF library: {state.library.integrations.dxf ? "sim" : "não"}</li>
            <li>Pricing/CNC ref.: {state.library.integrations.pricing ? "sim" : "não"}</li>
          </ul>

          {selected ? (
            <>
              <strong style={{ fontSize: 13 }}>Selecionado</strong>
              <p style={{ margin: "6px 0" }}>
                {selected.moduleId}
                <br />
                {selected.industrialCode} — gavetas {selected.drawerCount}
              </p>
              <Button
                type="button"
                onClick={() => setState((s) => plannerRemoveModule(s, selected.instanceId))}
              >
                Remover
              </Button>
            </>
          ) : (
            <p style={{ color: "#666", fontSize: 11 }}>Selecione um módulo na grelha.</p>
          )}

          {exportText ? (
            <pre
              style={{
                marginTop: 14,
                maxHeight: 160,
                overflow: "auto",
                fontSize: 10,
                whiteSpace: "pre-wrap",
                background: "rgba(0,0,0,0.06)",
                padding: 8,
                borderRadius: 6,
              }}
            >
              {exportText}
            </pre>
          ) : null}
        </aside>
      </div>
    </PageContainer>
  );
}
