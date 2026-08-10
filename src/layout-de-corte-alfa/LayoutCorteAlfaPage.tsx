/**
 * Layout de Corte Alfa — estação CNC visual + TCN real (writer «mo» via export SSOT).
 * Não altera o writer «mo» nem pipelines CNC existentes.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { IndustrialThreeColumnLayout } from "@/industrial/ui/layouts/IndustrialThreeColumnLayout";
import { useProject } from "../context/useProject";
import { useNestingV4 } from "../nesting-v4/useNestingV4";
import { convertProjectToV4Pieces } from "../nesting-v4/utils/convertProjectToV4Pieces";
import type { NestingV4EngineId } from "../nesting-v4/rules/nestingV4Rules";
import type { V4Piece } from "../nesting-v4/nestingV4Types";
import { loadLcaRules } from "./rules/layoutCorteAlfaRules";
import { loadLcaTcnRules } from "./rules/layoutCorteAlfaTcnRules";
import { buildVisualSimulation } from "./simulation/buildVisualToolpaths";
import {
  downloadLcaVisualAll,
  downloadLcaVisualLabels,
  downloadLcaVisualPdf,
  downloadLcaVisualTcn,
} from "./lcaExport";
import { downloadRealTcnV4, generateTcnV4 } from "./engines/generateTcnV4";
import { parseTcnExportFiles, type ParsedTcnPanel } from "./engines/parseTcnMoPaths";
import type { LcaViewMode } from "./types";
import LcaStationSidebar from "./components/LcaStationSidebar";
import LcaTopBar, { type LcaCanvasMode, type LcaTcnDisplayMode } from "./components/LcaTopBar";
import LcaPiecePanel from "./components/LcaPiecePanel";
import LcaBottomPanel from "./components/LcaBottomPanel";
import Cnc2dCanvas from "./canvas/cnc2d";
import Cnc3dCanvas from "./canvas/cnc3d";

type LocationState = {
  pieces?: V4Piece[];
  projectId?: string;
  projectName?: string;
};

export default function LayoutCorteAlfaPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { project } = useProject();
  const locationState = (location.state ?? null) as LocationState | null;

  const initialPieces = useMemo(() => {
    if (locationState?.pieces?.length) return locationState.pieces;
    if (project.boxes?.length) return convertProjectToV4Pieces(project);
    return [] as V4Piece[];
  }, [locationState?.pieces, project]);

  const projectName = locationState?.projectName ?? project.projectName ?? "Projeto";
  const projectId = locationState?.projectId;

  const {
    state,
    loadPieces,
    runAutoLayout,
    clearAll,
    updateSettings,
    setKerfMm,
    setActiveSheet,
  } = useNestingV4();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.35);
  const [viewMode, setViewMode] = useState<LcaViewMode>("top");
  const [simulationOn, setSimulationOn] = useState(true);
  const [realSimOn, setRealSimOn] = useState(true);
  const [rules, setRules] = useState(() => loadLcaRules());
  const [tcnRules, setTcnRules] = useState(() => loadLcaTcnRules());
  const [simSpeed, setSimSpeed] = useState(tcnRules.display.simulationSpeed);
  const [tcnDisplayMode, setTcnDisplayMode] = useState<LcaTcnDisplayMode>("real");
  const [canvasMode, setCanvasMode] = useState<LcaCanvasMode>(tcnRules.display.defaultView);
  const [busy, setBusy] = useState(false);
  const [parsedPanels, setParsedPanels] = useState<ParsedTcnPanel[]>([]);
  const loadedRef = useRef(false);
  const autoLaidRef = useRef(false);

  useEffect(() => {
    setRules(loadLcaRules());
    const nextTcn = loadLcaTcnRules();
    setTcnRules(nextTcn);
    setCanvasMode(nextTcn.display.defaultView);
    setSimSpeed(nextTcn.display.simulationSpeed);
  }, []);

  useEffect(() => {
    if (loadedRef.current) return;
    if (initialPieces.length === 0) return;
    loadedRef.current = true;
    loadPieces(initialPieces);
  }, [initialPieces, loadPieces]);

  useEffect(() => {
    if (autoLaidRef.current) return;
    if (state.pieces.length === 0) return;
    autoLaidRef.current = true;
    runAutoLayout();
    setSelectedId(state.pieces[0]?.id ?? null);
  }, [runAutoLayout, state.pieces]);

  // Regenerar parse TCN real quando layout muda
  useEffect(() => {
    if (state.placements.length === 0) {
      setParsedPanels([]);
      return;
    }
    try {
      const result = generateTcnV4(state, { projectName });
      setParsedPanels(parseTcnExportFiles(result.exportResult.files));
    } catch {
      setParsedPanels([]);
    }
  }, [state, projectName]);

  const activeSheet = state.sheets[state.activeSheetIndex] ?? state.sheets[0];
  const selectedPiece = state.pieces.find((p) => p.id === selectedId) ?? null;
  const selectedPlacement =
    state.placements.find((p) => p.pieceId === selectedId && p.sheetIndex === (activeSheet?.index ?? 0)) ??
    state.placements.find((p) => p.pieceId === selectedId) ??
    null;

  const parsedPanel =
    parsedPanels.find((p) => p.panelIndex === (state.activeSheetIndex + 1)) ?? parsedPanels[0] ?? null;

  const sim = useMemo(() => {
    if (!activeSheet) {
      return {
        contours: [],
        holes: [],
        toolpaths: [],
        stats: {
          utilizationPercent: 0,
          wastePercent: 0,
          pieceCount: 0,
          holeCount: 0,
          contourCount: 0,
          cutTimeSec: 0,
          drillTimeSec: 0,
        },
      };
    }
    return buildVisualSimulation(
      activeSheet,
      state.pieces,
      state.placements,
      state.settings.kerfMm,
      rules
    );
  }, [activeSheet, state.pieces, state.placements, state.settings.kerfMm, rules]);

  const setEngine = (engine: NestingV4EngineId) => {
    updateSettings({ nestingEngine: engine });
  };

  const engineRef = useRef(state.settings.nestingEngine);
  useEffect(() => {
    if (engineRef.current === state.settings.nestingEngine) return;
    engineRef.current = state.settings.nestingEngine;
    if (state.pieces.length > 0 && autoLaidRef.current) {
      runAutoLayout();
    }
  }, [state.settings.nestingEngine, runAutoLayout, state.pieces.length]);

  const handleAutoLayout = () => {
    setBusy(true);
    try {
      runAutoLayout();
    } finally {
      setBusy(false);
    }
  };

  const backToProject = () => {
    if (projectId) navigate(`/projects/viewer?ids=${encodeURIComponent(projectId)}`);
    else navigate("/");
  };

  const effectiveSimOn = tcnDisplayMode === "real" ? realSimOn && simulationOn : simulationOn;

  const leftPanel = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div
        style={{
          padding: "10px 12px 6px",
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: "var(--text-muted,#94a3b8)",
          borderBottom: "1px solid var(--border,rgba(255,255,255,0.1))",
        }}
      >
        Layout de Corte Alfa · Peça
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <LcaPiecePanel piece={selectedPiece} placement={selectedPlacement} />
      </div>
      <div
        style={{
          padding: 10,
          borderTop: "1px solid var(--border,rgba(255,255,255,0.1))",
          fontSize: 10,
          color: "var(--text-muted,#94a3b8)",
        }}
      >
        TCN Real via writer nesting_mo (SSOT). Writer não é modificado neste módulo.
        {parsedPanel ? ` · ${parsedPanel.points.length} pts TCN` : ""}
      </div>
    </div>
  );

  const workspace = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 420,
        background: "var(--navy,#0f172a)",
        borderRadius: 10,
        overflow: "hidden",
        border: "1px solid var(--border,rgba(255,255,255,0.1))",
        position: "relative",
      }}
    >
      <LcaTopBar
        projectName={projectName}
        kerfMm={state.settings.kerfMm}
        marginMm={state.settings.marginMm}
        zoom={zoom}
        viewMode={viewMode}
        engine={state.settings.nestingEngine}
        simulationOn={simulationOn}
        simSpeed={simSpeed}
        tcnDisplayMode={tcnDisplayMode}
        canvasMode={canvasMode}
        realSimOn={realSimOn}
        busy={busy}
        onBackToProject={backToProject}
        onGoNestingV4={() =>
          navigate("/nesting_v4", { state: { pieces: state.pieces, projectId, projectName } })
        }
        onKerf={(v) => {
          setKerfMm(v);
          updateSettings({ kerfMm: v });
        }}
        onMargin={(v) => updateSettings({ marginMm: v })}
        onZoom={setZoom}
        onViewMode={setViewMode}
        onEngine={setEngine}
        onAutoLayout={handleAutoLayout}
        onClear={() => {
          clearAll();
          autoLaidRef.current = false;
          setSelectedId(null);
          setParsedPanels([]);
        }}
        onPdf={() => {
          void downloadLcaVisualPdf(state, projectName);
        }}
        onTcnVisual={() => downloadLcaVisualTcn(state, projectName)}
        onTcnRealExport={() => downloadRealTcnV4(state, projectName)}
        onLabels={() => downloadLcaVisualLabels(state, projectName)}
        onGenerateAll={() => {
          void downloadLcaVisualAll(state, projectName);
          downloadRealTcnV4(state, projectName);
        }}
        onImportProject={() => {
          loadedRef.current = false;
          autoLaidRef.current = false;
          const pieces = convertProjectToV4Pieces(project);
          loadPieces(pieces);
          loadedRef.current = true;
        }}
        onToggleSimulation={() => setSimulationOn((v) => !v)}
        onToggleRealSim={() => setRealSimOn((v) => !v)}
        onSimSpeed={setSimSpeed}
        onTcnDisplayMode={setTcnDisplayMode}
        onCanvasMode={setCanvasMode}
      />

      <div
        style={{
          display: "flex",
          gap: 6,
          padding: "6px 8px",
          borderBottom: "1px solid var(--border,rgba(255,255,255,0.08))",
          flexShrink: 0,
        }}
      >
        {state.sheets.map((sheet, i) => (
          <button
            key={sheet.index}
            type="button"
            onClick={() => setActiveSheet(i)}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: `1px solid ${i === state.activeSheetIndex ? "rgba(59,130,246,0.5)" : "rgba(255,255,255,0.1)"}`,
              background: i === state.activeSheetIndex ? "rgba(59,130,246,0.15)" : "transparent",
              color: "var(--text-main,#e2e8f0)",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            Folha {i + 1}
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-muted,#94a3b8)", alignSelf: "center" }}>
          Canvas {canvasMode.toUpperCase()} · {tcnDisplayMode === "real" ? "TCN Real" : "TCN Visual"}
        </span>
      </div>

      {activeSheet ? (
        canvasMode === "3d" ? (
          <Cnc3dCanvas
            sheet={activeSheet}
            pieces={state.pieces}
            placements={state.placements}
            parsedPanel={tcnDisplayMode === "real" ? parsedPanel : null}
            simulationOn={effectiveSimOn}
            simSpeed={simSpeed}
            tcnRules={tcnRules}
            selectedId={selectedId}
          />
        ) : (
          <Cnc2dCanvas
            sheet={activeSheet}
            pieces={state.pieces}
            placements={state.placements}
            kerfMm={state.settings.kerfMm}
            marginMm={state.settings.marginMm}
            zoom={zoom}
            viewMode={viewMode}
            selectedId={selectedId}
            onSelect={setSelectedId}
            tcnMode={tcnDisplayMode}
            parsedPanel={parsedPanel}
            simulationOn={effectiveSimOn}
            simSpeed={simSpeed}
            tcnRules={tcnRules}
            showGrain={state.settings.showGrainHatch && tcnRules.grain.showGrainOnPieces}
          />
        )
      ) : (
        <div style={{ flex: 1, display: "grid", placeItems: "center", color: "var(--text-muted,#94a3b8)" }}>
          Sem chapa
        </div>
      )}

      <LcaBottomPanel
        pieces={state.pieces}
        placements={state.placements}
        sheetIndex={activeSheet?.index ?? 0}
        holes={sim.holes}
        contours={sim.contours}
        stats={sim.stats}
        selectedId={selectedId}
        onSelect={setSelectedId}
        showWaste={rules.analysis.showWastePercent}
        showUtilization={rules.analysis.showUtilization}
      />
    </div>
  );

  return (
    <IndustrialThreeColumnLayout
      title="Layout de Corte Alfa"
      description={`CNC real (mo) + simulação — ${projectName}`}
      sidebarOpen={false}
      leftLeft={<LcaStationSidebar />}
      left={leftPanel}
      right={workspace}
    />
  );
}
