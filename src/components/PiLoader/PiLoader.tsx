import { useEffect, useState } from "react";

const ROTATING_MESSAGES = [
  "A calcular layout de corte...",
  "A otimizar distribuição das peças...",
  "A testar rotações possíveis...",
  "A reduzir desperdício...",
  "A finalizar chapas...",
] as const;

export type PiLoaderProps = {
  isVisible: boolean;
  message?: string;
};

/**
 * Modal de carregamento com π animado (pulse + órbitas) para layout de corte PRO.
 */
export default function PiLoader({ isVisible, message }: PiLoaderProps) {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (!isVisible) return;
    const id = window.setInterval(() => {
      setMsgIndex((i) => (i + 1) % ROTATING_MESSAGES.length);
    }, 2000);
    return () => window.clearInterval(id);
  }, [isVisible]);

  if (!isVisible) return null;

  const statusText = ROTATING_MESSAGES[msgIndex] ?? ROTATING_MESSAGES[0];

  return (
    <div
      role="dialog"
      aria-busy="true"
      aria-live="polite"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.45)",
        pointerEvents: "all",
      }}
    >
      <style>{`
        @keyframes pimo-pi-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes pimo-orbit-cw {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pimo-orbit-ccw {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        @keyframes pimo-indeterminate {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .pimo-pi-loader__pi {
          transform-origin: 100px 88px;
          animation: pimo-pi-pulse 2s ease-in-out infinite;
        }
        .pimo-pi-loader__orbit-gold {
          transform-origin: 100px 88px;
          animation: pimo-orbit-cw 2.2s linear infinite;
        }
        .pimo-pi-loader__orbit-blue {
          transform-origin: 100px 88px;
          animation: pimo-orbit-ccw 3.4s linear infinite;
        }
        .pimo-pi-loader__bar-fill {
          width: 40%;
          height: 100%;
          background: linear-gradient(90deg, #7F77DD, #378ADD);
          animation: pimo-indeterminate 1.2s ease-in-out infinite;
        }
      `}</style>
      <div
        style={{
          minWidth: 320,
          maxWidth: "92vw",
          padding: "28px 32px",
          borderRadius: 12,
          background: "#1a1a1f",
          boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
          color: "#e8e8ee",
          textAlign: "center",
        }}
      >
        <svg width="200" height="140" viewBox="0 0 200 140" style={{ display: "block", margin: "0 auto 12px" }}>
          <g className="pimo-pi-loader__orbit-gold">
            <circle cx="100" cy="28" r="5" fill="#EF9F27" />
          </g>
          <g className="pimo-pi-loader__orbit-blue">
            <circle cx="100" cy="36" r="3" fill="#378ADD" />
          </g>
          <g className="pimo-pi-loader__pi">
            <text
              x="100"
              y="100"
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily='"Times New Roman", serif'
              fontSize="72"
              fill="#7F77DD"
            >
              π
            </text>
          </g>
        </svg>
        {message ? (
          <div style={{ fontSize: 14, marginBottom: 8, color: "#b8b4d9" }}>{message}</div>
        ) : null}
        <div style={{ fontSize: 15, fontWeight: 500, minHeight: 44, lineHeight: 1.35 }}>{statusText}</div>
        <div
          style={{
            marginTop: 18,
            height: 4,
            borderRadius: 2,
            background: "rgba(255,255,255,0.12)",
            overflow: "hidden",
          }}
        >
          <div className="pimo-pi-loader__bar-fill" />
        </div>
      </div>
    </div>
  );
}
