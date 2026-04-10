import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { Vector3 } from "three";
import { useProject } from "../../../context/useProject";
import type { PimoViewerApi } from "../../../context/PimoViewerContextCore";
import { usePimoViewerContext } from "../../../hooks/usePimoViewerContext";
import { computeBoxProfundidadeLeituraMm } from "../../../utils/boxProfundidadeLeituraUi";

const STORAGE_KEY = "pimo:fase6-depth-measure";
const COLOR_EXT = "#38bdf8";
const COLOR_UTIL = "#c4b5fd";
const SCREEN_OFFSET_PX = 16;

type Seg2 = { x1: number; y1: number; x2: number; y2: number };

type DrawState = {
  ext: Seg2;
  util: Seg2 | null;
  extMm: number;
  utilMm: number;
} | null;

function offsetScreenSegment(seg: Seg2, offsetPx: number): Seg2 {
  const dx = seg.x2 - seg.x1;
  const dy = seg.y2 - seg.y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * offsetPx;
  const ny = (dx / len) * offsetPx;
  return {
    x1: seg.x1 + nx,
    y1: seg.y1 + ny,
    x2: seg.x2 + nx,
    y2: seg.y2 + ny,
  };
}

function projectSegment(
  projectWorldToScreen: ((p: Vector3) => { x: number; y: number } | null) | undefined,
  start: Vector3,
  end: Vector3
): Seg2 | null {
  if (!projectWorldToScreen) return null;
  const a = projectWorldToScreen(start);
  const b = projectWorldToScreen(end);
  if (!a || !b) return null;
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
}

function drawStateEqual(a: DrawState, b: DrawState): boolean {
  if (a == null && b == null) return true;
  if (!a || !b) return false;
  const utilMatch =
    (a.util == null && b.util == null) ||
    (a.util != null &&
      b.util != null &&
      a.util.x1 === b.util.x1 &&
      a.util.y1 === b.util.y1 &&
      a.util.x2 === b.util.x2 &&
      a.util.y2 === b.util.y2);
  return (
    utilMatch &&
    a.extMm === b.extMm &&
    a.utilMm === b.utilMm &&
    a.ext.x1 === b.ext.x1 &&
    a.ext.y1 === b.ext.y1 &&
    a.ext.x2 === b.ext.x2 &&
    a.ext.y2 === b.ext.y2
  );
}

type BoxDepthMeasureOverlayProps = {
  surfaceRef: RefObject<HTMLDivElement | null>;
};

type BoxDepthMeasureOverlayInnerProps = BoxDepthMeasureOverlayProps & {
  /** Instância do viewer (API) já validada pelo wrapper — nunca null aqui. */
  viewer: PimoViewerApi;
};

/**
 * Conteúdo do overlay: hooks só correm quando o viewer existe e está pronto (evita crash no 1.º render).
 */
