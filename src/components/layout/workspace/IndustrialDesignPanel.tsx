import { useMemo, useState, type CSSProperties } from "react";
import { getBaseCabinetById } from "@/core/baseCabinets";
import {
  HOLE_CATALOG,
  getHoleTypeById,
  findDesignPanel,
  type HoleTypeId,
  type HoleUsageKind,
} from "@/core/industrialDesigner";
import { useProject } from "@/context/useProject";
import { usePimoViewerContext } from "@/hooks/usePimoViewerContext";
import { useUiStore } from "@/stores/uiStore";
import {
  formatDesignHoleLabel,
  useIndustrialDesignWorkspace,
} from "@/hooks/useIndustrialDesignWorkspace";
import { IconCavilhaVinculada } from "@/components/icons/IconCavilhaVinculada";

const USO_COLORS: Record<HoleUsageKind, string> = {
  cavilha: "#38bdf8",
  parafuso: "#94a3b8",
  dobradica: "#f472b6",
  tecnico: "#4ade80",
  corredica: "#fb923c",
  estrutural: "#a78bfa",
};

const PANEL_TIPO_LABEL: Record<string, string> = {
  cima: "Cima",
  fundo: "Fundo",
  lateral: "Lateral",
  costa: "Costa",
  prateleira: "Prateleira",
  divisoria: "Divisória",
  frente: "Frente",
  frente_fixa: "Frente fixa",
};

/** Ferramenta rápida — cavilha vinculada 10×40 (par 10×30↔10×13). */
const CAVILHA_VINCULADA_TOOL_ID: HoleTypeId = "cavilha_10x30";

/**
 * Painel lateral mínimo — Workspace Industrial de Design.
 * Catálogo de furos, modo inserção por clique, lista de furos e validação.
 */
