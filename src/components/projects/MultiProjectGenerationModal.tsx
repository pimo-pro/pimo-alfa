import { useCallback, useEffect, useRef, useState } from "react";
import Button from "../ui/Button";
import type { GenerationStep } from "../../core/fabrication/multiProjectFabrication";
import type { McDimensionsViewerSource } from "../../core/industrial/mcDimensions/mcDimensionsCapture";

type LogEntry = {
  ts: string;
  message: string;
  detail?: string;
  isError?: boolean;
};

type Props = {
  projectIds: string[];
  onClose: () => void;
  onDownload: (_blob: Blob, _filename: string) => void;
  mcDimensionsViewer?: McDimensionsViewerSource;
};

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function MultiProjectGenerationModal({ projectIds, onClose, onDownload, mcDimensionsViewer }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isError, setIsError] = useState<string | null>(null);
  const [isBoosted, setIsBoosted] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRunning && startTime !== null) {
      timerRef.current = setInterval(() => {
        setElapsed(Date.now() - startTime);
      }, 500);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, startTime]);

  const appendLog = useCallback((message: string, detail?: string, err = false) => {
    const now = Date.now();
    const t = startTimeRef.current;
    const entry: LogEntry = {
      ts: formatElapsed(t != null ? now - t : 0),
      message,
      detail,
      isError: err,
    };
    setLogs((prev) => [...prev, entry]);
    setTimeout(() => {
      logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 30);
  }, []);

  const handleStart = useCallback(
    async (boost: boolean) => {
      setIsBoosted(boost);
      setIsRunning(true);
      setIsError(null);
      setIsDone(false);
      setLogs([]);
      setProgress(0);
      const t0 = Date.now();
      setStartTime(t0);

      abortRef.current = new AbortController();
      const signal = abortRef.current.signal;
      startTimeRef.current = t0;

      try {
        const { generateMultiProjectFabrication } = await import(
          "../../core/fabrication/multiProjectFabrication"
        );

        if (boost) {
          setLogs([
            {
              ts: "00:00",
              message: "Modo Boost ativado — nesting desativado para máxima velocidade.",
              isError: false,
            },
          ]);
        }

        const { zipBlob } = await generateMultiProjectFabrication(
          projectIds,
          {
            nesting: boost ? "none" : "auto",
            signal,
            mcDimensionsViewer,
            onProgress: (step: GenerationStep) => {
              setProgress(Math.round((step.step / step.total) * 100));
              setLogs((prev) => [
                ...prev,
                {
                  ts: formatElapsed(step.elapsed),
                  message: step.label,
                  detail: step.detail,
                },
              ]);
              setTimeout(() => {
                logEndRef.current?.scrollIntoView({ behavior: "smooth" });
              }, 30);
            },
          }
        );

        if (!signal.aborted) {
          setIsDone(true);
          setProgress(100);
          appendLog("Pacote industrial gerado com sucesso.", `${(zipBlob.size / 1024).toFixed(0)} KB`);
          onDownload(zipBlob, "fabricacao-multiprojeto.zip");
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          appendLog("Geração cancelada pelo utilizador.", undefined, false);
        } else {
          const msg = err instanceof Error ? err.message : String(err);
          setIsError(msg);
          appendLog(`Erro: ${msg}`, undefined, true);
        }
      } finally {
        setIsRunning(false);
      }
    },
    [projectIds, appendLog, onDownload, mcDimensionsViewer]
  );

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  useEffect(() => {
    void handleStart(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isRunning) onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isRunning, onClose]);

  const progressPct = Math.min(100, progress);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gen-modal-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          background: "var(--ui-color-bg, #0f172a)",
          border: "1px solid var(--border, #334155)",
          borderRadius: 16,
          width: "min(680px, calc(100vw - 32px))",
          display: "flex",
          flexDirection: "column",
          gap: 0,
          boxShadow: "0 16px 60px rgba(0,0,0,0.4)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px 14px",
            borderBottom: "1px solid var(--border, #334155)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          {isRunning && (
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                border: "2.5px solid var(--ui-color-primary, #3b82f6)",
                borderTopColor: "transparent",
                animation: "spin 0.7s linear infinite",
                flexShrink: 0,
              }}
            />
          )}
          {isDone && !isError && (
            <span style={{ fontSize: 18, lineHeight: 1 }}>✓</span>
          )}
          {isError && (
            <span style={{ fontSize: 18, lineHeight: 1, color: "#ef4444" }}>✗</span>
          )}
          <h2
            id="gen-modal-title"
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 700,
              color: "var(--ui-color-text, #e2e8f0)",
              flex: 1,
            }}
          >
            {isRunning
              ? "Gerando Arquivo Completo…"
              : isDone
              ? "Arquivo Gerado"
              : isError
              ? "Erro na Geração"
              : "Arquivo Completo"}
          </h2>
          <span
            style={{
              fontSize: 12,
              color: "var(--ui-color-muted, #64748b)",
              fontFamily: "monospace",
            }}
          >
            {formatElapsed(elapsed)} | {projectIds.length} projeto{projectIds.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Progress bar */}
        <div
          style={{
            height: 4,
            background: "var(--ui-color-surface, #1e293b)",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progressPct}%`,
              background: isError
                ? "#ef4444"
                : isDone
                ? "#22c55e"
                : "var(--ui-color-primary, #3b82f6)",
              transition: "width 0.3s ease",
            }}
          />
        </div>

        {/* Log terminal */}
        <div
          style={{
            padding: "14px 18px",
            fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
            fontSize: 12,
            background: "var(--ui-color-bg, #0f172a)",
            color: "var(--ui-color-text, #e2e8f0)",
            minHeight: 220,
            maxHeight: 300,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {logs.length === 0 && (
            <span style={{ color: "#64748b" }}>Iniciando…</span>
          )}
          {logs.map((entry, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ color: "#64748b", flexShrink: 0 }}>[{entry.ts}]</span>
              <span
                style={{
                  color: entry.isError ? "#ef4444" : "#e2e8f0",
                  flex: 1,
                }}
              >
                {entry.message}
                {entry.detail && (
                  <span style={{ color: "#94a3b8", marginLeft: 8 }}>
                    {entry.detail}
                  </span>
                )}
              </span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>

        {/* Footer actions */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--border, #334155)",
            display: "flex",
            gap: 10,
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--ui-color-surface, #1e293b)",
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            {isRunning && !isBoosted && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  handleCancel();
                  setTimeout(() => void handleStart(true), 200);
                }}
                title="Desativa nesting para geração mais rápida"
              >
                Boost
              </Button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {isRunning ? (
              <Button type="button" variant="danger" onClick={handleCancel}>
                Cancelar
              </Button>
            ) : (
              <>
                {(isError || (!isDone && !isRunning)) && (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => void handleStart(isBoosted)}
                  >
                    Tentar Novamente
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={onClose}>
                  {isDone ? "Fechar" : "Cancelar"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