function BoxDepthMeasureOverlayInner({ surfaceRef, viewer }: BoxDepthMeasureOverlayInnerProps) {
  const { project } = useProject();

  const [overlayEnabled, setOverlayEnabled] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== "0";
    } catch {
      return true;
    }
  });

  const [drawState, setDrawState] = useState<DrawState>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; extMm: number; utilMm: number } | null>(null);

  const drawStateRef = useRef<DrawState>(null);
  const snapRef = useRef({
    project,
    viewer,
    overlayEnabled,
  });
  snapRef.current = { project, viewer, overlayEnabled };

  const persistOverlayEnabled = useCallback((next: boolean) => {
    setOverlayEnabled(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    const tick = () => {
      if (cancelled) return;
      rafId = requestAnimationFrame(tick);
      const { project: p, viewer: api, overlayEnabled: enabled } = snapRef.current;

      if (!api || !api.viewerReady || !enabled || !p.selectedWorkspaceBoxId) {
        const empty: DrawState = null;
        if (!drawStateEqual(drawStateRef.current, empty)) {
          drawStateRef.current = empty;
          setDrawState(empty);
        }
        return;
      }

      const box = p.workspaceBoxes.find((b) => b.id === p.selectedWorkspaceBoxId);
      if (!box) {
        const empty: DrawState = null;
        if (!drawStateEqual(drawStateRef.current, empty)) {
          drawStateRef.current = empty;
          setDrawState(empty);
        }
        return;
      }

      const dims = api.getSelectedBoxDimensions?.();
      if (!dims) {
        const empty: DrawState = null;
        if (!drawStateEqual(drawStateRef.current, empty)) {
          drawStateRef.current = empty;
          setDrawState(empty);
        }
        return;
      }

      const leitura = computeBoxProfundidadeLeituraMm(box, p.rules);
      const segExtW = api.getSelectedBoxDepthAxisWorldSegment?.(dims.depth);
      const utilM = leitura.profundidadeInternaUtilMm / 1000;
      const segUtilW = api.getSelectedBoxDepthAxisWorldSegment?.(utilM);

      const proj = api.projectWorldToScreen;
      const ext2 = segExtW && proj ? projectSegment(proj, segExtW.start, segExtW.end) : null;
      const utilBase =
        segUtilW && proj ? projectSegment(proj, segUtilW.start, segUtilW.end) : null;

      let next: DrawState = null;
      if (ext2 && utilBase) {
        next = {
          ext: ext2,
          util: offsetScreenSegment(utilBase, SCREEN_OFFSET_PX),
          extMm: leitura.profundidadeExternaMm,
          utilMm: leitura.profundidadeInternaUtilMm,
        };
      } else if (ext2) {
        next = {
          ext: ext2,
          util: null,
          extMm: leitura.profundidadeExternaMm,
          utilMm: leitura.profundidadeInternaUtilMm,
        };
      }

      if (!drawStateEqual(drawStateRef.current, next)) {
        drawStateRef.current = next;
        setDrawState(next);
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;

    const onMove = (e: PointerEvent) => {
      const { project: p, viewer: api } = snapRef.current;
      if (!api) {
        setTooltip(null);
        return;
      }
      const sid = p.selectedWorkspaceBoxId;
      if (!sid || !api.getBoxIdAtPointerPublic) {
        setTooltip(null);
        return;
      }
      const hit = api.getBoxIdAtPointerPublic({ clientX: e.clientX, clientY: e.clientY });
      if (hit !== sid) {
        setTooltip(null);
        return;
      }
      const box = p.workspaceBoxes.find((b) => b.id === sid);
      if (!box) {
        setTooltip(null);
        return;
      }
      const leitura = computeBoxProfundidadeLeituraMm(box, p.rules);
      setTooltip({
        x: e.clientX,
        y: e.clientY,
        extMm: leitura.profundidadeExternaMm,
        utilMm: leitura.profundidadeInternaUtilMm,
      });
    };

    const onLeave = () => setTooltip(null);

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [surfaceRef, project.selectedWorkspaceBoxId, viewer]);

  const labelExt = drawState
    ? { x: (drawState.ext.x1 + drawState.ext.x2) * 0.5, y: (drawState.ext.y1 + drawState.ext.y2) * 0.5 - 8 }
    : null;
  const labelUtil = drawState?.util
    ? {
        x: (drawState.util.x1 + drawState.util.x2) * 0.5,
        y: (drawState.util.y1 + drawState.util.y2) * 0.5 + 14,
      }
    : null;

  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 6,
        }}
        aria-hidden={!drawState}
      >
        {drawState && overlayEnabled && (
          <svg
            width="100%"
            height="100%"
            style={{ overflow: "visible" }}
            aria-hidden
          >
            <defs>
              <filter id="box-depth-label-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000" floodOpacity="0.65" />
              </filter>
            </defs>
            <line
              x1={drawState.ext.x1}
              y1={drawState.ext.y1}
              x2={drawState.ext.x2}
              y2={drawState.ext.y2}
              stroke={COLOR_EXT}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            {drawState.util && (
              <line
                x1={drawState.util.x1}
                y1={drawState.util.y1}
                x2={drawState.util.x2}
                y2={drawState.util.y2}
                stroke={COLOR_UTIL}
                strokeWidth={2.5}
                strokeLinecap="round"
              />
            )}
            {labelExt && (
              <text
                x={labelExt.x}
                y={labelExt.y}
                fill={COLOR_EXT}
                fontSize={11}
                fontFamily="var(--font-sans, system-ui, sans-serif)"
                textAnchor="middle"
                filter="url(#box-depth-label-shadow)"
              >
                {`P ext ${drawState.extMm} mm`}
              </text>
            )}
            {labelUtil && (
              <text
                x={labelUtil.x}
                y={labelUtil.y}
                fill={COLOR_UTIL}
                fontSize={11}
                fontFamily="var(--font-sans, system-ui, sans-serif)"
                textAnchor="middle"
                filter="url(#box-depth-label-shadow)"
              >
                {`P útil ${drawState.utilMm} mm`}
              </text>
            )}
            {drawState && !drawState.util && labelExt && (
              <text
                x={labelExt.x}
                y={labelExt.y + 22}
                fill={COLOR_UTIL}
                fontSize={11}
                fontFamily="var(--font-sans, system-ui, sans-serif)"
                textAnchor="middle"
                filter="url(#box-depth-label-shadow)"
              >
                {`P útil ${drawState.utilMm} mm`}
              </text>
            )}
          </svg>
        )}

        <button
          type="button"
          onClick={() => persistOverlayEnabled(!overlayEnabled)}
          style={{
            position: "absolute",
            bottom: 8,
            right: 8,
            pointerEvents: "auto",
            fontSize: 10,
            padding: "4px 8px",
            borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(0,0,0,0.55)",
            color: "#e2e8f0",
            cursor: "pointer",
            zIndex: 7,
          }}
          title="Mostrar ou ocultar linhas de profundidade (referência)"
        >
          {overlayEnabled ? "Ocultar medidas P" : "Mostrar medidas P"}
        </button>
      </div>

      {tooltip && (
        <div
          style={{
            position: "fixed",
            left: Math.min(tooltip.x + 14, typeof window !== "undefined" ? window.innerWidth - 240 : tooltip.x),
            top: tooltip.y + 14,
            zIndex: 200,
            pointerEvents: "none",
            padding: "8px 10px",
            borderRadius: 8,
            background: "rgba(8, 12, 26, 0.92)",
            border: "1px solid rgba(255,255,255,0.14)",
            color: "#f1f5f9",
            fontSize: 11,
            lineHeight: 1.45,
            maxWidth: 220,
            fontFamily: "var(--font-sans, system-ui, sans-serif)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
          }}
        >
          <div style={{ color: COLOR_EXT }}>Profundidade externa: {tooltip.extMm} mm</div>
          <div style={{ color: COLOR_UTIL }}>Profundidade interna útil: {tooltip.utilMm} mm</div>
        </div>
      )}
    </>
  );
}

/**
 * FASE 6 — Overlay SVG opcional: medições de profundidade externa vs útil (só leitura).
 * Não altera geometria 3D; usa computeBoxProfundidadeLeituraMm + eixo Z local no viewer.
 */
export default function BoxDepthMeasureOverlay({ surfaceRef }: BoxDepthMeasureOverlayProps) {
  const { viewerApi: viewer } = usePimoViewerContext();
  if (!viewer || !viewer.viewerReady) {
    return null;
  }
  return <BoxDepthMeasureOverlayInner surfaceRef={surfaceRef} viewer={viewer} />;
}