export default function IndustrialDesignPanel() {
  const open = useUiStore((s) => s.industrialDesignPanelOpen);
  const setOpen = useUiStore((s) => s.setIndustrialDesignPanelOpen);
  const { project } = useProject();
  const { viewerApi, viewerReady } = usePimoViewerContext();
  const workspaceBox = project.workspaceBoxes.find(
    (b) => b.id === project.selectedWorkspaceBoxId
  );

  const ws = useIndustrialDesignWorkspace({
    viewerApi,
    workspaceBox,
    enabled: open && viewerReady,
  });

  const [selectedHoleId, setSelectedHoleId] = useState<string | null>(null);
  const [catalogPickId, setCatalogPickId] = useState<HoleTypeId | null>(null);
  const [modelNome, setModelNome] = useState("Modelo Industrial Personalizado");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const selectedPanel = useMemo(() => {
    if (!ws.designBox || !ws.selectedPanelId) return null;
    return findDesignPanel(ws.designBox, ws.selectedPanelId) ?? null;
  }, [ws.designBox, ws.selectedPanelId]);

  const activeHoleType = ws.selectedHoleTypeId
    ? getHoleTypeById(ws.selectedHoleTypeId)
    : null;

  const panelErrors = ws.validationIssues.filter(
    (i) => i.panelId === ws.selectedPanelId && i.severity === "error"
  );

  if (!open) return null;

  const handleConfirmHoleType = () => {
    if (!catalogPickId) return;
    ws.setSelectedHoleTypeId(catalogPickId);
  };

  const handleToggleInsert = () => {
    if (!ws.selectedHoleTypeId) return;
    ws.setInsertOnClick(!ws.insertOnClick);
  };

  const handleCreateIndustrialModel = () => {
    setCreateError(null);
    setCreateSuccess(null);
    const result = ws.createIndustrialModel(modelNome);
    if (!result) {
      setCreateError("Não foi possível criar o modelo. Corrija erros de validação primeiro.");
      return;
    }
    const inCatalog = getBaseCabinetById(result.record.id);
    if (!inCatalog) {
      setCreateError("Modelo criado mas não encontrado no catálogo.");
      return;
    }
    setCreateSuccess(
      `Modelo registado: ${result.record.id} (${result.record.metadata.cutlistItemCount} peças, ${result.record.metadata.txmlFileCount} TXML)`
    );
  };

  return (
    <aside
      role="region"
      aria-label="Workspace Industrial de Design"
      style={panelStyle}
    >
      <header style={headerStyle}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>Design Industrial</div>
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
            {workspaceBox?.nome ?? "Sem caixa seleccionada"}
          </div>
        </div>
        <button type="button" onClick={() => setOpen(false)} style={btnStyle} title="Fechar">
          ✕
        </button>
      </header>

      {!workspaceBox ? (
        <p style={hintStyle}>Seleccione uma caixa no workspace para editar furos.</p>
      ) : (
        <>
          <section style={sectionStyle}>
            <div style={sectionTitleStyle}>Ferramenta vinculada</div>
            <button
              type="button"
              title="Cavilha 10×40 — cria Ø10×30 na espessura e Ø10×13 na peça oposta"
              onClick={() => {
                setCatalogPickId(CAVILHA_VINCULADA_TOOL_ID);
                ws.setSelectedHoleTypeId(CAVILHA_VINCULADA_TOOL_ID);
                ws.setInsertOnClick(true);
              }}
              style={{
                ...catalogItemStyle,
                borderColor:
                  ws.selectedHoleTypeId === CAVILHA_VINCULADA_TOOL_ID
                    ? "#d2b48c"
                    : "rgba(210, 180, 140, 0.35)",
                background:
                  ws.selectedHoleTypeId === CAVILHA_VINCULADA_TOOL_ID
                    ? "rgba(210, 180, 140, 0.18)"
                    : "rgba(15, 23, 42, 0.6)",
                width: "100%",
              }}
            >
              <IconCavilhaVinculada size={28} color="#d2b48c" />
              <span style={{ textAlign: "left" }}>
                <span style={{ display: "block", fontWeight: 600 }}>Cavilha vinculada 10×40</span>
                <span style={{ fontSize: 10, opacity: 0.7 }}>
                  Ø10×30 espessura → Ø10×13 face · bege
                </span>
              </span>
            </button>
          </section>

          <section style={sectionStyle}>
            <div style={sectionTitleStyle}>Catálogo de furos</div>
            <ul style={catalogListStyle}>
              {HOLE_CATALOG.map((entry) => {
                const isActive = ws.selectedHoleTypeId === entry.id;
                const isPicked = catalogPickId === entry.id;
                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => setCatalogPickId(entry.id)}
                      style={{
                        ...catalogItemStyle,
                        borderColor: isActive
                          ? USO_COLORS[entry.uso]
                          : isPicked
                            ? "rgba(148, 163, 184, 0.6)"
                            : "rgba(148, 163, 184, 0.2)",
                        background: isActive
                          ? `${USO_COLORS[entry.uso]}22`
                          : isPicked
                            ? "rgba(30, 41, 59, 0.95)"
                            : "rgba(15, 23, 42, 0.6)",
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: USO_COLORS[entry.uso],
                          flexShrink: 0,
                        }}
                        aria-hidden
                      />
                      <span style={{ textAlign: "left" }}>
                        <span style={{ display: "block", fontWeight: isActive ? 600 : 400 }}>
                          {entry.nome}
                        </span>
                        <span style={{ fontSize: 10, opacity: 0.65 }}>
                          Ø{entry.diametroMm} × {entry.profundidadeMm} mm · {entry.face}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={handleConfirmHoleType}
              disabled={!catalogPickId}
              style={{ ...btnPrimaryStyle, opacity: catalogPickId ? 1 : 0.45 }}
            >
              Selecionar tipo de furo
            </button>
          </section>

          <section style={sectionStyle}>
            <div style={sectionTitleStyle}>Modo inserção</div>
            {activeHoleType ? (
              <div
                style={{
                  ...activeHoleBadgeStyle,
                  borderColor: USO_COLORS[activeHoleType.uso],
                  background: `${USO_COLORS[activeHoleType.uso]}18`,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: USO_COLORS[activeHoleType.uso],
                  }}
                />
                <span style={{ fontSize: 12 }}>{activeHoleType.nome}</span>
              </div>
            ) : (
              <p style={hintStyle}>Seleccione um tipo no catálogo.</p>
            )}
            <button
              type="button"
              onClick={handleToggleInsert}
              disabled={!ws.selectedHoleTypeId}
              style={{
                ...btnPrimaryStyle,
                background: ws.insertOnClick ? "#0ea5e9" : "rgba(30, 41, 59, 0.95)",
                opacity: ws.selectedHoleTypeId ? 1 : 0.45,
              }}
            >
              {ws.insertOnClick ? "Inserção activa — clique no painel 3D" : "Inserir furo no clique"}
            </button>
          </section>

          <section style={sectionStyle}>
            <div style={sectionTitleStyle}>
              Painel seleccionado
              {selectedPanel ? ` — ${PANEL_TIPO_LABEL[selectedPanel.tipo] ?? selectedPanel.tipo}` : ""}
            </div>
            {!selectedPanel ? (
              <p style={hintStyle}>Clique num painel da caixa no viewer 3D.</p>
            ) : selectedPanel.drillHoles.length === 0 ? (
              <p style={hintStyle}>Nenhum furo neste painel.</p>
            ) : (
              <ul style={holeListStyle}>
                {selectedPanel.drillHoles.map((hole) => {
                  const catalog = getHoleTypeById(hole.holeTypeId);
                  const isSelected = selectedHoleId === hole.id;
                  return (
                    <li key={hole.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedHoleId(hole.id)}
                        style={{
                          ...holeItemStyle,
                          borderColor: isSelected
                            ? USO_COLORS[catalog.uso]
                            : "rgba(148, 163, 184, 0.2)",
                        }}
                      >
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: USO_COLORS[catalog.uso],
                          }}
                        />
                        <span>{formatDesignHoleLabel(hole)}</span>
                        {hole.pairedHoleId ? (
                          <span style={{ fontSize: 10, opacity: 0.6 }}>↔ par</span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <button
              type="button"
              disabled={!selectedPanel || !selectedHoleId}
              onClick={() => {
                if (!selectedPanel || !selectedHoleId) return;
                ws.removeHole(selectedPanel.id, selectedHoleId);
                setSelectedHoleId(null);
              }}
              style={{ ...btnStyle, opacity: selectedHoleId ? 1 : 0.45 }}
            >
              Remover furo
            </button>
          </section>

          {(panelErrors.length > 0 || ws.panelWarnings.length > 0) && (
            <section style={sectionStyle}>
              <div style={sectionTitleStyle}>Validação</div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {[...panelErrors, ...ws.panelWarnings].map((issue, idx) => (
                  <li
                    key={`${issue.code}-${idx}`}
                    style={{
                      fontSize: 11,
                      padding: "4px 0",
                      color: issue.severity === "error" ? "#fb7185" : "#fbbf24",
                    }}
                  >
                    {issue.message}
                  </li>
                ))}
              </ul>
              {ws.canAutoAdjust ? (
                <button
                  type="button"
                  onClick={ws.autoAdjustSelectedPanel}
                  style={btnPrimaryStyle}
                >
                  Ajustar automaticamente
                </button>
              ) : null}
            </section>
          )}

          <section style={sectionStyle}>
            <div style={sectionTitleStyle}>Criar modelo industrial</div>
            <input
              type="text"
              value={modelNome}
              onChange={(e) => setModelNome(e.target.value)}
              placeholder="Nome do modelo"
              style={inputStyle}
            />
            <button
              type="button"
              onClick={handleCreateIndustrialModel}
              disabled={!ws.designBox || panelErrors.length > 0}
              style={{
                ...btnPrimaryStyle,
                background: "rgba(34, 197, 94, 0.25)",
                borderColor: "rgba(34, 197, 94, 0.55)",
                opacity: ws.designBox && panelErrors.length === 0 ? 1 : 0.45,
              }}
            >
              Criar Modelo Industrial
            </button>
            {createError ? (
              <p style={{ ...hintStyle, color: "#fb7185" }}>{createError}</p>
            ) : null}
            {createSuccess ? (
              <p style={{ ...hintStyle, color: "#4ade80" }}>{createSuccess}</p>
            ) : null}
            {ws.lastCreatedModelId ? (
              <p style={hintStyle}>
                Disponível no catálogo via <strong>addWorkspaceBoxFromCatalog</strong> com ID{" "}
                <code style={{ fontSize: 10 }}>{ws.lastCreatedModelId}</code>
              </p>
            ) : null}
          </section>
        </>
      )}
    </aside>
  );
}

const panelStyle: CSSProperties = {
  position: "absolute",
  top: 10,
  right: 10,
  zIndex: 7,
  pointerEvents: "auto",
  width: 300,
  maxHeight: "calc(100% - 20px)",
  overflow: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 10,
  fontSize: 12,
  color: "#e2e8f0",
  background: "rgba(15, 23, 42, 0.94)",
  border: "1px solid rgba(56, 189, 248, 0.35)",
  borderRadius: 10,
  padding: "10px 12px",
  fontFamily: "var(--font-sans, system-ui, sans-serif)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 8,
};

const sectionStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  paddingTop: 4,
  borderTop: "1px solid rgba(148, 163, 184, 0.15)",
};

const sectionTitleStyle: CSSProperties = {
  fontWeight: 600,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  opacity: 0.75,
};

const hintStyle: CSSProperties = {
  margin: 0,
  fontSize: 11,
  opacity: 0.7,
  lineHeight: 1.4,
};

const catalogListStyle: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  maxHeight: 180,
  overflow: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const catalogItemStyle: CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
  padding: "6px 8px",
  borderRadius: 6,
  border: "1px solid",
  background: "transparent",
  color: "#e2e8f0",
  cursor: "pointer",
  fontSize: 11,
};

const holeListStyle: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  maxHeight: 120,
  overflow: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const holeItemStyle: CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 8px",
  borderRadius: 6,
  border: "1px solid",
  background: "rgba(15, 23, 42, 0.5)",
  color: "#e2e8f0",
  cursor: "pointer",
  fontSize: 11,
  textAlign: "left",
};

const btnStyle: CSSProperties = {
  fontSize: 11,
  padding: "4px 8px",
  borderRadius: 6,
  border: "1px solid rgba(148, 163, 184, 0.35)",
  background: "rgba(30, 41, 59, 0.9)",
  color: "#e2e8f0",
  cursor: "pointer",
};

const btnPrimaryStyle: CSSProperties = {
  ...btnStyle,
  width: "100%",
  padding: "7px 10px",
  fontWeight: 600,
  borderColor: "rgba(56, 189, 248, 0.45)",
};

const activeHoleBadgeStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 8px",
  borderRadius: 6,
  border: "1px solid",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  borderRadius: 6,
  border: "1px solid rgba(148, 163, 184, 0.35)",
  background: "rgba(15, 23, 42, 0.8)",
  color: "#e2e8f0",
  fontSize: 11,
  boxSizing: "border-box",
};
